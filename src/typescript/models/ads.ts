import { ILocalizedString } from ".";
import { ReplaceValueByType } from "..";

export enum AdType {
  BANNER = "banner",
  APP_OPEN = "app-open",
}

export interface IAds {
  type: AdType;
  image: string;
  url: string;
  expireAt: number | null;
}

export type IAdSearchType = Pick<
  Partial<ReplaceValueByType<IAds, ILocalizedString, string>>,
  "type"
>;
