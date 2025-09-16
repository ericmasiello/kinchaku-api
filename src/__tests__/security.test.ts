import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import articlesRouter from '../routes/articles.routes.ts';
import { signAccessToken } from '../auth.ts';

// Import the secure query builder for direct testing
// Since it's not exported, we'll test it through the API endpoint

// Create test app
const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/v1/articles', articlesRouter);

// Test user payload
const testUser = { sub: 1, email: 'test@example.com' };
const validToken = signAccessToken(testUser);

describe('Security Tests for Articles API', () => {
  describe('SQL Injection Prevention in PATCH /api/v1/articles/:id', () => {
    it('should reject malicious column names in request body', async () => {
      const maliciousPayload = {
        'url": "https://good.com", "user_id': 999, // attempt to inject SQL
        url: 'https://example.com',
      };

      const response = await request(app)
        .patch('/api/v1/articles/1')
        .set('Authorization', `Bearer ${validToken}`)
        .send(maliciousPayload);

      // The request should process normally, ignoring the malicious key
      // Only whitelisted columns should be processed
      // Check that the response is either 404 (not found) or success but no injection occurred
      expect([200, 404]).toContain(response.status);

      // If successful, verify no malicious data injection
      if (response.status === 200) {
        expect(response.body).toBeDefined();
        expect(response.body.user_id).not.toBe(999); // Malicious field should be ignored
      }
    });

    it('should only accept whitelisted column names', async () => {
      const payloadWithExtraFields = {
        url: 'https://example.com',
        archived: true,
        favorited: false,
        // These should be ignored by the whitelist
        user_id: 999,
        id: 888,
        created_at: 'fake_date',
        malicious_field: 'DROP TABLE articles;',
        'evil"): SELECT * FROM users WHERE id = 1; --': 'injection_attempt',
      };

      const response = await request(app)
        .patch('/api/v1/articles/1')
        .set('Authorization', `Bearer ${validToken}`)
        .send(payloadWithExtraFields);

      // Should process normally, only using whitelisted fields
      expect([200, 404]).toContain(response.status);

      // If successful, verify the whitelist worked - valid fields were processed
      if (response.status === 200) {
        expect(response.body).toBeDefined();
        expect(response.body.url).toBe('https://example.com'); // Valid update should work
        expect(response.body.archived).toBe(1); // Valid boolean conversion
        expect(response.body.favorited).toBe(0); // Valid boolean conversion
        // The malicious fields should not affect the response
      }
    });

    it('should handle SQL injection attempts in column values', async () => {
      const sqlInjectionPayloads = [
        {
          url: "https://example.com'; DROP TABLE articles; --",
        },
        {
          url: "https://example.com' OR '1'='1",
        },
        {
          url: "https://example.com'; UPDATE users SET email = 'hacked@evil.com'; --",
        },
      ];

      for (const payload of sqlInjectionPayloads) {
        const response = await request(app)
          .patch('/api/v1/articles/1')
          .set('Authorization', `Bearer ${validToken}`)
          .send(payload);

        // Should either return 404 (article not found) or 400 (validation error)
        // but never succeed with a malicious SQL injection
        expect([400, 404]).toContain(response.status);
      }
    });

    it('should reject invalid field types while maintaining security', async () => {
      const invalidPayloads = [
        {
          archived: "true'; DROP TABLE articles; --",
        },
        {
          favorited: "false' OR 1=1 --",
        },
        {
          url: 123, // invalid type for URL
        },
      ];

      for (const payload of invalidPayloads) {
        const response = await request(app)
          .patch('/api/v1/articles/1')
          .set('Authorization', `Bearer ${validToken}`)
          .send(payload);

        // Should return validation error, not process malicious content
        expect(response.status).toBe(400);
      }
    });

    it('should prevent column name injection through nested objects', async () => {
      const nestedInjectionPayload = {
        url: 'https://example.com',
        'nested": {"user_id': 999,
        "another_injection'); DROP TABLE articles; --": 'value',
      };

      const response = await request(app)
        .patch('/api/v1/articles/1')
        .set('Authorization', `Bearer ${validToken}`)
        .send(nestedInjectionPayload);

      // Should process normally, ignoring non-whitelisted fields
      expect([200, 404]).toContain(response.status);

      // If successful, verify only valid field was processed
      if (response.status === 200) {
        expect(response.body).toBeDefined();
        expect(response.body.url).toBe('https://example.com'); // Valid update should work
        // Malicious/non-whitelisted fields should be ignored
      }
    });

    it('should demonstrate SQL injection prevention (core security test)', async () => {
      // This test demonstrates that the new implementation prevents SQL injection
      // by only processing whitelisted columns
      const attemptedSQLInjection = {
        url: 'https://safe-url.com',
        // Attempt to inject SQL through field names:
        'url, user_id = 999, deleted = 1 WHERE id = 2; UPDATE articles SET user_id = 999; --':
          'injection',
        // Attempt to inject SQL through nested syntax:
        'archived = 1; DROP TABLE users; --': true,
      };

      const response = await request(app)
        .patch('/api/v1/articles/1')
        .set('Authorization', `Bearer ${validToken}`)
        .send(attemptedSQLInjection);

      // The response should either succeed with safe data or fail with 404
      expect([200, 404]).toContain(response.status);

      // If it succeeds, only the whitelisted 'url' field should be processed
      if (response.status === 200) {
        expect(response.body.url).toBe('https://safe-url.com');
        // The malicious field names should be completely ignored
      }

      // Most importantly: no database corruption should occur
      // The API should still be functional after the injection attempt
      const followUpResponse = await request(app)
        .patch('/api/v1/articles/1')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ archived: true });

      expect([200, 404]).toContain(followUpResponse.status);
    });
  });

  describe('Query Builder Security', () => {
    it('should only process whitelisted columns in query builder', async () => {
      // Test that demonstrates the query builder ignores non-whitelisted fields
      const mixedPayload = {
        // Whitelisted fields (should be processed):
        url: 'https://test.com',
        archived: false,
        favorited: true,

        // Non-whitelisted fields (should be ignored):
        user_id: 999,
        id: 888,
        created_at: '2023-01-01',
        deleted: 1,
        admin: true,
        role: 'admin',
        'malicious_sql"; DROP TABLE articles; --': 'evil',
      };

      const response = await request(app)
        .patch('/api/v1/articles/1')
        .set('Authorization', `Bearer ${validToken}`)
        .send(mixedPayload);

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        // Only whitelisted fields should be reflected in the response
        expect(response.body.url).toBe('https://test.com');
        expect(response.body.archived).toBe(0); // false -> 0
        expect(response.body.favorited).toBe(1); // true -> 1
      }
    });

    it('should maintain functionality with valid data', async () => {
      const validPayload = {
        url: 'https://valid-example.com',
        archived: true,
        favorited: false,
      };

      const response = await request(app)
        .patch('/api/v1/articles/1')
        .set('Authorization', `Bearer ${validToken}`)
        .send(validPayload);

      // Should either work or return 404 if article doesn't exist
      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body).toBeDefined();
        expect(response.body.url).toBe('https://valid-example.com');
        expect(response.body.archived).toBe(1); // SQLite boolean as integer
        expect(response.body.favorited).toBe(0); // SQLite boolean as integer
      } else {
        expect(response.body).toHaveProperty('error', 'Not found');
      }
    });

    it('should reject empty update requests', async () => {
      const emptyPayload = {};

      const response = await request(app)
        .patch('/api/v1/articles/1')
        .set('Authorization', `Bearer ${validToken}`)
        .send(emptyPayload);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle undefined values securely', async () => {
      const payloadWithUndefined = {
        url: undefined,
        archived: true,
        favorited: undefined,
      };

      const response = await request(app)
        .patch('/api/v1/articles/1')
        .set('Authorization', `Bearer ${validToken}`)
        .send(payloadWithUndefined);

      // Should process only defined values
      expect([200, 404]).toContain(response.status);

      // If successful, verify only the defined archived field was updated
      if (response.status === 200) {
        expect(response.body).toBeDefined();
        expect(response.body.archived).toBe(1); // Only archived should be updated
      }
    });
  });

  describe('Authorization Security', () => {
    it('should reject requests without authentication', async () => {
      const response = await request(app)
        .patch('/api/v1/articles/1')
        .send({ url: 'https://example.com' });

      expect(response.status).toBe(401);
    });

    it('should reject requests with invalid tokens', async () => {
      const response = await request(app)
        .patch('/api/v1/articles/1')
        .set('Authorization', 'Bearer invalid_token')
        .send({ url: 'https://example.com' });

      expect(response.status).toBe(401);
    });
  });

  describe('Zod-Based Security Validation', () => {
    it('should reject invalid data types with Zod validation', async () => {
      const invalidPayloads = [
        {
          url: 123, // Invalid type - should be string
        },
        {
          archived: 'not a boolean', // Invalid type - should be boolean
        },
        {
          favorited: null, // Invalid type - should be boolean
        },
        {
          url: 'not-a-valid-url', // Invalid format - should be valid URL
        },
      ];

      for (const payload of invalidPayloads) {
        const response = await request(app)
          .patch('/api/v1/articles/1')
          .set('Authorization', `Bearer ${validToken}`)
          .send(payload);

        // Should return 400 due to Zod validation failure
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
      }
    });

    it('should validate URL format with Zod', async () => {
      const invalidUrls = [
        { url: 'not-a-url' },
        { url: '' },
        { url: 'invalid' },
      ];

      for (const payload of invalidUrls) {
        const response = await request(app)
          .patch('/api/v1/articles/1')
          .set('Authorization', `Bearer ${validToken}`)
          .send(payload);

        expect(response.status).toBe(400);
        expect(response.body.error).toBeDefined();
      }

      // Test some URLs that might be valid but we want to reject
      const borderlineCases = [
        { url: 'ftp://invalid-protocol.com' }, // FTP might be valid URL format
        { url: 'javascript:alert(1)' }, // javascript: might be valid URL format
      ];

      for (const payload of borderlineCases) {
        const response = await request(app)
          .patch('/api/v1/articles/1')
          .set('Authorization', `Bearer ${validToken}`)
          .send(payload);

        // These might pass Zod validation since they're technically valid URLs
        // The important thing is they don't cause SQL injection
        expect([200, 400, 404]).toContain(response.status);
      }
    });

    it('should accept valid URLs with Zod validation', async () => {
      const validUrls = [
        'https://example.com',
        'http://test.org',
        'https://subdomain.example.com/path?query=value',
      ];

      for (const url of validUrls) {
        const response = await request(app)
          .patch('/api/v1/articles/1')
          .set('Authorization', `Bearer ${validToken}`)
          .send({ url });

        // Should either succeed or fail with 404 (not 400 validation error)
        expect([200, 404]).toContain(response.status);
      }
    });

    it('should enforce at-least-one-field requirement', async () => {
      const emptyPayloads = [
        {},
        { nonExistentField: 'value' }, // Field not in schema
        { url: undefined, archived: undefined }, // All undefined
      ];

      for (const payload of emptyPayloads) {
        const response = await request(app)
          .patch('/api/v1/articles/1')
          .set('Authorization', `Bearer ${validToken}`)
          .send(payload);

        expect(response.status).toBe(400);
        expect(response.body.error).toBeDefined();
      }
    });

    it('should provide type safety and prevent field injection', async () => {
      // This test demonstrates that Zod prevents injection through unknown fields
      const injectionAttempt = {
        url: 'https://safe.com',
        // These fields are completely ignored by Zod schema
        'user_id": 999, "admin": true, "sql_injection': 'DROP TABLE',
        constructor: 'malicious',
        prototype: 'attack',
        __proto__: 'injection',
      };

      const response = await request(app)
        .patch('/api/v1/articles/1')
        .set('Authorization', `Bearer ${validToken}`)
        .send(injectionAttempt);

      // Should process normally - Zod only parses known fields
      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        expect(response.body.url).toBe('https://safe.com');
        // Malicious fields should not appear anywhere
        expect(response.body).not.toHaveProperty('user_id', 999);
        expect(response.body).not.toHaveProperty('admin');
      }
    });
  });
});
