import { ICoordinates, ILocalizedString } from ".";
import { ReplaceValueByType } from "..";

export interface IStop extends ICoordinates {
  id: string;
  name: ILocalizedString;
  road: ILocalizedString;
  township: ILocalizedString;
}

export type IStopSearchType = Partial<
  ReplaceValueByType<IStop, ILocalizedString, string>
>;
