import { ICoordinates, ILocalizedString } from ".";
import { ReplaceValueByType } from "..";
import { IStop } from "./stops";

export interface IRoute {
  /**
   * The ID of the bus agency.
   */
  agency_id: string;
  /**
   * The gate name of the bus.
   */
  name: ILocalizedString;
  /**
   * The color of the bus line.
   */
  color: string;
  /**
   * The ID of the bus line.
   */
  route_id: string;
  /**
   * The IDs of the bus stop.
   */
  stops: number[];
  /**
   * The bus route LineString coordinates of the bus line.
   */
  coordinates: ICoordinates[];
}

export interface IFindRoute extends Omit<IRoute, "stops"> {
  stops: IStop[];
  distance: number;
}

export type IRouteSearchType = Pick<
  Partial<ReplaceValueByType<IRoute, ILocalizedString, string>>,
  "name" | "route_id" | "stops"
>;
