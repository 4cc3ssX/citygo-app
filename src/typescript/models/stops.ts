import { ICoordinates, ILocalizedString } from ".";
import { ReplaceValueByType } from "..";

export interface IStop extends ICoordinates {
  id: number;
  name: ILocalizedString;
  road: ILocalizedString;
  township: ILocalizedString;
}

export type IStopSearchType = Pick<
  Partial<ReplaceValueByType<IStop, ILocalizedString, string>>,
  "name" | "road" | "township"
>;
