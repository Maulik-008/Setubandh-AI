import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

// One Zod instance for API, worker and UI, extended once with `.openapi()` metadata so the same
// schemas validate input and generate the API docs. Always import `z` from '@setubandh/shared'.
extendZodWithOpenApi(z);

export { z };
