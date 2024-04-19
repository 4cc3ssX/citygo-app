import { findRoutesRequestSchema } from "@/helpers/validations/routes";
import clientPromise from "@/lib/db";
import { Routes } from "@/models/routes";
import { IResponse, ResponseError } from "@/typescript/response";
import { convertZodErrorToResponseError } from "@/utils/validations";
import { ReasonPhrases } from "http-status-codes";
import { NextRequest } from "next/server";
import { ZodIssue } from "zod";
import { DistanceUnits } from "@/helpers/validations";
import { Stops } from "@/models/stops";
import { RouteModelHelper } from "@/helpers/models/routes";
import { isEmpty } from "lodash-es";
import { IFindRoutes } from "@/typescript/request";

/**
 * @swagger
 * /api/v1/routes/find:
 *   post:
 *     summary: Find possible routes
 *     tags:
 *       - routes
 *     parameters:
 *       - name: body
 *         in: body
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             from:
 *               type: object
 *               properties:
 *                 position:
 *                   type: object
 *                   properties:
 *                     lat:
 *                       type: integer
 *                     lng:
 *                       type: integer
 *                 name:
 *                   type: string
 *                 road:
 *                   type: string
 *                 township:
 *                   type: string
 *             to:
 *               type: object
 *               properties:
 *                 position:
 *                   type: object
 *                   properties:
 *                     lat:
 *                       type: integer
 *                     lng:
 *                       type: integer
 *                 name:
 *                   type: string
 *                 road:
 *                   type: string
 *                 township:
 *                   type: string
 *             user_pos:
 *               type: object
 *               properties:
 *                 lat:
 *                   type: string
 *                 lng:
 *                   type: string
 *     responses:
 *       200:
 *         description: Successful response
 */
export async function POST(request: NextRequest) {
  const body = (await request.json()) as IFindRoutes;
  const searchParams = request.nextUrl.searchParams;
  const count = Number(searchParams.get("count") || 10);

  // validate request
  const result = findRoutesRequestSchema.safeParse({
    ...body,
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

  // data
  const from = body.from;
  const to = body.to;
  const fromPosition = body.from.position || null;
  const toPosition = body.to.position || null;
  const distanceUnit =
    (searchParams.get("distance_unit") as DistanceUnits) ||
    DistanceUnits.KILOMETERS;

  try {
    const client = await clientPromise;

    // Initialize Stops and Routes models
    const stopsModel = new Stops(client);
    const routesModel = new Routes(client);

    // Fetch all stops
    const stops = await stopsModel.searchStops({}, {});
    const fromStops = await stopsModel.searchStops(from, {});
    const toStops = await stopsModel.searchStops(to, {});

    if (
      isEmpty(fromStops) ||
      isEmpty(toStops) ||
      (from.name === to.name &&
        from.road === to.road &&
        from.township === to.township)
    ) {
      const missingStop = isEmpty(fromStops) ? from : to;
      const message =
        from === to
          ? 'Invalid "from" and "to" stops.'
          : `${
              isEmpty(fromStops) ? "From" : "To"
            } stop (${missingStop}) not found`;

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

    // sort fromStop and toStop id in asc
    fromStops.sort((a, b) => a.id - b.id);
    toStops.sort((a, b) => a.id - b.id);

    // Fetch all routes
    const allRoutes = await routesModel.searchRoutes({});

    const routeModelHelper = new RouteModelHelper(
      stops,
      allRoutes,
      fromPosition,
      toPosition,
      count,
      distanceUnit
    );

    // update from and to
    routeModelHelper.updateFromStops(fromStops);
    routeModelHelper.updateToStops(toStops);

    // find possible routes
    routeModelHelper.findTransitRoutes();

    const possibleTransitRoutes = routeModelHelper.transitRoutes;

    return Response.json(
      {
        status: "ok",
        data: possibleTransitRoutes,
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
