import bcrypt from 'bcryptjs';

export const validatePasswordStrength = (password: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (password.length < 8) errors.push('Password must be at least 8 characters');
  if (!/[A-Z]/.test(password)) errors.push('Password must contain uppercase letters');
  if (!/[a-z]/.test(password)) errors.push('Password must contain lowercase letters');
  if (!/[0-9]/.test(password)) errors.push('Password must contain numbers');
  if (!/[!@#$%^&*]/.test(password)) errors.push('Password must contain special characters');
  
  return {
    valid: errors.length === 0,
    errors
  };
};

export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, 12); // cost factor 12
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};