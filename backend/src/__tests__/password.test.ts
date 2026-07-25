import { hashPassword, comparePassword, validatePasswordStrength } from '../utils/password';

describe('Password Utilities', () => {
  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);
    });
    
    it('should generate different hashes for same password', async () => {
      const password = 'TestPassword123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      expect(hash1).not.toBe(hash2);
    });
  });
  
  describe('comparePassword', () => {
    it('should compare passwords correctly', async () => {
      const password = 'TestPassword123!';
      const hash = await hashPassword(password);
      const match = await comparePassword(password, hash);
      expect(match).toBe(true);
    });
    
    it('should reject wrong password', async () => {
      const password = 'TestPassword123!';
      const wrongPassword = 'WrongPassword123!';
      const hash = await hashPassword(password);
      const noMatch = await comparePassword(wrongPassword, hash);
      expect(noMatch).toBe(false);
    });
  });
  
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