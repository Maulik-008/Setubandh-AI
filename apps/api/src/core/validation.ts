import { Body, Param, Query, type PipeTransform } from '@nestjs/common';
import { AppError } from '@setubandh/shared';
import type { z } from '@setubandh/shared';

/** Validate with a Zod schema from packages/shared; failures become 422 VALIDATION_FAILED. */
export class ZodValidationPipe<T extends z.ZodType> implements PipeTransform<unknown, z.infer<T>> {
  constructor(private readonly schema: T) {}

  transform(value: unknown): z.infer<T> {
    const result = this.schema.safeParse(value);
    if (result.success) return result.data;
    const fields: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.length > 0 ? issue.path.join('.') : '_';
      fields[key] ??= issue.message;
    }
    throw new AppError('VALIDATION_FAILED', { details: { fields } });
  }
}

/** `@ZodBody(schema)`: validated, typed request body (rule 2: every input through Zod). */
export const ZodBody = (schema: z.ZodType) => Body(new ZodValidationPipe(schema));
/** `@ZodQuery(schema)`: validated, typed query string. */
export const ZodQuery = (schema: z.ZodType) => Query(new ZodValidationPipe(schema));
/** `@ZodParams(schema)`: validated, typed route params. */
export const ZodParams = (schema: z.ZodType) => Param(new ZodValidationPipe(schema));
