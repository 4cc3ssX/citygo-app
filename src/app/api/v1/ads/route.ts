import { adsRequestSchema } from "@/helpers/validations/ads";
import clientPromise from "@/lib/db";
import logger from "@/lib/logger";
import { Ads } from "@/models/ads";
import { AdType, IAds } from "@/typescript/models/ads";
import { IResponse, ResponseError } from "@/typescript/response";
import { convertZodErrorToResponseError } from "@/utils/validations";

import { ReasonPhrases } from "http-status-codes";
import { NextRequest } from "next/server";
import { ZodIssue } from "zod";

export const revalidate = 60 * 60 * 24; // 1 day

/**
 * @swagger
 * /api/v1/ads:
 *   get:
 *     summary: Get all ads
 *     tags:
 *       - ads
 *     responses:
 *       200:
 *         description: Successful response
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  // validate request
  const result = adsRequestSchema.safeParse({
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
  const type = searchParams.get("type") as AdType;

  try {
    const client = await clientPromise;

    const adsModel = new Ads(client);
    const data = await adsModel.searchAds({ type });

    return Response.json(
      {
        status: "ok",
        data,
      } as IResponse<IAds[]>,
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
