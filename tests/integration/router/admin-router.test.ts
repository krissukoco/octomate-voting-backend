import request from 'supertest';
import { TestApp } from '../../utils/test-app';
import { MockFactories } from '../../utils/mock-factories';
import { DatabaseHelper } from '../../utils/database-helper';

describe('Admin Router Integration', () => {
  let testApp: TestApp;
  let adminToken: string;

  beforeAll(async () => {
    testApp = await TestApp.create();
    adminToken = testApp.generateAdminToken();
  });

  beforeEach(async () => {
    await testApp.cleanup();
  });

  afterAll(async () => {
    await DatabaseHelper.disconnect();
  });

  describe('GET /admin/users', () => {
    it('should return paginated list of users with default pagination', async () => {
      // Create test users
      const users: any[] = [];
      for (let i = 1; i <= 3; i++) {
        const userData = MockFactories.createUserRequest({
          username: `user${i}`,
          password: '$2b$10$hashedPassword',
          first_password: 'plainPassword'
        });
        users.push(await testApp.userRepo.create(userData));
      }

      const response = await request(testApp.app)
        .get('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.list).toHaveLength(3);
      expect(response.body.pagination).toEqual({
        page: 1,
        size: 10,
        total: 3,
        last_page: 1
      });

      // Check that passwords are not included in response
      response.body.list.forEach((user: any) => {
        expect(user.password).toBeUndefined();
        expect(user.username).toBeDefined();
        expect(user.id).toBeDefined();
        expect(user.first_password).toBeDefined();
      });
    });

    it('should return paginated list with custom page and size', async () => {
      // Create more test users
      for (let i = 1; i <= 15; i++) {
        const userData = MockFactories.createUserRequest({
          username: `user${i}`,
          password: '$2b$10$hashedPassword',
          first_password: 'plainPassword'
        });
        await testApp.userRepo.create(userData);
      }

      const response = await request(testApp.app)
        .get('/admin/users?page=2&size=5')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.list).toHaveLength(5);
      expect(response.body.pagination).toEqual({
        page: 2,
        size: 5,
        total: 15,
        last_page: 3
      });
    });

    it('should return 401 when no authorization header is provided', async () => {
      await request(testApp.app)
        .get('/admin/users')
        .expect(401);
    });

    it('should return 401 when invalid token is provided', async () => {
      await request(testApp.app)
        .get('/admin/users')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should return 403 when user token is used instead of admin token', async () => {
      const { token: userToken } = await testApp.createTestUser();

      await request(testApp.app)
        .get('/admin/users')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should handle validation errors for invalid query parameters', async () => {
      const response = await request(testApp.app)
        .get('/admin/users?page=invalid&size=invalid')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(422);

      expect(response.body.code).toBeDefined();
      expect(response.body.message).toBeDefined();
    });
  });

  describe('POST /admin/users', () => {
    it('should create a new user with valid username', async () => {
      const username = 'newuser';

      const response = await request(testApp.app)
        .post('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ username })
        .expect(201);

      expect(response.body.username).toBe(username);
      expect(response.body.id).toBeDefined();
      expect(response.body.first_password).toBeDefined();
      expect(response.body.created_at).toBeDefined();
      expect(response.body.updated_at).toBeDefined();
      
      // Password should not be in response
      expect(response.body.password).toBeUndefined();

      // Verify user was actually created in database
      const createdUser = await testApp.userRepo.firstByUsername(username);
      expect(createdUser).toBeDefined();
      expect(createdUser?.username).toBe(username);
    });

    it('should return 400 when username already exists', async () => {
      const username = 'existinguser';
      
      // Create user first
      const userData = MockFactories.createUserRequest({
        username,
        password: '$2b$10$hashedPassword',
        first_password: 'plainPassword'
      });
      await testApp.userRepo.create(userData);

      const response = await request(testApp.app)
        .post('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ username })
        .expect(400);

      expect(response.body.message).toContain('username already exists');
    });

    it('should return 400 when username is missing', async () => {
      const response = await request(testApp.app)
        .post('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({})
        .expect(422);

      expect(response.body.code).toBeDefined();
      expect(response.body.message).toBeDefined();
    });

    it('should return 400 when username is empty string', async () => {
      const response = await request(testApp.app)
        .post('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ username: '' })
        .expect(422);

      expect(response.body.code).toBeDefined();
      expect(response.body.message).toBeDefined();
    });

    it('should return 401 when no authorization header is provided', async () => {
      await request(testApp.app)
        .post('/admin/users')
        .send({ username: 'testuser' })
        .expect(401);
    });

    it('should return 403 when user token is used instead of admin token', async () => {
      const { token: userToken } = await testApp.createTestUser();

      await request(testApp.app)
        .post('/admin/users')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ username: 'testuser' })
        .expect(403);
    });

    it('should handle special characters in username', async () => {
      const username = 'user.with-special_chars123';

      const response = await request(testApp.app)
        .post('/admin/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ username })
        .expect(201);

      expect(response.body.username).toBe(username);
    });
  });

  describe('GET /admin/summary', () => {
    it('should return empty vote summary when no votes exist', async () => {
      const response = await request(testApp.app)
        .get('/admin/summary')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toEqual({
        winner: null,
        count: 0,
        list: []
      });
    });

    it('should return vote summary with correct counts and percentages', async () => {
      // Create users and votes
      const users: any[] = [];
      for (let i = 1; i <= 10; i++) {
        const userData = MockFactories.createUserRequest({
          username: `user${i}`,
          password: '$2b$10$hashedPassword',
          first_password: 'plainPassword'
        });
        const user = await testApp.userRepo.create(userData);
        users.push(user);
      }

      // Create votes: 6 for Candidate A, 4 for Candidate B
      for (let i = 0; i < 6; i++) {
        await testApp.voteRepo.upsert({
          user_id: users[i].id,
          name: 'Candidate A'
        });
      }
      for (let i = 6; i < 10; i++) {
        await testApp.voteRepo.upsert({
          user_id: users[i].id,
          name: 'Candidate B'
        });
      }

      const response = await request(testApp.app)
        .get('/admin/summary')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.winner).toBe('Candidate A');
      expect(response.body.count).toBe(10);
      expect(response.body.list).toHaveLength(2);
      
      const candidateA = response.body.list.find((entry: any) => entry.name === 'Candidate A');
      const candidateB = response.body.list.find((entry: any) => entry.name === 'Candidate B');
      
      expect(candidateA).toEqual({
        name: 'Candidate A',
        count: 6,
        percentage: 60.0
      });
      expect(candidateB).toEqual({
        name: 'Candidate B',
        count: 4,
        percentage: 40.0
      });
    });

    it('should return 401 when no authorization header is provided', async () => {
      await request(testApp.app)
        .get('/admin/summary')
        .expect(401);
    });

    it('should return 403 when user token is used instead of admin token', async () => {
      const { token: userToken } = await testApp.createTestUser();

      await request(testApp.app)
        .get('/admin/summary')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should handle single vote correctly', async () => {
      const userData = MockFactories.createUserRequest({ username: 'voter' });
      const user = await testApp.userRepo.create(userData);
      
      await testApp.voteRepo.upsert({
        user_id: user.id,
        name: 'Solo Candidate'
      });

      const response = await request(testApp.app)
        .get('/admin/summary')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body).toEqual({
        winner: 'Solo Candidate',
        count: 1,
        list: [{
          name: 'Solo Candidate',
          count: 1,
          percentage: 100.0
        }]
      });
    });
  });
});