import { IRoute } from "@/typescript/models/routes";
import { Coord, Feature, LineString, lineString } from "@turf/helpers";
import lineSlice from "@turf/line-slice";

export const createLineString = <T extends IRoute>(
  coord: T["coordinates"],
  id: string,
  props?: Partial<Omit<T, "coordinates">>
) => {
  return lineString(
    coord.map(({ lng, lat }) => [lng, lat]),
    props,
    { id }
  );
};

export const createLineSlice = <T extends IRoute>(
  startPt: Coord,
  stopPt: Coord,
  line: Feature<LineString, Partial<Omit<T, "coordinates">>> | LineString,
  id?: string
) => {
  return { id, ...lineSlice(startPt, stopPt, line) };
};
