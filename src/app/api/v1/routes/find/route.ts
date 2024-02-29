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
import { isEmpty } from "lodash-es";
import { ITransitRoute } from "@/typescript/models/routes";
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
 *                 preferId:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 road:
 *                   type: string
 *                 township:
 *                   type: string
 *             to:
 *               type: object
 *               properties:
 *                 preferId:
 *                   type: integer
 *                 name:
 *                   type: string
 *                 road:
 *                   type: string
 *                 township:
 *                   type: string
 *     responses:
 *       200:
 *         description: Successful response
 */
export async function POST(request: NextRequest) {
  const body = (await request.json()) as IFindRoutes;
  const searchParams = request.nextUrl.searchParams;
  const count = Number(searchParams.get("count") || 10);
  const format = searchParams.get("format");

  // validate request
  const result = findRoutesRequestSchema.safeParse({
    ...body,
    count,
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

  // search queries
  const from = body.from;
  const to = body.to;
  const distanceUnit =
    (searchParams.get("distance_unit") as DistanceUnits) ||
    DistanceUnits.KILOMETERS;

  try {
    const client = await clientPromise;

    // Initialize Stops and Routes models
    const stopsModel = new Stops(client);
    const routesModel = new Routes(client);

    // Fetch all stops
    const stops = await stopsModel.searchStops({});
    const fromStops = await stopsModel.searchStops(from);
    const toStops = await stopsModel.searchStops(to);

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

    // sort from and to by prefer id
    fromStops.sort((fa, fb) => {
      if (fa.id === from.preferId) return -1; // Place the stop with prefer id first
      if (fb.id === from.preferId) return 1; // Place the stop with prefer id first
      return 0; // Keep the order unchanged for other elements
    });

    toStops.sort((a, b) => {
      if (a.id === to.preferId) return -1; // Place the stop with prefer id first
      if (b.id === to.preferId) return 1; // Place the stop with prefer id first
      return 0; // Keep the order unchanged for other elements
    });

    // Fetch all routes
    const allRoutes = await routesModel.findAllRoutes({});

    let possibleRoutes: ITransitRoute[] = [];

    for await (const fromStop of fromStops) {
      if (possibleRoutes.length === count) {
        break;
      }

      for await (const toStop of toStops) {
        if (possibleRoutes.length === count) {
          break;
        }

        // start - end points
        const startPoint = point([fromStop.lng, fromStop.lat], fromStop, {
          id: fromStop.id,
        });
        const endPoint = point([toStop.lng, toStop.lat], toStop, {
          id: toStop.id,
        });

        const routeModelHelper = new RouteModelHelper(
          stops,
          allRoutes,
          fromStop.id,
          toStop.id,
          startPoint,
          endPoint,
          distanceUnit
        );
        const result = routeModelHelper.findTransitRoutes({ count });

        possibleRoutes = possibleRoutes.concat(result);
      }
    }

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
