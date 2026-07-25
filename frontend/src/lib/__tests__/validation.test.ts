import { validatePasswordStrength } from '../validation';

describe('Frontend Validation', () => {
  describe('validatePasswordStrength', () => {
    it('should validate strong password', () => {
      const password = 'StrongPass123!';
      const result = validatePasswordStrength(password);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    it('should reject short password', () => {
      const password = 'Short1!';
      const result = validatePasswordStrength(password);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters');
    });
    
    it('should reject password without uppercase', () => {
      const password = 'lowercase123!';
      const result = validatePasswordStrength(password);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain uppercase letters');
    });
    
    it('should reject password without lowercase', () => {
      const password = 'UPPERCASE123!';
      const result = validatePasswordStrength(password);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain lowercase letters');
    });
    
    it('should reject password without numbers', () => {
      const password = 'NoNumbers!';
      const result = validatePasswordStrength(password);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain numbers');
    });
    
    it('should reject password without special characters', () => {
      const password = 'NoSpecialChars123';
      const result = validatePasswordStrength(password);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain special characters');
    });
  });
});