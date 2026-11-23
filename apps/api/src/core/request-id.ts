import type { IncomingMessage } from 'node:http';
import { uuidv7 } from 'uuidv7';

/** Accept an incoming id only if it is short and safe to log (letters, digits, - _ .). */
const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]{8,128}$/;

/** Fastify `genReqId`: reuse a well-formed `X-Request-Id` (from Caddy or a client), else UUIDv7. */
export function requestIdFor(request: IncomingMessage): string {
  const incoming = request.headers['x-request-id'];
  const value = Array.isArray(incoming) ? incoming[0] : incoming;
  return value && SAFE_REQUEST_ID.test(value) ? value : uuidv7();
}
