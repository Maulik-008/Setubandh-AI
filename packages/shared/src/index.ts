/** @setubandh/shared: Zod schemas, DTO types, enums, permission constants and error codes shared by API and UI. */
export const PACKAGE_NAME = '@setubandh/shared';
export { z } from './zod';
export {
  AppError,
  ERROR_CODES,
  errorResponseSchema,
  type ErrorCode,
  type ErrorResponse,
} from './errors';
