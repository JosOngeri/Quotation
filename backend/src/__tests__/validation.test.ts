import { platformLoginSchema, tenantLoginSchema, clientLoginSchema } from '../validations/auth';
import { createWorkspaceSchema } from '../validations/workspace';
import { createClientSchema } from '../validations/clients';

describe('Validation Schemas', () => {
  describe('platformLoginSchema', () => {
    it('should validate valid platform login data', () => {
      const validData = {
        email: 'admin@qms.platform',
        password: 'Admin@123'
      };
      const result = platformLoginSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
    
    it('should reject invalid email', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'Admin@123'
      };
      const result = platformLoginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
    
    it('should reject short password', () => {
      const invalidData = {
        email: 'admin@qms.platform',
        password: 'short'
      };
      const result = platformLoginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
  
  describe('tenantLoginSchema', () => {
    it('should validate valid tenant login data', () => {
      const validData = {
        email: 'admin@joscards.example',
        password: 'Tenant@123',
        workspaceSlug: 'joscards'
      };
      const result = tenantLoginSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
    
    it('should reject missing workspace slug', () => {
      const invalidData = {
        email: 'admin@joscards.example',
        password: 'Tenant@123'
      };
      const result = tenantLoginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
  
  describe('createWorkspaceSchema', () => {
    it('should validate valid workspace data', () => {
      const validData = {
        name: 'Test Workspace',
        slug: 'test-workspace',
        reportingCurrency: 'KES',
        defaultLocale: 'en-KE'
      };
      const result = createWorkspaceSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
    
    it('should reject invalid slug format', () => {
      const invalidData = {
        name: 'Test Workspace',
        slug: 'Invalid Slug!',
        reportingCurrency: 'KES'
      };
      const result = createWorkspaceSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
    
    it('should reject invalid currency code', () => {
      const invalidData = {
        name: 'Test Workspace',
        slug: 'test-workspace',
        reportingCurrency: 'INVALID'
      };
      const result = createWorkspaceSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
  
  describe('createClientSchema', () => {
    it('should validate valid client data', () => {
      const validData = {
        name: 'Test Client',
        email: 'client@example.com',
        phone: '+1234567890'
      };
      const result = createClientSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
    
    it('should accept data without optional fields', () => {
      const validData = {
        name: 'Test Client'
      };
      const result = createClientSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
    
    it('should reject invalid email format', () => {
      const invalidData = {
        name: 'Test Client',
        email: 'invalid-email'
      };
      const result = createClientSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});