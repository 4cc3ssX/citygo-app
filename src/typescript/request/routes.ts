import { ISearchStops } from "../models/stops";

export interface PreferSearch extends Omit<ISearchStops, 'id'> {
  preferId: number;
}

export interface IFindRoutes {
  from: PreferSearch;
  to: PreferSearch;
}
