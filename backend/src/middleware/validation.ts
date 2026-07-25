import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export const validateRequest = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: error.errors
          }
        });
      }
      return res.status(500).json({
        error: { code: 'INTERNAL_ERROR', message: 'Validation failed' }
      });
    }
  };
};