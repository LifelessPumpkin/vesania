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
    paths: {
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
    },
  }

  return NextResponse.json(spec)
}
