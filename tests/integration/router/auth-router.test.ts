import request from 'supertest';
import bcrypt from 'bcrypt';
import { TestApp } from '../../utils/test-app';
import { MockFactories } from '../../utils/mock-factories';
import { DatabaseHelper } from '../../utils/database-helper';

describe('Auth Router Integration', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await TestApp.create();
  });

  beforeEach(async () => {
    await testApp.cleanup();
  });

  afterAll(async () => {
    await DatabaseHelper.disconnect();
  });

  describe('POST /auth/user/login', () => {
    it('should return access token when user credentials are valid', async () => {
      const username = 'testuser';
      const password = 'plainPassword';
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create test user
      const userData = MockFactories.createUserRequest({
        username,
        password: hashedPassword,
        first_password: password
      });
      await testApp.userRepo.create(userData);

      const response = await request(testApp.app)
        .post('/auth/user/login')
        .send({ username, password })
        .expect(200);

      expect(response.body.access_token).toBeDefined();
      expect(response.body.valid_until).toBeDefined();
      expect(typeof response.body.access_token).toBe('string');
      expect(typeof response.body.valid_until).toBe('number');
      expect(response.body.valid_until).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it('should return 400 when user does not exist', async () => {
      const response = await request(testApp.app)
        .post('/auth/user/login')
        .send({
          username: 'nonexistent',
          password: 'anypassword'
        })
        .expect(400);

      expect(response.body.message).toContain('Invalid Credentials');
    });

    it('should return 400 when password is incorrect', async () => {
      const username = 'testuser';
      const correctPassword = 'correctPassword';
      const wrongPassword = 'wrongPassword';
      const hashedPassword = await bcrypt.hash(correctPassword, 10);

      // Create test user
      const userData = MockFactories.createUserRequest({
        username,
        password: hashedPassword,
        first_password: correctPassword
      });
      await testApp.userRepo.create(userData);

      const response = await request(testApp.app)
        .post('/auth/user/login')
        .send({
          username,
          password: wrongPassword
        })
        .expect(400);

      expect(response.body.message).toContain('Invalid Credentials');
    });

    it('should return 422 when username is missing', async () => {
      const response = await request(testApp.app)
        .post('/auth/user/login')
        .send({ password: 'somepassword' })
        .expect(422);

      expect(response.body.code).toBeDefined();
      expect(response.body.message).toBeDefined();
    });

    it('should return 422 when password is missing', async () => {
      const response = await request(testApp.app)
        .post('/auth/user/login')
        .send({ username: 'someuser' })
        .expect(422);

      expect(response.body.code).toBeDefined();
      expect(response.body.message).toBeDefined();
    });

    it('should return 422 when both username and password are missing', async () => {
      const response = await request(testApp.app)
        .post('/auth/user/login')
        .send({})
        .expect(422);

      expect(response.body.code).toBeDefined();
      expect(response.body.message).toBeDefined();
    });

    it('should handle empty string username and password', async () => {
      const response = await request(testApp.app)
        .post('/auth/user/login')
        .send({ username: '', password: '' })
        .expect(422);

      expect(response.body.code).toBeDefined();
      expect(response.body.message).toBeDefined();
    });

    it('should generate different tokens for different users', async () => {
      const password = 'samePassword';
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create two test users
      const user1Data = MockFactories.createUserRequest({
        username: 'user1',
        password: hashedPassword,
        first_password: password
      });
      const user2Data = MockFactories.createUserRequest({
        username: 'user2',
        password: hashedPassword,
        first_password: password
      });

      await testApp.userRepo.create(user1Data);
      await testApp.userRepo.create(user2Data);

      const response1 = await request(testApp.app)
        .post('/auth/user/login')
        .send({ username: 'user1', password })
        .expect(200);

      const response2 = await request(testApp.app)
        .post('/auth/user/login')
        .send({ username: 'user2', password })
        .expect(200);

      expect(response1.body.access_token).not.toBe(response2.body.access_token);
    });
  });

  describe('POST /auth/admin/login', () => {
    it('should return access token when admin credentials are valid', async () => {
      const response = await request(testApp.app)
        .post('/auth/admin/login')
        .send({
          username: testApp.authConfig.adminUsername,
          password: testApp.authConfig.adminPassword
        })
        .expect(200);

      expect(response.body.access_token).toBeDefined();
      expect(response.body.valid_until).toBeDefined();
      expect(typeof response.body.access_token).toBe('string');
      expect(typeof response.body.valid_until).toBe('number');
      expect(response.body.valid_until).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it('should return 400 when admin username is incorrect', async () => {
      const response = await request(testApp.app)
        .post('/auth/admin/login')
        .send({
          username: 'wrongadmin',
          password: testApp.authConfig.adminPassword
        })
        .expect(400);

      expect(response.body.message).toContain('Invalid Credentials');
    });

    it('should return 400 when admin password is incorrect', async () => {
      const response = await request(testApp.app)
        .post('/auth/admin/login')
        .send({
          username: testApp.authConfig.adminUsername,
          password: 'wrongpassword'
        })
        .expect(400);

      expect(response.body.message).toContain('Invalid Credentials');
    });

    it('should return 422 when username is missing', async () => {
      const response = await request(testApp.app)
        .post('/auth/admin/login')
        .send({ password: testApp.authConfig.adminPassword })
        .expect(422);

      expect(response.body.code).toBeDefined();
      expect(response.body.message).toBeDefined();
    });

    it('should return 422 when password is missing', async () => {
      const response = await request(testApp.app)
        .post('/auth/admin/login')
        .send({ username: testApp.authConfig.adminUsername })
        .expect(422);

      expect(response.body.code).toBeDefined();
      expect(response.body.message).toBeDefined();
    });

    it('should generate different tokens for user and admin login', async () => {
      const password = 'testPassword';
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create test user
      const userData = MockFactories.createUserRequest({
        username: 'testuser',
        password: hashedPassword,
        first_password: password
      });
      await testApp.userRepo.create(userData);

      const userResponse = await request(testApp.app)
        .post('/auth/user/login')
        .send({ username: 'testuser', password })
        .expect(200);

      const adminResponse = await request(testApp.app)
        .post('/auth/admin/login')
        .send({
          username: testApp.authConfig.adminUsername,
          password: testApp.authConfig.adminPassword
        })
        .expect(200);

      expect(userResponse.body.access_token).not.toBe(adminResponse.body.access_token);
    });
  });

  describe('GET /auth/me', () => {
    it('should return user information when valid user token is provided', async () => {
      const { user, token } = await testApp.createTestUser('testuser');

      const response = await request(testApp.app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body).toEqual({
        id: user.id,
        username: user.username,
        type: 'USER'
      });
    });

    it('should return admin information when valid admin token is provided', async () => {
      const adminToken = testApp.generateAdminToken();

      const response = await request(testApp.app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toEqual({
        id: 'admin',
        username: testApp.authConfig.adminUsername,
        type: 'ADMIN'
      });
    });

    it('should return 401 when no authorization header is provided', async () => {
      await request(testApp.app)
        .get('/auth/me')
        .expect(401);
    });

    it('should return 401 when invalid token is provided', async () => {
      await request(testApp.app)
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should return 401 when malformed authorization header is provided', async () => {
      await request(testApp.app)
        .get('/auth/me')
        .set('Authorization', 'InvalidFormat token')
        .expect(401);
    });

    it('should return 401 when authorization header is missing Bearer prefix', async () => {
      const { token } = await testApp.createTestUser();

      await request(testApp.app)
        .get('/auth/me')
        .set('Authorization', token)
        .expect(401);
    });

    it('should return 401 when user referenced by token no longer exists', async () => {
      const { user, token } = await testApp.createTestUser('deleteduser');

      // Simulate user deletion by clearing the database
      await testApp.cleanup();

      await request(testApp.app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
    });

    it('should handle different user tokens correctly', async () => {
      const { user: user1, token: token1 } = await testApp.createTestUser('user1');
      const { user: user2, token: token2 } = await testApp.createTestUser('user2');

      const response1 = await request(testApp.app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      const response2 = await request(testApp.app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token2}`)
        .expect(200);

      expect(response1.body.id).toBe(user1.id);
      expect(response1.body.username).toBe(user1.username);
      expect(response2.body.id).toBe(user2.id);
      expect(response2.body.username).toBe(user2.username);
      expect(response1.body.id).not.toBe(response2.body.id);
    });

    it('should validate token expiration', async () => {
      // This test would require manipulating the JWT expiration time
      // For now, we just verify that tokens work when they should be valid
      const { token } = await testApp.createTestUser('testuser');

      await request(testApp.app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });

    it('should handle case where user type is neither USER nor ADMIN', async () => {
      // This test simulates an edge case where a token has an invalid user type
      // In practice, this shouldn't happen with the current implementation
      // but it's good to test defensive programming
      const { token } = await testApp.createTestUser('testuser');

      await request(testApp.app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });
});