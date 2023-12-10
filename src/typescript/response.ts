import { ReasonPhrases } from "http-status-codes";
import { PickByValueExact } from "utility-types";

export type ResponseStatus = "ok" | "error";

export interface IResponse<D = any> {
  status: ResponseStatus;
  error?: ResponseError | null;
  data: D | null;
}

export interface ResponseError {
  code: StringOmit<keyof PickByValueExact<keyof typeof ReasonPhrases, string>>;
  message: string;
}
