import { ICoordinates, ILocalizedString } from ".";
import { ReplaceValueByType } from "..";

export interface ISuggestion extends ICoordinates {
  /**
   * The ID of the suggestion
   */
  id: number;
  /**
   * The name of the suggested place
   */
  name: ILocalizedString;
  /**
   * The region of the suggested place
   */
  region: string;

  /**
   * The country of the suggested place
   */
  country: string;
}

export type ISuggestionSearchType = Pick<
  Partial<ReplaceValueByType<ISuggestion, ILocalizedString, string>>,
  "name" | "region" | "country"
>;
