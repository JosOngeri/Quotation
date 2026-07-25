import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUiExpress from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Quotation Management System API',
      version: '1.0.0',
      description: 'API documentation for QMS - A multi-tenant quotation management system',
      contact: {
        name: 'QMS Support',
        email: 'support@qms.example.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server'
      },
      {
        url: 'https://api.qms.example.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token authentication'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  description: 'Error code for programmatic handling'
                },
                message: {
                  type: 'string',
                  description: 'Human-readable error message'
                },
                details: {
                  type: 'object',
                  description: 'Additional error details'
                }
              }
            }
          }
        },
        PlatformAdmin: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Platform admin ID'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Admin email address'
            },
            name: {
              type: 'string',
              description: 'Admin name'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp'
            }
          }
        },
        Workspace: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Workspace ID'
            },
            name: {
              type: 'string',
              description: 'Workspace name'
            },
            slug: {
              type: 'string',
              description: 'Workspace slug for URL routing'
            },
            reporting_currency: {
              type: 'string',
              description: 'Default currency for reports'
            },
            default_locale: {
              type: 'string',
              description: 'Default locale'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp'
            }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'User ID'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email'
            },
            name: {
              type: 'string',
              description: 'User name'
            },
            roles: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'User roles'
            },
            is_active: {
              type: 'boolean',
              description: 'User active status'
            },
            last_login_at: {
              type: 'string',
              format: 'date-time',
              description: 'Last login timestamp'
            }
          }
        },
        Client: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Client ID'
            },
            name: {
              type: 'string',
              description: 'Client name'
            },
            contact_name: {
              type: 'string',
              description: 'Contact person name'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Contact email'
            },
            phone: {
              type: 'string',
              description: 'Contact phone'
            },
            address: {
              type: 'string',
              description: 'Client address'
            },
            tax_id: {
              type: 'string',
              description: 'Tax identification number'
            },
            is_active: {
              type: 'boolean',
              description: 'Client active status'
            }
          }
        },
        Supplier: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Supplier ID'
            },
            name: {
              type: 'string',
              description: 'Supplier name'
            },
            contact_name: {
              type: 'string',
              description: 'Contact person name'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Contact email'
            },
            phone: {
              type: 'string',
              description: 'Contact phone'
            },
            address: {
              type: 'string',
              description: 'Supplier address'
            },
            payment_terms: {
              type: 'string',
              description: 'Payment terms'
            },
            lead_time_days: {
              type: 'integer',
              description: 'Lead time in days'
            },
            tax_id: {
              type: 'string',
              description: 'Tax identification number'
            },
            is_active: {
              type: 'boolean',
              description: 'Supplier active status'
            }
          }
        },
        Product: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Product ID'
            },
            sku: {
              type: 'string',
              description: 'Stock keeping unit'
            },
            name: {
              type: 'string',
              description: 'Product name'
            },
            description: {
              type: 'string',
              description: 'Product description'
            },
            unit: {
              type: 'string',
              description: 'Unit of measurement'
            },
            category: {
              type: 'string',
              description: 'Product category'
            },
            specification: {
              type: 'string',
              description: 'Product specifications'
            },
            is_active: {
              type: 'boolean',
              description: 'Product active status'
            }
          }
        },
        Quote: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Quote ID'
            },
            client_id: {
              type: 'string',
              format: 'uuid',
              description: 'Client ID'
            },
            title: {
              type: 'string',
              description: 'Quote title'
            },
            currency: {
              type: 'string',
              description: 'Quote currency'
            },
            status: {
              type: 'string',
              enum: ['draft', 'published', 'accepted', 'rejected', 'superseded'],
              description: 'Quote status'
            },
            valid_until: {
              type: 'string',
              format: 'date',
              description: 'Quote validity date'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Creation timestamp'
            }
          }
        },
        Project: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Project ID'
            },
            client_id: {
              type: 'string',
              format: 'uuid',
              description: 'Client ID'
            },
            quote_id: {
              type: 'string',
              format: 'uuid',
              description: 'Quote ID'
            },
            title: {
              type: 'string',
              description: 'Project title'
            },
            status: {
              type: 'string',
              enum: ['planning', 'active', 'on_hold', 'completed', 'cancelled'],
              description: 'Project status'
            },
            start_date: {
              type: 'string',
              format: 'date',
              description: 'Project start date'
            },
            target_end_date: {
              type: 'string',
              format: 'date',
              description: 'Target end date'
            },
            actual_end_date: {
              type: 'string',
              format: 'date',
              description: 'Actual end date'
            },
            quoted_total_minor: {
              type: 'integer',
              description: 'Quoted total in minor units'
            },
            actual_total_minor: {
              type: 'integer',
              description: 'Actual total in minor units'
            }
          }
        },
        File: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'File ID'
            },
            workspace_id: {
              type: 'string',
              format: 'uuid',
              description: 'Workspace ID'
            },
            user_id: {
              type: 'string',
              format: 'uuid',
              description: 'User ID who uploaded the file'
            },
            filename: {
              type: 'string',
              description: 'Generated filename'
            },
            original_filename: {
              type: 'string',
              description: 'Original filename'
            },
            file_path: {
              type: 'string',
              description: 'File storage path'
            },
            file_size: {
              type: 'integer',
              description: 'File size in bytes'
            },
            file_type: {
              type: 'string',
              description: 'MIME type'
            },
            upload_type: {
              type: 'string',
              enum: ['quotes', 'projects', 'suppliers', 'general'],
              description: 'Upload type category'
            },
            entity_type: {
              type: 'string',
              description: 'Associated entity type'
            },
            entity_id: {
              type: 'string',
              format: 'uuid',
              description: 'Associated entity ID'
            },
            description: {
              type: 'string',
              description: 'File description'
            },
            is_active: {
              type: 'boolean',
              description: 'File active status'
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              description: 'Upload timestamp'
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
              description: 'Last update timestamp'
            }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.ts'],
  security: ['bearerAuth'],
  tags: [
    {
      name: 'Authentication',
      description: 'User authentication and authorization endpoints'
    },
    {
      name: 'Workspaces',
      description: 'Workspace management endpoints'
    },
    {
      name: 'Users',
      description: 'User management endpoints'
    },
    {
      name: 'Quotes',
      description: 'Quote management endpoints'
    },
    {
      name: 'Clients',
      description: 'Client management endpoints'
    },
    {
      name: 'Suppliers',
      description: 'Supplier management endpoints'
    },
    {
      name: 'Products',
      description: 'Product management endpoints'
    },
    {
      name: 'Projects',
      description: 'Project management endpoints'
    },
    {
      name: 'Files',
      description: 'File upload and management endpoints'
    }
  ]
};

const specs = swaggerJsdoc(options);

export { specs, swaggerUiExpress };