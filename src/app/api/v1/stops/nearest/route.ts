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
import distance from "@turf/distance";
import { NextRequest } from "next/server";
import { IStop } from "@/typescript/models/stops";
import {
  DistanceUnits,
  nearestRequestSchema,
} from "@/helpers/validations/stops";
import { ZodIssue } from "zod";
import { convertZodErrorToResponseError } from "@/utils/validations";
import logger from "@/lib/logger";

// export const revalidate = 3600;

/**
 * @swagger
 * /api/v1/stops/nearest:
 *   get:
 *     summary: Get nearest stop
 *     tags:
 *       - stops
 *     parameters:
 *       - name: lat
 *         in: query
 *         type: number
 *       - name: lng
 *         in: query
 *         type: number
 *       - name: distance_unit
 *         in: query
 *         type: string
 *         enum: [meters, millimeters, centimeters, kilometers, acres, miles, nauticalmiles, inches, yards, feet, radians, degrees, hectares]
 *       - name: format
 *         in: query
 *         type: string
 *         enum: [json, geojson]
 *       - name: count
 *         in: query
 *         type: integer
 *     responses:
 *       200:
 *         description: Successful response
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // search queries
  const lng = searchParams.get("lng") as string;
  const lat = searchParams.get("lat") as string;
  const count = Number(searchParams.get("count") || 10);
  const distanceUnit =
    (searchParams.get("distance_unit") as DistanceUnits) ||
    DistanceUnits.KILOMETERS;

  // response format
  const format =
    (searchParams.get("format") as ResponseFormat) || ResponseFormat.JSON;

  // validate request
  const result = nearestRequestSchema.safeParse({
    ...Object.fromEntries(searchParams),
    count,
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
    const stops = await stopModel.getAllStops({});

    // current location
    const targetPoint = point([Number(lng), Number(lat)]);

    // convert to geojson data
    const stopFeatures: Feature<Point>[] = stops
      .map(({ lat, lng, id, ...prop }) => {
        const stopPoint = point(
          [lng, lat],
          {
            ...prop,
            distance: 0, // default distance
          },
          { id }
        );
        // calculate distance
        stopPoint.properties.distance = distance(targetPoint, stopPoint, {
          units: distanceUnit,
        });

        return stopPoint;
      })
      .sort((a, b) => a.properties?.distance - b.properties?.distance)
      .splice(0, count);

    const nearestStopsCollection = featureCollection(stopFeatures);

    const nearestStops = stops
      .filter((stop) => stopFeatures.some((ns) => ns.id === stop.id))
      .map((stop) => ({
        ...stop,
        distance: stopFeatures.find((ns) => ns.id === stop.id)?.properties
          ?.distance,
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, count);

    return Response.json(
      {
        status: "ok",
        data:
          format === ResponseFormat.JSON
            ? nearestStops
            : nearestStopsCollection,
      } as IResponse<IStop[] | FeatureCollection<Point>[]>,
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
