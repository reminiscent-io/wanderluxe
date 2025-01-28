import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

export function validateRequest(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      return res.status(400).json({ message: "Invalid request data", error });
    }
  };
}

export function validateContentType(type: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.is(type)) {
      return res.status(415).json({ 
        message: `Content-Type must be ${type}` 
      });
    }
    next();
  };
}
