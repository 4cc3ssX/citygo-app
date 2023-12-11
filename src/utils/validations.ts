import { ResponseError, ResponseErrors } from "@/typescript/response";
import { typeToFlattenedError } from "zod";

export function convertZodErrorToResponseError<T, U extends ResponseError>(
  errors: typeToFlattenedError<T, U>
): ResponseErrors[] {
  const responseErrors: ResponseErrors[] = [];

  for (const [key, error] of Object.entries(errors.fieldErrors) as [
    string,
    ResponseError[]
  ][]) {
    if (error.length > 0) {
      responseErrors.push({
        [key]: {
          code: error.map((err) => err.code).join(", "),
          message: error.map((err) => err.message).join(", "),
        },
      });
    }
  }

  return responseErrors;
}
