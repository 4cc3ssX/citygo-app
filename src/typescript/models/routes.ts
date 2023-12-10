import { ICoordinates, ILocalizedString } from ".";
import { ReplaceValueByType } from "..";

export interface IRoute {
  agency_id: string;
  name: ILocalizedString;
  color: string;
  route_id: string;
  stop: number[];
  coordinates: ICoordinates[];
}

export type IRouteSearchType = Pick<
  Partial<ReplaceValueByType<IRoute, ILocalizedString, string>>,
  "name" | "route_id"
>;
