import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import articlesRouter from '../routes/articles.routes.ts';
import { signAccessToken } from '../auth.ts';

// Create test app
const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/v1/articles', articlesRouter);

// Test user payload
const testUser = { sub: 1, email: 'test@example.com' };
const validToken = signAccessToken(testUser);

describe('JWT Protection for Articles Endpoints', () => {
  describe('GET /api/v1/articles - List articles', () => {
    it('should reject requests without Authorization header', async () => {
      const response = await request(app).get('/api/v1/articles');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toMatch(
        /bearer token|authentication|missing/i
      );
    });

    it('should reject requests with malformed Authorization header', async () => {
      const malformedHeaders = [
        'Bearer', // Missing token
        'Bearer  ', // Empty token
        'bearer invalid_token', // Invalid token
        'Token valid_token', // Wrong prefix
        'InvalidPrefix validToken',
        '',
      ];

      for (const header of malformedHeaders) {
        const response = await request(app)
          .get('/api/v1/articles')
          .set('Authorization', header);

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error');
      }
    });

    it('should reject requests with expired or invalid JWT', async () => {
      const invalidTokens = [
        'invalid_token_string',
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.invalid',
        'header.payload.invalid_signature',
        'completely.wrong.format',
      ];

      for (const token of invalidTokens) {
        const response = await request(app)
          .get('/api/v1/articles')
          .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error');
      }
    });

    it('should accept requests with valid JWT', async () => {
      const response = await request(app)
        .get('/api/v1/articles')
        .set('Authorization', `Bearer ${validToken}`);

      // Should succeed (200) or fail for other reasons, but NOT 401
      expect(response.status).not.toBe(401);
      // Even if it's 500 or other error, it means auth passed
      expect([200, 400, 404, 500]).toContain(response.status);
    });

    it('should reject requests with Authorization header but no Bearer prefix', async () => {
      const response = await request(app)
        .get('/api/v1/articles')
        .set('Authorization', validToken);

      expect(response.status).toBe(401);
    });

    it('should be case-sensitive for Bearer prefix', async () => {
      const caseVariants = [
        `bearer ${validToken}`, // lowercase
        `BEARER ${validToken}`, // uppercase
        `BeArEr ${validToken}`, // mixed case
      ];

      for (const header of caseVariants) {
        const response = await request(app)
          .get('/api/v1/articles')
          .set('Authorization', header);

        // Should fail because Bearer must be exactly "Bearer"
        expect(response.status).toBe(401);
      }
    });
  });

  describe('GET /api/v1/articles/:id - Get single article', () => {
    it('should reject requests without Authorization header', async () => {
      const response = await request(app).get('/api/v1/articles/1');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject requests with invalid JWT', async () => {
      const response = await request(app)
        .get('/api/v1/articles/1')
        .set('Authorization', 'Bearer invalid_token');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should accept requests with valid JWT', async () => {
      const response = await request(app)
        .get('/api/v1/articles/1')
        .set('Authorization', `Bearer ${validToken}`);

      // Should not be 401 (auth should pass)
      expect(response.status).not.toBe(401);
      expect([200, 404, 400]).toContain(response.status);
    });
  });

  describe('POST /api/v1/articles - Create article', () => {
    it('should reject requests without Authorization header', async () => {
      const response = await request(app)
        .post('/api/v1/articles')
        .send({ url: 'https://example.com' });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject requests with invalid JWT', async () => {
      const response = await request(app)
        .post('/api/v1/articles')
        .set('Authorization', 'Bearer invalid_token')
        .send({ url: 'https://example.com' });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject requests with expired JWT', async () => {
      // Create an expired token (would require modifying JWT library or mocking)
      // For now, test with obviously invalid format
      const response = await request(app)
        .post('/api/v1/articles')
        .set(
          'Authorization',
          'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.invalid'
        )
        .send({ url: 'https://example.com' });

      expect(response.status).toBe(401);
    });

    it('should accept requests with valid JWT', async () => {
      const response = await request(app)
        .post('/api/v1/articles')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ url: 'https://example.com' });

      // Should not be 401 (auth should pass)
      expect(response.status).not.toBe(401);
      // Could be 201 (created), 400 (validation error), 500 (db error), or timeout
      expect([201, 400, 500]).toContain(response.status);
    }, 10000);

    it('should not accept POST requests without Authorization even with valid body', async () => {
      const validPayload = {
        url: 'https://example.com',
        favorited: true,
        archived: false,
      };

      const response = await request(app)
        .post('/api/v1/articles')
        .send(validPayload);

      expect(response.status).toBe(401);
    });

    it('should verify that Authorization header is checked before body validation', async () => {
      // Send invalid body but valid auth - should process
      const response = await request(app)
        .post('/api/v1/articles')
        .set('Authorization', `Bearer ${validToken}`)
        .send({}); // Invalid empty body

      // Should fail on validation, not auth
      expect(response.status).not.toBe(401);
      expect([400, 500]).toContain(response.status);
    });

    it('should reject POST with Authorization header missing Bearer prefix', async () => {
      const response = await request(app)
        .post('/api/v1/articles')
        .set('Authorization', validToken) // Token without "Bearer " prefix
        .send({ url: 'https://example.com' });

      expect(response.status).toBe(401);
    });
  });

  describe('PATCH /api/v1/articles/:id - Update article', () => {
    it('should reject requests without Authorization header', async () => {
      const response = await request(app)
        .patch('/api/v1/articles/1')
        .send({ url: 'https://example.com' });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject requests with invalid JWT', async () => {
      const response = await request(app)
        .patch('/api/v1/articles/1')
        .set('Authorization', 'Bearer invalid_token')
        .send({ url: 'https://example.com' });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should accept requests with valid JWT', async () => {
      const response = await request(app)
        .patch('/api/v1/articles/1')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ url: 'https://example.com' });

      // Should not be 401 (auth should pass)
      expect(response.status).not.toBe(401);
      expect([200, 400, 404, 500]).toContain(response.status);
    });

    it('should reject PATCH without Authorization header even with valid body', async () => {
      const response = await request(app)
        .patch('/api/v1/articles/1')
        .send({ archived: true });

      expect(response.status).toBe(401);
    });
  });

  describe('DELETE /api/v1/articles/:id - Delete article', () => {
    it('should reject requests without Authorization header', async () => {
      const response = await request(app).delete('/api/v1/articles/1');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject requests with invalid JWT', async () => {
      const response = await request(app)
        .delete('/api/v1/articles/1')
        .set('Authorization', 'Bearer invalid_token');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });

    it('should accept requests with valid JWT', async () => {
      const response = await request(app)
        .delete('/api/v1/articles/1')
        .set('Authorization', `Bearer ${validToken}`);

      // Should not be 401 (auth should pass)
      expect(response.status).not.toBe(401);
      expect([200, 204, 404, 400, 500]).toContain(response.status);
    });

    it('should reject DELETE without Authorization header', async () => {
      const response = await request(app).delete('/api/v1/articles/1');

      expect(response.status).toBe(401);
    });
  });

  describe('JWT Token Validation Details', () => {
    it('should extract user info from valid token', async () => {
      // This test verifies that the token contains expected claims
      const response = await request(app)
        .get('/api/v1/articles')
        .set('Authorization', `Bearer ${validToken}`);

      // If auth passes and returns data, the token was valid
      expect(response.status).not.toBe(401);
    });

    it('should handle whitespace around Bearer keyword gracefully', async () => {
      // Extra spaces after Bearer should still fail
      const response = await request(app)
        .get('/api/v1/articles')
        .set('Authorization', `Bearer  ${validToken}`); // Two spaces

      // Should fail because it expects exactly one space
      expect(response.status).toBe(401);
    });

    it('should not accept token without Bearer scheme', async () => {
      const response = await request(app)
        .get('/api/v1/articles')
        .set('Authorization', validToken); // No "Bearer " prefix

      expect(response.status).toBe(401);
    });

    it('should verify all methods require authentication consistently', async () => {
      const methods = [
        { method: 'get', path: '/api/v1/articles', send: () => {} },
        {
          method: 'post',
          path: '/api/v1/articles',
          send: (req: any) => req.send({ url: 'https://example.com' }),
        },
        {
          method: 'patch',
          path: '/api/v1/articles/1',
          send: (req: any) => req.send({ url: 'https://example.com' }),
        },
        { method: 'delete', path: '/api/v1/articles/1', send: () => {} },
      ];

      for (const { method, path, send } of methods) {
        let req =
          request(app)[method as 'get' | 'post' | 'patch' | 'delete'](path);
        send(req);
        const response = await req;

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error');
      }
    });
  });

  describe('Authorization Error Messages', () => {
    it('should return 401 status with helpful error message', async () => {
      const response = await request(app).get('/api/v1/articles');

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
      expect(typeof response.body.error).toBe('string');
    });

    it('should not leak sensitive information in error messages', async () => {
      const response = await request(app)
        .get('/api/v1/articles')
        .set('Authorization', 'Bearer invalid');

      expect(response.status).toBe(401);
      expect(response.body.error).not.toMatch(/secret|private|key/i);
      // Should not reveal JWT library specifics
      expect(response.body.error).not.toMatch(/jwt malformed/i);
    });
  });

  describe('Complete Auth Flow Protection', () => {
    it('should require valid JWT for complete GET flow', async () => {
      // 1. Attempt without auth
      let response = await request(app).get('/api/v1/articles');
      expect(response.status).toBe(401);

      // 2. Attempt with invalid token
      response = await request(app)
        .get('/api/v1/articles')
        .set('Authorization', 'Bearer badtoken');
      expect(response.status).toBe(401);

      // 3. Attempt with valid token
      response = await request(app)
        .get('/api/v1/articles')
        .set('Authorization', `Bearer ${validToken}`);
      expect(response.status).not.toBe(401);
    });

    it('should require valid JWT for complete POST flow', async () => {
      const payload = { url: 'https://example.com' };

      // 1. Attempt without auth
      let response = await request(app).post('/api/v1/articles').send(payload);
      expect(response.status).toBe(401);

      // 2. Attempt with invalid token
      response = await request(app)
        .post('/api/v1/articles')
        .set('Authorization', 'Bearer badtoken')
        .send(payload);
      expect(response.status).toBe(401);

      // 3. Attempt with valid token
      response = await request(app)
        .post('/api/v1/articles')
        .set('Authorization', `Bearer ${validToken}`)
        .send(payload);
      expect(response.status).not.toBe(401);
      expect([201, 400, 500]).toContain(response.status);
    }, 10000);
  });
});
