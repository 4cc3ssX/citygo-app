import { ICoordinates, ILocalizedString } from ".";
import { ReplaceValueByType } from "..";

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
   * The LineString coordinates of the bus stop.
   */
  coordinates: ICoordinates[];
}

export type IRouteSearchType = Pick<
  Partial<ReplaceValueByType<IRoute, ILocalizedString, string>>,
  "name" | "route_id"
>;
