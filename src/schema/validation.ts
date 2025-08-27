import { Request, Response, NextFunction } from "express"
import { ZodError, ZodType } from "zod"
import { APIErrorResponse, handleError } from "./response";

export const validate = (schema: {
  body?: ZodType,
  query?: ZodType,
  params?: ZodType,
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schema.body) {
        Object.assign(req.body, schema.body.parse(req.body))
        // (req as any).body = schema.body.parse(req.body);
      }
      if (schema.query) {
        Object.assign(req.query, schema.query.parse(req.query))
        // (req as any).query = schema.query.parse(req.query)
      }
      if (schema.params) {
        // (req as any).params = schema.params.parse(req.params);
        Object.assign(req.params, schema.params.parse(req.params))
      }

      next();
    } catch(e) {
      if (e instanceof ZodError) {
        const apiErr = new APIErrorResponse({
          code: 20002,
          message: `Validation error: ${e.message}`,
          details: e.issues.map((iss) => ({
            field: iss.path.join('.'),
            error: iss.message,
          }))
        })
        return res.status(422).json(apiErr);
      }

      handleError(res, e)
    }
  }
}