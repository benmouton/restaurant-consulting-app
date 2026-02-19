import { z } from 'zod';
import { domains, frameworkContent, userBookmarks, trainingTemplates, financialDocuments, financialMessages } from './schema';

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
  domains: {
    list: {
      method: 'GET' as const,
      path: '/api/domains',
      responses: {
        200: z.array(z.custom<typeof domains.$inferSelect>()),
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/domains/:slug',
      responses: {
        200: z.object({
          domain: z.custom<typeof domains.$inferSelect>(),
          content: z.array(z.custom<typeof frameworkContent.$inferSelect>()),
        }),
        404: errorSchemas.notFound,
      },
    },
  },
  bookmarks: {
    list: {
      method: 'GET' as const,
      path: '/api/bookmarks',
      responses: {
        200: z.array(z.custom<typeof userBookmarks.$inferSelect>()),
      },
    },
    add: {
      method: 'POST' as const,
      path: '/api/bookmarks',
      input: z.object({ contentId: z.number() }),
      responses: {
        201: z.custom<typeof userBookmarks.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    remove: {
      method: 'DELETE' as const,
      path: '/api/bookmarks/:contentId',
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  consultant: {
    ask: {
      method: 'POST' as const,
      path: '/api/consultant/ask',
      input: z.object({ 
        question: z.string(),
        context: z.string().optional(),
        image: z.string().optional(),
        conversationId: z.number().optional(),
        history: z.array(z.object({ role: z.string(), content: z.string() })).optional(),
      }),
      streaming: true,
      responses: {
        200: z.object({ content: z.string().optional(), done: z.boolean().optional() }),
        400: errorSchemas.validation,
      },
    },
  },
  templates: {
    list: {
      method: 'GET' as const,
      path: '/api/templates',
      responses: {
        200: z.array(z.custom<typeof trainingTemplates.$inferSelect>()),
      },
    },
    byCategory: {
      method: 'GET' as const,
      path: '/api/templates/:category',
      responses: {
        200: z.array(z.custom<typeof trainingTemplates.$inferSelect>()),
        404: errorSchemas.notFound,
      },
    },
  },
  financial: {
    documents: {
      list: {
        method: 'GET' as const,
        path: '/api/financial/documents',
        responses: {
          200: z.array(z.custom<typeof financialDocuments.$inferSelect>()),
        },
      },
      get: {
        method: 'GET' as const,
        path: '/api/financial/documents/:id',
        responses: {
          200: z.object({
            document: z.custom<typeof financialDocuments.$inferSelect>(),
            extract: z.any().nullable(),
          }),
          404: errorSchemas.notFound,
        },
      },
      upload: {
        method: 'POST' as const,
        path: '/api/financial/upload',
        responses: {
          201: z.custom<typeof financialDocuments.$inferSelect>(),
          400: errorSchemas.validation,
        },
      },
      delete: {
        method: 'DELETE' as const,
        path: '/api/financial/documents/:id',
        responses: {
          204: z.void(),
          404: errorSchemas.notFound,
        },
      },
    },
    messages: {
      list: {
        method: 'GET' as const,
        path: '/api/financial/messages',
        responses: {
          200: z.array(z.custom<typeof financialMessages.$inferSelect>()),
        },
      },
    },
    ask: {
      method: 'POST' as const,
      path: '/api/financial/ask',
      input: z.object({
        question: z.string(),
        documentId: z.number().optional(),
      }),
      streaming: true,
      responses: {
        200: z.object({ content: z.string().optional(), done: z.boolean().optional() }),
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
