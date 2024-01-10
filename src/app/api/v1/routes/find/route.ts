import { findRoutesRequestSchema } from "@/helpers/validations/routes";
import clientPromise from "@/lib/db";
import { Routes } from "@/models/routes";
import { IResponse, ResponseError } from "@/typescript/response";
import { convertZodErrorToResponseError } from "@/utils/validations";
import { point } from "@turf/helpers";
import { ReasonPhrases } from "http-status-codes";
import { NextRequest } from "next/server";
import { ZodIssue } from "zod";
import { DistanceUnits } from "@/helpers/validations/stops";
import { Stops } from "@/models/stops";
import { RouteModelHelper } from "@/helpers/models/routes";

/**
 * @swagger
 * /api/v1/routes/find:
 *   get:
 *     summary: Find possible routes
 *     tags:
 *       - routes
 *     parameters:
 *       - name: from
 *         in: query
 *         type: number
 *       - name: to
 *         in: query
 *         type: number
 *       - name: distance_unit
 *         in: query
 *         type: string
 *         enum: [meters, millimeters, centimeters, kilometers, acres, miles, nauticalmiles, inches, yards, feet, radians, degrees, hectares]
 *       - name: count
 *         in: query
 *         type: integer
 *     responses:
 *       200:
 *         description: Successful response
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const count = Number(searchParams.get("count") || 10);

  // validate request
  const result = findRoutesRequestSchema.safeParse({
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

  // search queries
  const from = Number(searchParams.get("from"));
  const to = Number(searchParams.get("to"));
  const distanceUnit =
    (searchParams.get("distance_unit") as DistanceUnits) ||
    DistanceUnits.KILOMETERS;

  try {
    const client = await clientPromise;

    // Initialize Stops and Routes models
    const stopsModel = new Stops(client);
    const routesModel = new Routes(client);

    // Fetch all stops
    const stops = await stopsModel.getAllStops({});

    // find from, to stops
    const fromStop = stops.find((stop) => stop.id === from);
    const toStop = stops.find((stop) => stop.id === to);

    if (!fromStop || !toStop || from === to) {
      const missingStop = !fromStop ? from : to;
      const message =
        from === to
          ? 'Invalid "from" and "to" stops.'
          : `${!fromStop ? "From" : "To"} stop (${missingStop}) not found`;

      return Response.json(
        {
          status: "error",
          error: {
            code: "NOT_FOUND",
            message,
          },
          data: null,
        } as IResponse,
        {
          status: 404,
        }
      );
    }

    // Fetch all routes
    const allRoutes = await routesModel.findAllRoutes({});

    // start - end points
    const startPoint = point([fromStop.lng, fromStop.lat], fromStop, {
      id: from,
    });
    const endPoint = point([toStop.lng, toStop.lat], toStop, { id: to });

    const routeModelHelper = new RouteModelHelper(
      stops,
      allRoutes,
      from,
      to,
      startPoint,
      endPoint,
      distanceUnit
    );

    const possibleRoutes = routeModelHelper.findTransitRoutes({ count });

    return Response.json(
      {
        status: "ok",
        data: possibleRoutes,
      } as IResponse,
      {
        status: 200,
      }
    );
  } catch (err) {
    console.error("Error finding routes:", err);
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
