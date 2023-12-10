import clientPromise from "@/lib/db";
import { IResponse, ResponseFormat } from "@/typescript/response";
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

// export const revalidate = 3600;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // search queries
  const id = searchParams.get("id") || "";

  // response format
  const format =
    (searchParams.get("format") as ResponseFormat) || ResponseFormat.JSON;

  // check supported format
  if (!Object.values(ResponseFormat).includes(format)) {
    return Response.json(
      {
        status: "error",
        error: {
          code: "BAD_REQUEST",
          message: "Invalid format",
        },
        data: null,
      } as IResponse,
      { status: 400 }
    );
  }

  try {
    const client = await clientPromise;

    const model = new Routes(client);
    const routes = await model.getAllRoutes({ route_id: id });

    let routesFeatures: Feature<LineString>[] = [];

    if (format === ResponseFormat.GEOJSON) {
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
    }
    const routeCollection = featureCollection(routesFeatures);

    return Response.json(
      {
        status: "ok",
        data: format === ResponseFormat.JSON ? routes : routeCollection,
      } as IResponse<IRoute[] | FeatureCollection<LineString>>,
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
