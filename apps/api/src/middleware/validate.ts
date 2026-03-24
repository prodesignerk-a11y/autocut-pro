import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ApiResponse } from '@autocut/shared';

type ValidateTarget = 'body' | 'query' | 'params';

export function validate(schema: ZodSchema, target: ValidateTarget = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const data = schema.parse(req[target]);
      req[target] = data;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const errors = err.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        }));

        const response: ApiResponse = {
          success: false,
          error: 'Validation failed',
          message: errors.map((e) => `${e.field}: ${e.message}`).join(', '),
        };

        res.status(400).json(response);
        return;
      }

      const response: ApiResponse = {
        success: false,
        error: 'Invalid request data',
      };

      res.status(400).json(response);
    }
  };
}
