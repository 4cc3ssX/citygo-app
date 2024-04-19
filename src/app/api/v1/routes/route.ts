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

export const revalidate = 60 * 60; // 1 hour

/**
 * @swagger
 * /api/v1/routes:
 *   get:
 *     summary: Get all bus line routes
 *     tags:
 *       - routes
 *     responses:
 *       200:
 *         description: Successful response
 */
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

  // response format
  const format =
    (searchParams.get("format") as ResponseFormat) || ResponseFormat.JSON;

  try {
    const client = await clientPromise;

    const routeModel = new Routes(client);
    const routes = await routeModel.searchRoutes({});

    routes.sort(({ route_id: routeIdA }, { route_id: routeIdB }) => {
      const a = routeIdA.split("-")[0];
      const b = routeIdB.split("-")[0];

      // Extract number and optional character using regular expression
      const regex = /^(\d+)([A-Z])?$/;
      const matchA = a.match(regex);
      const matchB = b.match(regex);

      // If both elements don't have numbers, sort alphabetically
      if (!matchA && !matchB) {
        return routeIdA.localeCompare(routeIdB);
      }

      // Extract and compare numbers, then compare characters (if any)
      const numA = matchA ? Number(matchA[1]) : 0;
      const numB = matchB ? Number(matchB[1]) : 0;
      const charA = matchA?.[2] || "";
      const charB = matchB?.[2] || "";

      if (numA !== numB) {
        return numA - numB;
      } else {
        return charA.localeCompare(charB);
      }
    });

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
