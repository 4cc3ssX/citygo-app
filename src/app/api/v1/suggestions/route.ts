import { suggestionRequestSchema } from "@/helpers/validations/suggestions";
import clientPromise from "@/lib/db";
import logger from "@/lib/logger";
import { Suggestions } from "@/models/Suggestions";
import { ISuggestion } from "@/typescript/models/suggestions";
import { IResponse, ResponseError } from "@/typescript/response";
import { convertZodErrorToResponseError } from "@/utils/validations";
import { ReasonPhrases } from "http-status-codes";
import { NextRequest } from "next/server";
import { ZodIssue } from "zod";

export const revalidate = 60 * 60; // 1 hour

/**
 * @swagger
 * /api/v1/suggestions:
 *   get:
 *     summary: Get all suggested places
 *     tags:
 *       - suggestions
 *     parameters:
 *       - name: region
 *         in: query
 *         type: string
 *         required: false
 *         description: Region name
 *     responses:
 *       200:
 *         description: Successful response
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // validate request
  const result = suggestionRequestSchema.safeParse({
    ...Object.fromEntries(searchParams),
  });

  if (!result.success) {
    const flattenErrors = result.error.flatten<ResponseError>(
      (issue: ZodIssue) => ({
        message: issue.message,
        code: issue.code,
      })
    );

    const errors = convertZodErrorToResponseError(flattenErrors);

    return Response.json({
      status: "error",
      errors,
      data: null,
    });
  }

  // search queries
  const region = searchParams.get("region") as string;

  try {
    const client = await clientPromise;

    const suggestionModel = new Suggestions(client);
    const suggestions = await suggestionModel.searchSuggestions({
      region,
    });

    return Response.json(
      {
        status: "ok",
        data: suggestions,
        metadata: null,
      } as IResponse<ISuggestion[]>,
      {
        status: 200,
      }
    );
  } catch (err) {
    logger.error(err);
    return Response.json(
      {
        status: "error",
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: ReasonPhrases.INTERNAL_SERVER_ERROR,
        },
        data: null,
      } as IResponse,
      { status: 500 }
    );
  }
}
