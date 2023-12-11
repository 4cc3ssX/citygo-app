import clientPromise from "@/lib/db";
import { Stops } from "@/models/stops";
import {
  IResponse,
  ResponseError,
  ResponseFormat,
} from "@/typescript/response";
import { ReasonPhrases } from "http-status-codes";
import { Feature, Point, point } from "@turf/helpers";
import distance from "@turf/distance";
import { NextRequest } from "next/server";
import { IStop } from "@/typescript/models/stops";
import { nearestRequestSchema } from "@/helpers/validations/stops";
import { ZodIssue } from "zod";
import { convertZodErrorToResponseError } from "@/utils/validations";

// export const revalidate = 3600;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // search queries
  const lng = searchParams.get("lng") || "";
  const lat = searchParams.get("lat") || "";
  const count = Number(searchParams.get("count") || "10");

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

    const model = new Stops(client);
    let stops = await model.getAllStops({});

    // current location
    const targetPoint = point([Number(lng), Number(lat)]);

    const stopFeatures: Feature<Point>[] = [];

    // convert to geojson data
    stops.forEach(({ lat, lng, id, ...prop }) => {
      const stopPoint = point(
        [lng, lat],
        {
          ...prop,
          distance: 0, // default distance
        },
        { id }
      );
      // calculate distance
      stopPoint.properties.distance = distance(targetPoint, stopPoint);

      stopFeatures.push(stopPoint);
    });

    stopFeatures.sort(
      (a, b) => a.properties?.distance - b.properties?.distance
    );

    const nearestStops = stopFeatures.splice(0, count);

    if (nearestStops.length) {
      stops = stops
        .filter((stop) => nearestStops.some((ns) => ns.id === stop.id))
        .slice(0, count);
    }

    return Response.json(
      {
        status: "ok",
        data: format === ResponseFormat.JSON ? stops : nearestStops,
      } as IResponse<IStop[] | Feature<Point>[]>,
      {
        status: 200,
      }
    );
  } catch (err) {
    console.log(err);
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
