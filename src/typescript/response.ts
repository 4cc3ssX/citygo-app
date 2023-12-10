import { ReasonPhrases } from "http-status-codes";
import { StringOmit } from ".";

export type ResponseStatus = "ok" | "error";

export interface IResponse<D = any> {
  status: ResponseStatus;
  error?: ResponseError | null;
  data: D | null;
}

export interface ResponseError {
  code: StringOmit<keyof typeof ReasonPhrases>;
  message: string;
}

export enum ResponseFormat {
  JSON = "json",
  GEOJSON = "geojson",
}
