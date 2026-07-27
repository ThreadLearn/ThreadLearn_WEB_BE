// Test-only defaults keep unit tests isolated from developer .env files.
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ||= 'mongodb://127.0.0.1:27017/threadlearn-test';
process.env.JWT_ACCESS_SECRET ||= 'test-access-secret';
process.env.JWT_REFRESH_SECRET ||= 'test-refresh-secret';
process.env.FRONTEND_URL ||= 'http://localhost:3001';
