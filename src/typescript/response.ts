import { ReasonPhrases } from "http-status-codes";
import { StringOmit } from ".";

export type ResponseStatus = "ok" | "error";

export interface IResponse<D = any, M = {}> {
  status: ResponseStatus;
  error?: ResponseError | null;
  errors?: ResponseErrors | null;
  data: D | null;
  metadata: M | null;
}

export type ResponseErrors = Record<string, ResponseError>;

export interface ResponseError {
  code: StringOmit<keyof typeof ReasonPhrases>;
  message: string;
}

export enum ResponseFormat {
  JSON = "json",
  GEOJSON = "geojson",
}

export interface Pagination {
  page: number;
  size: number;
  total: number;
}
