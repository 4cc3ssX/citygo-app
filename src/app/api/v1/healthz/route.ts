import { IResponse } from "@/typescript/response";

/**
 * @swagger
 * /api/v1/healthz:
 *   get:
 *     summary: Health Check
 *     tags:
 *       - healthz
 *     responses:
 *       200:
 *         description: OK
 */
export async function GET() {
  return Response.json(
    {
      status: "ok",
    } as IResponse,
    {
      status: 200,
    }
  );
}
