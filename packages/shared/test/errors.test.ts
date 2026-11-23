import { describe, expect, it } from 'vitest';
import { AppError, ERROR_CODES, errorResponseSchema } from '../src/index';

describe('AppError', () => {
  it('carries its code, HTTP status and plain-language message', () => {
    const error = new AppError('NOT_FOUND');
    expect(error.code).toBe('NOT_FOUND');
    expect(error.status).toBe(404);
    expect(error.message).toBe('We could not find what you asked for.');
  });

  it('accepts a more specific message and details', () => {
    const error = new AppError('VALIDATION_FAILED', {
      message: 'Check the highlighted fields.',
      details: { fields: { email: 'Enter a valid email address.' } },
    });
    expect(error.status).toBe(422);
    expect(error.message).toBe('Check the highlighted fields.');
    expect(error.details).toEqual({ fields: { email: 'Enter a valid email address.' } });
  });

  it('gives every code a 4xx/5xx status and a message', () => {
    for (const [code, spec] of Object.entries(ERROR_CODES)) {
      expect(spec.status, code).toBeGreaterThanOrEqual(400);
      expect(spec.status, code).toBeLessThan(600);
      expect(spec.message.length, code).toBeGreaterThan(10);
    }
  });
});

describe('errorResponseSchema (requirements §12.1)', () => {
  it('accepts the documented error shape', () => {
    const body = {
      error: {
        code: 'NOT_FOUND',
        message: 'x',
        details: {},
        requestId: '0193f0c2-0000-7000-8000-000000000000',
      },
    };
    expect(errorResponseSchema.parse(body)).toEqual(body);
  });

  it('rejects a body without requestId', () => {
    expect(() => errorResponseSchema.parse({ error: { code: 'X', message: 'x' } })).toThrow();
  });
});
