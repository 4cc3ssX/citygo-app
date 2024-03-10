import { ICoordinates } from "../models";
import { ISearchStops } from "../models/stops";

export interface PreferSearch extends Omit<ISearchStops, "id"> {
  preferId: number;
}

export interface IFindRoutes {
  user_position?: ICoordinates | undefined;
  from: PreferSearch;
  to: PreferSearch;
}
