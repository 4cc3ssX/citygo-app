import { ICoordinates, ILocalizedString } from ".";
import { ReplaceValueByType } from "..";

export interface IStop extends ICoordinates {
  /**
   * The ID of the stop
   */
  id: number;
  /**
   * The name of the stop
   */
  name: ILocalizedString;
  /**
   * The road name of the stop
   */
  road: ILocalizedString;
  /**
   * The township name of the stop
   */
  township: ILocalizedString;

  /**
   * The name of the region.
   */
  region: string;

  /**
   * The name of the country.
   */
  country: string;
}

export type ISearchStops = Pick<
  Partial<ReplaceValueByType<IStop, ILocalizedString, string>>,
  "id" | "name" | "road" | "township" | "region" | "country"
>;
