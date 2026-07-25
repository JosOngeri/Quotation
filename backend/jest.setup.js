process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://postgres:password@localhost:5432/qms';
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
process.env.JWT_EXPIRES_IN = '7d';
process.env.PORT = '5000';