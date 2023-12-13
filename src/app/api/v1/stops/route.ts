import clientPromise from "@/lib/db";
import { Stops } from "@/models/stops";
import {
  IResponse,
  ResponseError,
  ResponseFormat,
} from "@/typescript/response";
import { ReasonPhrases } from "http-status-codes";
import {
  Feature,
  FeatureCollection,
  Point,
  featureCollection,
  point,
} from "@turf/helpers";
import { NextRequest } from "next/server";
import { IStop } from "@/typescript/models/stops";
import { stopsRequestSchema } from "@/helpers/validations/stops";
import { convertZodErrorToResponseError } from "@/utils/validations";
import { ZodIssue } from "zod";
import logger from "@/lib/logger";

// export const revalidate = 3600;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // validate request
  const result = stopsRequestSchema.safeParse(Object.fromEntries(searchParams));

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

    const model = new Stops(client);
    const stops = await model.getAllStops({ name, road, township });

    if (format === ResponseFormat.GEOJSON) {
      const stopFeatures: Feature<Point>[] = [];

      // convert to geojson data
      stops.forEach(({ lat, lng, id, ...prop }) => {
        stopFeatures.push(point([lng, lat], prop, { id }));
      });

      // geojson feature collection
      const stopCollection = featureCollection(stopFeatures);

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
        data: stops,
      } as IResponse<IStop[]>,
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
