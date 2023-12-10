import clientPromise from "@/lib/db";
import { Stops } from "@/models/stops";
import { IResponse, ResponseFormat } from "@/typescript/response";
import { ReasonPhrases } from "http-status-codes";
import {
  Feature,
  FeatureCollection,
  Point,
  featureCollection,
  point,
} from "@turf/helpers";
import { NextRequest } from "next/server";
import { IStop } from "@/typescript/models/stops";

// export const revalidate = 3600;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // search queries
  const name = searchParams.get("name") || "";
  const road = searchParams.get("road") || "";
  const township = searchParams.get("township") || "";

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

    const model = new Stops(client);
    const stops = await model.getAllStops({ name, road, township });

    let stopFeatures: Feature<Point>[] = [];

    if (format === ResponseFormat.GEOJSON) {
      // convert to geojson data
      stops.forEach(({ lat, lng, id, ...prop }) => {
        stopFeatures.push(point([lat, lng], prop, { id }));
      });
    }
    const stopCollection = featureCollection(stopFeatures);

    return Response.json(
      {
        status: "ok",
        data: format === ResponseFormat.JSON ? stops : stopCollection,
      } as IResponse<IStop[] | FeatureCollection<Point>>,
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
