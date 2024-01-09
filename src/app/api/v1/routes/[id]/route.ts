import { createLineString } from "@/helpers/models";
import { routeIdSchema } from "@/helpers/validations/routes";
import clientPromise from "@/lib/db";
import logger from "@/lib/logger";
import { Routes } from "@/models/routes";
import { IRoute } from "@/typescript/models/routes";
import {
  IResponse,
  ResponseError,
  ResponseFormat,
} from "@/typescript/response";
import { convertZodErrorToResponseError } from "@/utils/validations";
import {
  FeatureCollection,
  LineString,
  featureCollection,
} from "@turf/helpers";
import { ReasonPhrases } from "http-status-codes";
import { omit } from "lodash-es";
import { NextRequest } from "next/server";
import { ZodIssue } from "zod";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;

  const searchParams = request.nextUrl.searchParams;

  // response format
  const format =
    (searchParams.get("format") as ResponseFormat) || ResponseFormat.JSON;

  // validate request
  const result = routeIdSchema.safeParse({
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

    const routeModel = new Routes(client);
    const route = await routeModel.getRoute(id);

    if (!route) {
      return Response.json(
        {
          status: "error",
          error: {
            code: "NOT_FOUND",
            message: "Route not found",
          },
          data: null,
        } as IResponse,
        {
          status: 404,
        }
      );
    }
    if (format === ResponseFormat.GEOJSON) {
      const routeLineString = createLineString(
        route.coordinates,

        route.route_id,
        omit(route, "coordinates")
      );

      // geojson feature collection
      const routeCollection = featureCollection([routeLineString]);

      return Response.json(
        {
          status: "ok",
          data: routeCollection,
        } as IResponse<FeatureCollection<LineString>>,
        {
          status: 200,
        }
      );
    }

    return Response.json(
      {
        status: "ok",
        data: route,
      } as IResponse<IRoute>,
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
