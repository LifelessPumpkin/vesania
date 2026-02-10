import { NextResponse } from 'next/server'

export async function GET() {
  const spec = {
    openapi: '3.0.1',
    info: {
      title: 'Grimoire API',
      version: '0.1.0',
      description: 'OpenAPI spec for Grimoire API endpoints',
    },
    servers: [
      { url: '/' },
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT', 
        },
      },
    },
    paths: {
      '/api/auth/sync': {
        post: {
          summary: 'Sync Firebase User',
          description: 'Syncs a logged-in Firebase user to the PostgreSQL database.',
          security: [{ BearerAuth: [] }], // Requires Auth
          responses: {
            '200': {
              description: 'User synced successfully',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      user: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          email: { type: 'string' },
                          username: { type: 'string' },
                        }
                      }
                    },
                  },
                },
              },
            },
            '401': { description: 'Unauthorized / Invalid Token' },
          },
        },
      },
      '/api/v1': {
        get: {
          summary: 'Health check',
          description: 'Pings the database and returns service status.',
          responses: {
            '200': {
              description: 'Successful health check',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string', example: 'ok' },
                      message: { type: 'string' },
                      timestamp: { type: 'string', format: 'date-time' },
                    },
                  },
                },
              },
            },
            '500': { description: 'Database connection failed' },
          },
        },
        post: {
          summary: 'Perform an API action',
          description: 'Currently supports `pingDb` action to test DB connectivity.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    action: { type: 'string', enum: ['pingDb'] },
                  },
                  required: ['action'],
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Action succeeded',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      message: { type: 'string' },
                    },
                  },
                },
              },
            },
            '400': { description: 'Unknown action' },
            '500': { description: 'Internal server error' },
          },
        },
      },
      '/api/list-user': {
        get: {
          summary: 'List Users',
          description: 'Retrieves a list of users from the database.',
          responses: {
            '200': {
              description: 'A list of users',
              content: {
                'application/json': {
                  schema: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string', format: 'uuid' },
                        email: { type: 'string', format: 'email' },
                        createdAt: { type: 'string', format: 'date-time' },
                      },
                    },
                  },
                },
              },
            },
            '500': { description: 'Failed to fetch users' },
          },
        },
      },
      '/api/scan': {
        post: {
          summary: 'Scan a Card',
          description: 'Look up a card by its NFC public code.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'string', example: 'nfc-tag-id-123' },
                  },
                  required: ['code'],
                },
              },
            },
          },
          responses: {
            '200': {
              description: 'Card details found',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      status: { type: 'string', enum: ['UNCLAIMED', 'CLAIMED'] },
                      definition: {
                        type: 'object',
                        properties: {
                          name: { type: 'string' },
                          description: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
            '404': { description: 'Card not found' },
            '500': { description: 'Internal server error' },
          },
        },
      },
    },
  }

  return NextResponse.json(spec)
}
