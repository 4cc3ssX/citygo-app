import { stopIdSchema } from "@/helpers/validations/stops";
import clientPromise from "@/lib/db";
import logger from "@/lib/logger";
import { Stops } from "@/models/stops";
import { IStop } from "@/typescript/models/stops";
import {
  IResponse,
  ResponseError,
  ResponseFormat,
} from "@/typescript/response";
import { convertZodErrorToResponseError } from "@/utils/validations";
import {
  FeatureCollection,
  Point,
  featureCollection,
  point,
} from "@turf/helpers";
import { ReasonPhrases } from "http-status-codes";
import { NextRequest } from "next/server";
import { ZodIssue } from "zod";

/**
 * @swagger
 * /api/v1/stops/{id}:
 *   get:
 *     summary: Get a stop by ID
 *     tags:
 *       - stops
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         type: string
 *       - name: format
 *         in: query
 *         type: string
 *         enum: [json, geojson]
 *     responses:
 *       200:
 *         description: Successful response
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = Number(params.id);

  const searchParams = request.nextUrl.searchParams;

  // response format
  const format =
    (searchParams.get("format") as ResponseFormat) || ResponseFormat.JSON;

  // validate request
  const result = stopIdSchema.safeParse({
    id,
    format,
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

  try {
    const client = await clientPromise;

    const stopModel = new Stops(client);
    const stop = await stopModel.getStop(id);

    if (!stop) {
      return Response.json(
        {
          status: "error",
          error: {
            code: "NOT_FOUND",
            message: "Stop not found",
          },
          data: null,
        } as IResponse,
        {
          status: 404,
        }
      );
    }
    if (format === ResponseFormat.GEOJSON) {
      const { lng, lat, ...prop } = stop;
      const stopPoint = point([lng, lat], prop, { id });

      // geojson feature collection
      const stopCollection = featureCollection([stopPoint]);

      return Response.json(
        {
          status: "ok",
          data: stopCollection,
        } as IResponse<FeatureCollection<Point>>,
        {
          status: 200,
        }
      );
    }

    return Response.json(
      {
        status: "ok",
        data: stop,
      } as IResponse<IStop>,
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
