import clientPromise from "@/lib/db";
import {
  IResponse,
  ResponseError,
  ResponseFormat,
} from "@/typescript/response";
import { ReasonPhrases } from "http-status-codes";
import {
  Feature,
  FeatureCollection,
  LineString,
  featureCollection,
  lineString,
} from "@turf/helpers";
import { NextRequest } from "next/server";
import { Routes } from "@/models/routes";
import { IRoute } from "@/typescript/models/routes";
import { routesRequestSchema } from "@/helpers/validations/routes";
import { ZodIssue } from "zod";
import { convertZodErrorToResponseError } from "@/utils/validations";
import logger from "@/lib/logger";

// export const revalidate = 3600;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // search queries
  const id = searchParams.get("id") || "";

  // response format
  const format =
    (searchParams.get("format") as ResponseFormat) || ResponseFormat.JSON;

  // validate request
  const result = routesRequestSchema.safeParse({
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

    const model = new Routes(client);
    const routes = await model.getAllRoutes({ route_id: id });

    if (format === ResponseFormat.GEOJSON) {
      const routesFeatures: Feature<LineString>[] = [];
      // convert to geojson data
      routes.forEach(({ coordinates, route_id, ...prop }) => {
        routesFeatures.push(
          lineString(
            coordinates.map(({ lng, lat }) => [lng, lat]),
            prop,
            { id: route_id }
          )
        );
      });
      // geojson feature collection
      const routeCollection = featureCollection(routesFeatures);

      return Response.json(
        {
          status: "ok",
          data: routeCollection,
        } as IResponse<IRoute[] | FeatureCollection<LineString>>,
        {
          status: 200,
        }
      );
    }

    return Response.json(
      {
        status: "ok",
        data: routes,
      } as IResponse<IRoute[] | FeatureCollection<LineString>>,
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
