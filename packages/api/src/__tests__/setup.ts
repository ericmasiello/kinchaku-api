// Test environment configuration
process.env.NODE_ENV = 'development';
process.env.JWT_SECRET = 'test_jwt_secret_that_is_at_least_32_characters_long';
process.env.CORS_ORIGIN = '*';
process.env.TURSO_DATABASE_URL = 'file:test.db';
process.env.TURSO_AUTH_TOKEN = 'test_token';
process.env.JWT_TOKEN_EXPIRY = '1h';
process.env.REFRESH_TOKEN_EXPIRY = '7d';
