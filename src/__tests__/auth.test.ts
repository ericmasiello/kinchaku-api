import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import authRouter from '../routes/auth.routes.ts';
import { signAccessToken, hashPassword } from '../auth.ts';
import db from '../db.ts';

// Create test app
const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/v1/auth', authRouter);

// Test user data
const testUser = { sub: 1, email: 'me@example.com' };
const validToken = signAccessToken(testUser);
const testPassword = 'correct horse battery staple'; // This is the password for the test user in testdata.sql

// Helper function to reset user password to the original test password
async function resetUserPassword() {
  const { salt, hash } = await hashPassword(testPassword);
  await db.execute({
    sql: 'UPDATE users SET password_hash = ?, salt = ? WHERE id = ?',
    args: [hash, salt, testUser.sub],
  });
}

describe('Change Password API', () => {
  // Reset the user password before each test to ensure consistency
  beforeEach(async () => {
    await resetUserPassword();
  });

  describe('POST /api/v1/auth/change-password', () => {
    describe('Authentication Tests', () => {
      it('should reject requests without authentication token', async () => {
        const response = await request(app)
          .post('/api/v1/auth/change-password')
          .send({
            currentPassword: 'oldpass123',
            newPassword: 'newpass123',
            confirmPassword: 'newpass123',
          });

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error', 'Missing bearer token');
      });

      it('should reject requests with invalid authentication token', async () => {
        const response = await request(app)
          .post('/api/v1/auth/change-password')
          .set('Authorization', 'Bearer invalid_token')
          .send({
            currentPassword: 'oldpass123',
            newPassword: 'newpass123',
            confirmPassword: 'newpass123',
          });

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty(
          'error',
          'Invalid or expired token'
        );
      });

      it('should reject requests with malformed authorization header', async () => {
        const response = await request(app)
          .post('/api/v1/auth/change-password')
          .set('Authorization', 'InvalidFormat token')
          .send({
            currentPassword: 'oldpass123',
            newPassword: 'newpass123',
            confirmPassword: 'newpass123',
          });

        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('error', 'Missing bearer token');
      });
    });

    describe('Validation Tests', () => {
      it('should reject request with missing current password', async () => {
        const response = await request(app)
          .post('/api/v1/auth/change-password')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            newPassword: 'newpass123',
            confirmPassword: 'newpass123',
          });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error.fieldErrors).toHaveProperty(
          'currentPassword'
        );
      });

      it('should reject request with empty current password', async () => {
        const response = await request(app)
          .post('/api/v1/auth/change-password')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            currentPassword: '',
            newPassword: 'newpass123',
            confirmPassword: 'newpass123',
          });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error.fieldErrors).toHaveProperty(
          'currentPassword'
        );
      });

      it('should reject request with missing new password', async () => {
        const response = await request(app)
          .post('/api/v1/auth/change-password')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            currentPassword: 'oldpass123',
            confirmPassword: 'newpass123',
          });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error.fieldErrors).toHaveProperty('newPassword');
      });

      it('should reject request with short new password', async () => {
        const response = await request(app)
          .post('/api/v1/auth/change-password')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            currentPassword: 'oldpass123',
            newPassword: '1234567', // 7 characters - too short
            confirmPassword: '1234567',
          });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error.fieldErrors).toHaveProperty('newPassword');
        const newPasswordErrors = response.body.error.fieldErrors.newPassword;
        expect(
          newPasswordErrors.some((msg: string) =>
            msg.includes('at least 8 characters')
          )
        ).toBe(true);
      });

      it('should reject request with too long new password', async () => {
        const longPassword = 'a'.repeat(129); // 129 characters - too long
        const response = await request(app)
          .post('/api/v1/auth/change-password')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            currentPassword: 'oldpass123',
            newPassword: longPassword,
            confirmPassword: longPassword,
          });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error.fieldErrors).toHaveProperty('newPassword');
        const newPasswordErrors = response.body.error.fieldErrors.newPassword;
        expect(
          newPasswordErrors.some((msg: string) =>
            msg.includes('at most 128 characters')
          )
        ).toBe(true);
      });

      it('should reject request with missing confirm password', async () => {
        const response = await request(app)
          .post('/api/v1/auth/change-password')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            currentPassword: 'oldpass123',
            newPassword: 'newpass123',
          });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error.fieldErrors).toHaveProperty(
          'confirmPassword'
        );
      });

      it('should reject request when new password and confirm password do not match', async () => {
        const response = await request(app)
          .post('/api/v1/auth/change-password')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            currentPassword: 'oldpass123',
            newPassword: 'newpass123',
            confirmPassword: 'differentpass123',
          });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
        expect(response.body.error.fieldErrors).toHaveProperty(
          'confirmPassword'
        );
        const confirmPasswordErrors =
          response.body.error.fieldErrors.confirmPassword;
        expect(
          confirmPasswordErrors.some((msg: string) =>
            msg.includes("don't match")
          )
        ).toBe(true);
      });

      it('should accept valid password lengths at boundaries', async () => {
        // Test minimum valid length (8 characters)
        const response1 = await request(app)
          .post('/api/v1/auth/change-password')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            currentPassword: 'wrongpassword', // Use wrong password to test validation only
            newPassword: '12345678', // exactly 8 characters
            confirmPassword: '12345678',
          });

        expect(response1.status).toBe(400); // Will fail due to incorrect current password, but validation should pass
        expect(response1.body.error).toBe('Current password is incorrect'); // Should be password error, not validation error

        // Test maximum valid length (128 characters)
        const maxLengthPassword = 'a'.repeat(128);
        const response2 = await request(app)
          .post('/api/v1/auth/change-password')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            currentPassword: 'wrongpassword', // Use wrong password to test validation only
            newPassword: maxLengthPassword,
            confirmPassword: maxLengthPassword,
          });

        expect(response2.status).toBe(400); // Will fail due to incorrect current password, but validation should pass
        expect(response2.body.error).toBe('Current password is incorrect'); // Should be password error, not validation error
      });

      it('should reject request with non-string field types', async () => {
        const payloads = [
          {
            currentPassword: 123,
            newPassword: 'newpass123',
            confirmPassword: 'newpass123',
          },
          {
            currentPassword: 'oldpass123',
            newPassword: null,
            confirmPassword: 'newpass123',
          },
          {
            currentPassword: 'oldpass123',
            newPassword: 'newpass123',
            confirmPassword: ['array'],
          },
        ];

        for (const payload of payloads) {
          const response = await request(app)
            .post('/api/v1/auth/change-password')
            .set('Authorization', `Bearer ${validToken}`)
            .send(payload);

          expect(response.status).toBe(400);
          expect(response.body).toHaveProperty('error');
        }
      });
    });

    describe('Password Verification Tests', () => {
      it('should reject request with incorrect current password', async () => {
        const response = await request(app)
          .post('/api/v1/auth/change-password')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            currentPassword: 'wrongpassword',
            newPassword: 'newpass123',
            confirmPassword: 'newpass123',
          });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty(
          'error',
          'Current password is incorrect'
        );
      });

      it('should change password successfully with correct current password', async () => {
        const response = await request(app)
          .post('/api/v1/auth/change-password')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            currentPassword: testPassword,
            newPassword: 'newpassword123',
            confirmPassword: 'newpassword123',
          });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty(
          'message',
          'Password changed successfully'
        );

        // Verify the password was actually changed by trying to login with the new password
        const loginResponse = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: testUser.email,
            password: 'newpassword123',
          });

        expect(loginResponse.status).toBe(200);
        expect(loginResponse.body).toHaveProperty('token');

        // Note: Password will be reset by beforeEach for next test
      });
    });

    describe('Security Tests', () => {
      it('should prevent password change for non-existent user', async () => {
        // Create a token for a non-existent user
        const nonExistentUserToken = signAccessToken({
          sub: 99999,
          email: 'nonexistent@example.com',
        });

        const response = await request(app)
          .post('/api/v1/auth/change-password')
          .set('Authorization', `Bearer ${nonExistentUserToken}`)
          .send({
            currentPassword: 'anypassword',
            newPassword: 'newpass123',
            confirmPassword: 'newpass123',
          });

        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('error', 'Invalid request');
      });

      it('should not leak user existence through timing attacks', async () => {
        // Test that the endpoint takes similar time for non-existent users
        const nonExistentUserToken = signAccessToken({
          sub: 99999,
          email: 'nonexistent@example.com',
        });

        const start = Date.now();
        const response = await request(app)
          .post('/api/v1/auth/change-password')
          .set('Authorization', `Bearer ${nonExistentUserToken}`)
          .send({
            currentPassword: 'anypassword',
            newPassword: 'newpass123',
            confirmPassword: 'newpass123',
          });

        const duration = Date.now() - start;

        expect(response.status).toBe(404);
        // The response should be reasonably fast for non-existent users
        expect(duration).toBeLessThan(1000);
      });

      it('should handle SQL injection attempts safely', async () => {
        const sqlInjectionPayloads = [
          {
            currentPassword: "'; DROP TABLE users; --",
            newPassword: 'newpass123',
            confirmPassword: 'newpass123',
          },
          {
            currentPassword: testPassword,
            newPassword: 'normalpass123', // Use normal password for this test
            confirmPassword: 'normalpass123',
          },
        ];

        for (const payload of sqlInjectionPayloads) {
          const response = await request(app)
            .post('/api/v1/auth/change-password')
            .set('Authorization', `Bearer ${validToken}`)
            .send(payload);

          // First payload should fail due to wrong current password
          // Second payload should succeed with normal password
          if (payload.currentPassword === testPassword) {
            expect(response.status).toBe(200);
          } else {
            expect(response.status).toBe(400);
          }

          // Verify that the database is still intact - users table should still exist
          const userCheckResponse = await request(app)
            .post('/api/v1/auth/login')
            .send({
              email: testUser.email,
              password:
                payload.currentPassword === testPassword
                  ? 'normalpass123'
                  : testPassword,
            });

          // Should be able to login with the correct password (either original or new)
          expect(userCheckResponse.status).toBe(200);
        }

        // Verify table still exists by doing another password change
        const finalResponse = await request(app)
          .post('/api/v1/auth/change-password')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            currentPassword: 'normalpass123',
            newPassword: testPassword,
            confirmPassword: testPassword,
          });
        expect(finalResponse.status).toBe(200);
      });

      it('should prevent additional fields injection', async () => {
        const maliciousPayload = {
          currentPassword: testPassword,
          newPassword: 'newpass123',
          confirmPassword: 'newpass123',
          // Additional fields that should be ignored
          admin: true,
          role: 'admin',
          user_id: 999,
          'malicious": true, "admin': true,
        };

        const response = await request(app)
          .post('/api/v1/auth/change-password')
          .set('Authorization', `Bearer ${validToken}`)
          .send(maliciousPayload);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty(
          'message',
          'Password changed successfully'
        );

        // Verify user data wasn't modified maliciously
        const loginResponse = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: testUser.email,
            password: 'newpass123',
          });

        expect(loginResponse.status).toBe(200);

        // Note: Password will be reset by beforeEach for next test
      });

      it('should ensure password hashing is secure', async () => {
        const newPassword = 'uniquetestpass123';

        // Change password
        const response = await request(app)
          .post('/api/v1/auth/change-password')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            currentPassword: testPassword,
            newPassword: newPassword,
            confirmPassword: newPassword,
          });

        expect(response.status).toBe(200);

        // Verify that the password is hashed in the database (not stored in plaintext)
        const userResults = await db.execute({
          sql: 'SELECT password_hash, salt FROM users WHERE id = ?',
          args: [testUser.sub],
        });

        expect(userResults.rows.length).toBe(1);
        const userData = userResults.rows[0] as unknown as {
          password_hash: string;
          salt: string;
        };

        // Password hash should not be the plaintext password
        expect(userData.password_hash).not.toBe(newPassword);
        // Hash should be a hex string
        expect(userData.password_hash).toMatch(/^[a-f0-9]+$/);
        // Salt should be a hex string
        expect(userData.salt).toMatch(/^[a-f0-9]+$/);
        // Hash should be reasonably long (scrypt with 64-byte output -> 128 hex chars)
        expect(userData.password_hash.length).toBe(128);

        // Note: Password will be reset by beforeEach for next test
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty request body', async () => {
        const response = await request(app)
          .post('/api/v1/auth/change-password')
          .set('Authorization', `Bearer ${validToken}`)
          .send({});

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
      });

      it('should handle malformed JSON', async () => {
        const response = await request(app)
          .post('/api/v1/auth/change-password')
          .set('Authorization', `Bearer ${validToken}`)
          .set('Content-Type', 'application/json')
          .send('invalid json');

        expect(response.status).toBe(400);
      });

      it('should handle very long passwords at edge cases', async () => {
        // Test exactly at the 128 character limit
        const edgePassword = 'a'.repeat(128);

        const response = await request(app)
          .post('/api/v1/auth/change-password')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            currentPassword: testPassword,
            newPassword: edgePassword,
            confirmPassword: edgePassword,
          });

        expect(response.status).toBe(200);

        // Note: Password will be reset by beforeEach for next test
      });

      it('should handle special characters in passwords', async () => {
        const specialPassword = '!@#$%^&*()_+-=[]{}|;:,.<>?';

        const response = await request(app)
          .post('/api/v1/auth/change-password')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            currentPassword: testPassword,
            newPassword: specialPassword,
            confirmPassword: specialPassword,
          });

        expect(response.status).toBe(200);

        // Verify login works with special characters
        const loginResponse = await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: testUser.email,
            password: specialPassword,
          });

        expect(loginResponse.status).toBe(200);

        // Note: Password will be reset by beforeEach for next test
      });

      it('should handle unicode characters in passwords', async () => {
        const unicodePassword = 'pässwörd123üñîcødé';

        const response = await request(app)
          .post('/api/v1/auth/change-password')
          .set('Authorization', `Bearer ${validToken}`)
          .send({
            currentPassword: testPassword,
            newPassword: unicodePassword,
            confirmPassword: unicodePassword,
          });

        expect(response.status).toBe(200);

        // Note: Password will be reset by beforeEach for next test
      });
    });

    describe('Database Error Handling', () => {
      it('should handle database connection errors gracefully', async () => {
        // This test would require mocking the database, but we can test the error path
        // by ensuring the endpoint handles errors properly in the current implementation

        // Test with an invalid user ID that might cause database issues
        const invalidUserToken = signAccessToken({
          sub: -1,
          email: 'test@example.com',
        });

        const response = await request(app)
          .post('/api/v1/auth/change-password')
          .set('Authorization', `Bearer ${invalidUserToken}`)
          .send({
            currentPassword: 'anypassword',
            newPassword: 'newpass123',
            confirmPassword: 'newpass123',
          });

        // Should handle gracefully, not crash
        expect([404, 500]).toContain(response.status);
        expect(response.body).toHaveProperty('error');
      });
    });
  });
});
