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
      '/api/cards': {
        get: {
          summary: 'Search Card Definitions',
          description: 'Search for cards by name, type, or rarity.',
          parameters: [
            {
              name: 'q',
              in: 'query',
              schema: { type: 'string' },
              description: 'Search term for card name',
            },
            {
              name: 'type',
              in: 'query',
              schema: { type: 'string', enum: ['CHARACTER', 'ITEM', 'SPELL', 'TOOL'] },
              description: 'Filter by card type',
            },
            {
              name: 'rarity',
              in: 'query',
              schema: { type: 'string', enum: ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'] },
              description: 'Filter by rarity',
            },
          ],
          responses: {
            '200': {
              description: 'List of card definitions',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      cards: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            name: { type: 'string' },
                            type: { type: 'string' },
                            rarity: { type: 'string' },
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        post: {
          summary: 'Create Card Definition',
          description: 'Add a new card definition to the catalog (Admin).',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['name', 'type', 'rarity', 'description'],
                  properties: {
                    name: { type: 'string' },
                    type: { type: 'string', enum: ['CHARACTER', 'ITEM', 'SPELL', 'TOOL'] },
                    rarity: { type: 'string', enum: ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'] },
                    description: { type: 'string' },
                    effectJson: { type: 'object' }
                  }
                }
              }
            }
          },
          responses: {
            '201': { description: 'Card definition created' },
            '401': { description: 'Unauthorized' }
          }
        }
      },
      '/api/cards/instances': {
        get: {
          summary: 'List All Physical Cards',
          description: 'Retrieve a list of every physical card instance that has been minted.',
          security: [{ BearerAuth: [] }],
          responses: {
            '200': {
              description: 'List of physical card instances',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      count: { type: 'integer' },
                      cards: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            publicCode: { type: 'string' },
                            claimedAt: { type: 'string', format: 'date-time' },
                            ownerId: { type: 'string' },
                            definition: {
                              type: 'object',
                              properties: {
                                id: { type: 'string' },
                                name: { type: 'string' },
                                rarity: { type: 'string' },
                                type: { type: 'string' }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            '401': { description: 'Unauthorized' }
          }
        },
        post: {
          summary: 'Mint New Physical Card',
          description: 'Create a new physical card instance linked to a card definition. This is used when assigning an NFC tag to a card type.',
          security: [{ BearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['publicCode', 'definitionId'],
                  properties: {
                    publicCode: { type: 'string', description: 'The unique code stored on the NFC tag' },
                    definitionId: { type: 'string', description: 'The ID of the Card Definition (blueprint) this card is an instance of' }
                  }
                }
              }
            }
          },
          responses: {
            '201': { description: 'Card minted successfully' },
            '400': { description: 'Missing definitionId or publicCode' },
            '404': { description: 'Card Definition not found' },
            '409': { description: 'Card with this code already exists' }
          }
        }
      },
      '/api/my-cards': {
        get: {
          summary: 'Get My Inventory',
          description: 'Retrieve the list of cards owned by the logged-in user.',
          security: [{ BearerAuth: [] }],
          responses: {
            '200': {
              description: 'User inventory',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      count: { type: 'integer' },
                      cards: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            id: { type: 'string' },
                            publicCode: { type: 'string' },
                            claimedAt: { type: 'string', format: 'date-time' },
                            definition: {
                              type: 'object',
                              properties: {
                                name: { type: 'string' },
                                rarity: { type: 'string' }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            },
            '401': { description: 'Unauthorized' }
          }
        }
      },
      '/api/auth/sync': {
        post: {
          summary: 'Sync Firebase User',
          description: 'Syncs a logged-in Firebase user to the PostgreSQL database.',
          security: [{ BearerAuth: [] }],
          responses: {
            '200': {
              description: 'User synced successfully',
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
            '200': { description: 'Successful health check' },
            '500': { description: 'Database connection failed' },
          },
        },
        post: {
          summary: 'Perform an API action',
          description: 'Currently supports `pingDb` action.',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    action: { type: 'string', enum: ['pingDb'] },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Action succeeded' },
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
            '200': { description: 'Card details found' },
            '404': { description: 'Card not found' },
          },
        },
      },
    },
  }

  return NextResponse.json(spec)
}