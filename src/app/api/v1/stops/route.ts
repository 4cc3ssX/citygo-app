import clientPromise from "@/lib/db";
import { Stops } from "@/models/stops";
import { IResponse } from "@/typescript/response";
import { ReasonPhrases } from "http-status-codes";
import * as turf from "@turf/helpers";
import { NextRequest } from "next/server";

// export const revalidate = 3600;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // searchParams to object
  const stopSearch = Object.fromEntries(searchParams);

  try {
    const client = await clientPromise;

    const model = new Stops(client);
    const stops = await model.getAllStops(stopSearch);

    // convert to geojson data
    const stopFeatures = stops.map(({ lat, lng, id, ...prop }) =>
      turf.point([lat, lng], prop, { id })
    );
    const stopCollection = turf.featureCollection(stopFeatures);

    return Response.json({ status: "ok", data: stopCollection } as IResponse, {
      status: 200,
    });
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
