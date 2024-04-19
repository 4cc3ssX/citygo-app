import { rechargeRequestSchema } from "@/helpers/validations/recharge";
import clientPromise from "@/lib/db";
import logger from "@/lib/logger";
import { Recharge } from "@/models/recharge";
import { IRecharge } from "@/typescript/models/recharge";
import {
  IResponse,
  Pagination,
  ResponseError,
  ResponseFormat,
} from "@/typescript/response";
import { convertZodErrorToResponseError } from "@/utils/validations";
import {
  Feature,
  featureCollection,
  FeatureCollection,
  point,
  Point,
} from "@turf/helpers";
import { ReasonPhrases } from "http-status-codes";
import { NextRequest } from "next/server";
import { ZodIssue } from "zod";

export const revalidate = 60 * 60; // 1 hour

/**
 * @swagger
 * /api/v1/recharge:
 *   get:
 *     summary: Get all recharge stations
 *     tags:
 *       - recharge
 *     responses:
 *       200:
 *         description: Successful response
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // pagination
  const page = Number(searchParams.get("page")) || undefined;
  const size = Number(searchParams.get("size") || 10);

  // validate request
  const result = rechargeRequestSchema.safeParse({
    ...Object.fromEntries(searchParams),
    page,
    size,
  });

  if (!result.success) {
    const flattenErrors = result.error.flatten<ResponseError>(
      (issue: ZodIssue) => ({
        message: issue.message,
        code: issue.code,
      })
    );

    const errors = convertZodErrorToResponseError(flattenErrors);

    return Response.json({
      status: "error",
      errors,
      data: null,
    });
  }

  // search queries
  const name = searchParams.get("name") as string;
  const road = searchParams.get("road") as string;
  const township = searchParams.get("township") as string;

  // response format
  const format =
    (searchParams.get("format") as ResponseFormat) || ResponseFormat.JSON;

  try {
    const client = await clientPromise;

    const rechargeModel = new Recharge(client);
    const rechargeStations = await rechargeModel.searchRechargeStations(
      { name, road, township },
      { page, size }
    );

    // pagination metadata
    const metadata: Pagination = {
      page: page || 0,
      size,
      total: 0,
      nextPage: null,
      prevPage: null,
    };

    if (page && size) {
      // to avoid unnecessary db call
      const stationCount = await rechargeModel.countStations({
        name,
        road,
        township,
      });

      metadata.total = Math.ceil(stationCount / size);

      // calculate next and prev page
      if (page < metadata.total) {
        metadata.nextPage = page + 1;
      }

      if (page > 1) {
        metadata.prevPage = page - 1;
      }
    }

    if (format === ResponseFormat.GEOJSON) {
      const stationFeatures: Feature<Point>[] = [];

      // convert to geojson data
      rechargeStations.forEach(({ lat, lng, id, ...prop }) => {
        stationFeatures.push(point([lng, lat], prop, { id }));
      });

      // geojson feature collection
      const stationCollection = featureCollection(stationFeatures);

      return Response.json(
        {
          status: "ok",
          data: stationCollection,
          metadata: page && size ? metadata : undefined,
        } as IResponse<FeatureCollection<Point>, Pagination>,
        {
          status: 200,
        }
      );
    }

    return Response.json(
      {
        status: "ok",
        data: rechargeStations,
        metadata: page && size ? metadata : undefined,
      } as IResponse<IRecharge[], Pagination>,
      {
        status: 200,
      }
    );
  } catch (err) {
    logger.error(err);
    return Response.json(
      {
        status: "error",
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: ReasonPhrases.INTERNAL_SERVER_ERROR,
        },
        data: null,
      } as IResponse,
      { status: 500 }
    );
  }
}
