import { z } from 'zod';
import { manualSections, userProgress } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

export const api = {
  manual: {
    list: {
      method: 'GET' as const,
      path: '/api/manual',
      responses: {
        200: z.array(z.custom<typeof manualSections.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/manual/:id',
      responses: {
        200: z.custom<typeof manualSections.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  progress: {
    list: {
      method: 'GET' as const,
      path: '/api/progress',
      responses: {
        200: z.array(z.custom<typeof userProgress.$inferSelect>()),
      },
    },
    mark: {
      method: 'POST' as const,
      path: '/api/progress',
      input: z.object({ sectionId: z.number() }),
      responses: {
        201: z.custom<typeof userProgress.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
