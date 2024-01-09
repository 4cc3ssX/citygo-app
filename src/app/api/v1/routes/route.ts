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
} from "@turf/helpers";
import { NextRequest } from "next/server";
import { Routes } from "@/models/routes";
import { IRoute } from "@/typescript/models/routes";
import { routesRequestSchema } from "@/helpers/validations/routes";
import { ZodIssue } from "zod";
import { convertZodErrorToResponseError } from "@/utils/validations";
import logger from "@/lib/logger";
import { createLineString } from "@/helpers/models";

// export const revalidate = 3600;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // validate request
  const result = routesRequestSchema.safeParse(
    Object.fromEntries(searchParams)
  );

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
  const id = searchParams.get("id") || "";

  // response format
  const format =
    (searchParams.get("format") as ResponseFormat) || ResponseFormat.JSON;

  try {
    const client = await clientPromise;

    const routeModel = new Routes(client);
    const routes = await routeModel.findAllRoutes({ route_id: id });

    if (format === ResponseFormat.GEOJSON) {
      const routesFeatures: Feature<LineString>[] = routes.map(
        ({ coordinates, route_id, ...prop }) => {
          const routeLineString = createLineString(coordinates, route_id, prop);
          return routeLineString;
        }
      );
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
