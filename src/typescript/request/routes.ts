import { ICoordinates } from "../models";
import { ISearchStops } from "../models/stops";

export interface PreferSearch extends Omit<ISearchStops, "id"> {
  position?: ICoordinates | undefined;
}

export interface IFindRoutes {
  from: PreferSearch;
  to: PreferSearch;
}
