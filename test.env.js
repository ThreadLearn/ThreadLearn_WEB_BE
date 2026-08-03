// Test-only defaults keep unit tests isolated from developer .env files.
process.env.NODE_ENV = 'test';
// Unit tests must not inherit a developer's Judge0 credentials from .env.
// Empty values are preserved by dotenv.config() and normalized to undefined
// by the environment schema, exercising the intended unconfigured path.
process.env.JUDGE0_API_KEY = '';
process.env.JUDGE0_RAPIDAPI_KEY = '';
process.env.DATABASE_URL ||= 'mongodb://127.0.0.1:27017/threadlearn-test';
process.env.JWT_ACCESS_SECRET ||= 'test-access-secret';
process.env.JWT_REFRESH_SECRET ||= 'test-refresh-secret';
process.env.FRONTEND_URL ||= 'http://localhost:3001';
