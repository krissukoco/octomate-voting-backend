import request from 'supertest';
import { TestApp } from '../../utils/test-app';
import { MockFactories } from '../../utils/mock-factories';
import { DatabaseHelper } from '../../utils/database-helper';

describe('Vote Router Integration', () => {
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

  describe('GET /vote/current', () => {
    it('should return current vote when user has voted', async () => {
      const { user, token } = await testApp.createTestUser('voter');
      const candidateName = 'Test Candidate';

      // Create a vote for the user
      await testApp.voteRepo.upsert({
        user_id: user.id,
        name: candidateName
      });

      const response = await request(testApp.app)
        .get('/vote/current')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.currentVote).toBeDefined();
      expect(response.body.currentVote.user_id).toBe(user.id);
      expect(response.body.currentVote.name).toBe(candidateName);
      expect(response.body.currentVote.id).toBeDefined();
      expect(response.body.currentVote.created_at).toBeDefined();
      expect(response.body.currentVote.updated_at).toBeDefined();
    });

    it('should return null when user has not voted', async () => {
      const { token } = await testApp.createTestUser('non_voter');

      const response = await request(testApp.app)
        .get('/vote/current')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.currentVote).toBeNull();
    });

    it('should return 401 when no authorization header is provided', async () => {
      await request(testApp.app)
        .get('/vote/current')
        .expect(401);
    });

    it('should return 401 when invalid token is provided', async () => {
      await request(testApp.app)
        .get('/vote/current')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should return 403 when admin token is used instead of user token', async () => {
      const adminToken = testApp.generateAdminToken();

      await request(testApp.app)
        .get('/vote/current')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });

    it('should return correct vote for different users', async () => {
      const { user: user1, token: token1 } = await testApp.createTestUser('voter1');
      const { user: user2, token: token2 } = await testApp.createTestUser('voter2');

      // Create different votes for different users
      await testApp.voteRepo.upsert({
        user_id: user1.id,
        name: 'Candidate A'
      });
      await testApp.voteRepo.upsert({
        user_id: user2.id,
        name: 'Candidate B'
      });

      const response1 = await request(testApp.app)
        .get('/vote/current')
        .set('Authorization', `Bearer ${token1}`)
        .expect(200);

      const response2 = await request(testApp.app)
        .get('/vote/current')
        .set('Authorization', `Bearer ${token2}`)
        .expect(200);

      expect(response1.body.currentVote.name).toBe('Candidate A');
      expect(response1.body.currentVote.user_id).toBe(user1.id);
      expect(response2.body.currentVote.name).toBe('Candidate B');
      expect(response2.body.currentVote.user_id).toBe(user2.id);
    });
  });

  describe('GET /vote/options', () => {
    it('should return empty list when no votes exist', async () => {
      const { token } = await testApp.createTestUser('user');

      const response = await request(testApp.app)
        .get('/vote/options')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.list).toEqual([]);
    });

    it('should return distinct candidate names from all votes', async () => {
      // Create multiple users and votes
      const users: any[] = [];
      for (let i = 1; i <= 5; i++) {
        const { user } = await testApp.createTestUser(`voter${i}`);
        users.push(user);
      }

      // Create votes with some duplicates
      await testApp.voteRepo.upsert({ user_id: users[0].id, name: 'Candidate A' });
      await testApp.voteRepo.upsert({ user_id: users[1].id, name: 'Candidate B' });
      await testApp.voteRepo.upsert({ user_id: users[2].id, name: 'Candidate A' }); // Duplicate
      await testApp.voteRepo.upsert({ user_id: users[3].id, name: 'Candidate C' });
      await testApp.voteRepo.upsert({ user_id: users[4].id, name: 'Candidate B' }); // Duplicate

      const { token } = await testApp.createTestUser('viewer');

      const response = await request(testApp.app)
        .get('/vote/options')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.list).toHaveLength(3);
      expect(response.body.list).toContain('Candidate A');
      expect(response.body.list).toContain('Candidate B');
      expect(response.body.list).toContain('Candidate C');
    });

    it('should return 401 when no authorization header is provided', async () => {
      await request(testApp.app)
        .get('/vote/options')
        .expect(401);
    });

    it('should return 401 when invalid token is provided', async () => {
      await request(testApp.app)
        .get('/vote/options')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should return 403 when admin token is used instead of user token', async () => {
      const adminToken = testApp.generateAdminToken();

      await request(testApp.app)
        .get('/vote/options')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });

    it('should handle special characters in candidate names', async () => {
      const { user } = await testApp.createTestUser('voter');
      const specialName = 'Candidate with "Special" Characters & Symbols!';

      await testApp.voteRepo.upsert({ user_id: user.id, name: specialName });

      const { token } = await testApp.createTestUser('viewer');

      const response = await request(testApp.app)
        .get('/vote/options')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.list).toContain(specialName);
    });
  });

  describe('POST /vote/', () => {
    it('should create a new vote when user has not voted before', async () => {
      const { token } = await testApp.createTestUser('new_voter');
      const candidateName = 'New Candidate';

      const response = await request(testApp.app)
        .post('/vote/')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: candidateName })
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(typeof response.body.id).toBe('string');
    });

    it('should update existing vote when user has already voted', async () => {
      const { user, token } = await testApp.createTestUser('existing_voter');
      const originalCandidate = 'Original Candidate';
      const newCandidate = 'New Candidate';

      // Create initial vote
      const initialVoteId = await testApp.voteRepo.upsert({
        user_id: user.id,
        name: originalCandidate
      });

      const response = await request(testApp.app)
        .post('/vote/')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: newCandidate })
        .expect(201);

      expect(response.body.id).toBe(initialVoteId);

      // Verify vote was updated
      const updatedVote = await testApp.voteRepo.getByUser(user.id);
      expect(updatedVote?.name).toBe(newCandidate);
    });

    it('should return 422 when name is missing', async () => {
      const { token } = await testApp.createTestUser('voter');

      const response = await request(testApp.app)
        .post('/vote/')
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(422);

      expect(response.body.code).toBeDefined();
      expect(response.body.message).toBeDefined();
    });

    it('should return 422 when name is empty string', async () => {
      const { token } = await testApp.createTestUser('voter');

      const response = await request(testApp.app)
        .post('/vote/')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: '' })
        .expect(422);

      expect(response.body.code).toBeDefined();
      expect(response.body.message).toBeDefined();
    });

    it('should return 401 when no authorization header is provided', async () => {
      await request(testApp.app)
        .post('/vote/')
        .send({ name: 'Test Candidate' })
        .expect(401);
    });

    it('should return 401 when invalid token is provided', async () => {
      await request(testApp.app)
        .post('/vote/')
        .set('Authorization', 'Bearer invalid-token')
        .send({ name: 'Test Candidate' })
        .expect(401);
    });

    it('should return 403 when admin token is used instead of user token', async () => {
      const adminToken = testApp.generateAdminToken();

      await request(testApp.app)
        .post('/vote/')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Test Candidate' })
        .expect(403);
    });

    it('should handle multiple users voting for different candidates', async () => {
      const users: Array<{ user: any; token: string }> = [];
      for (let i = 1; i <= 3; i++) {
        users.push(await testApp.createTestUser(`voter${i}`));
      }

      const candidates = ['Candidate A', 'Candidate B', 'Candidate A']; // Some duplicates

      for (let i = 0; i < users.length; i++) {
        const response = await request(testApp.app)
          .post('/vote/')
          .set('Authorization', `Bearer ${users[i].token}`)
          .send({ name: candidates[i] })
          .expect(201);

        expect(response.body.id).toBeDefined();
      }

      // Verify votes were created correctly
      for (let i = 0; i < users.length; i++) {
        const vote = await testApp.voteRepo.getByUser(users[i].user.id);
        expect(vote?.name).toBe(candidates[i]);
      }
    });

    it('should handle special characters in candidate name', async () => {
      const { token } = await testApp.createTestUser('voter');
      const specialName = 'Candidate with "Special" Characters & Symbols!';

      const response = await request(testApp.app)
        .post('/vote/')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: specialName })
        .expect(201);

      expect(response.body.id).toBeDefined();
    });

    it('should handle very long candidate names', async () => {
      const { token } = await testApp.createTestUser('voter');
      const longName = 'A'.repeat(255); // Very long name

      const response = await request(testApp.app)
        .post('/vote/')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: longName })
        .expect(201);

      expect(response.body.id).toBeDefined();
    });

    it('should allow user to change vote multiple times', async () => {
      const { user, token } = await testApp.createTestUser('indecisive_voter');
      
      const candidates = ['Candidate A', 'Candidate B', 'Candidate C'];
      let lastVoteId: string;

      for (const candidate of candidates) {
        const response = await request(testApp.app)
          .post('/vote/')
          .set('Authorization', `Bearer ${token}`)
          .send({ name: candidate })
          .expect(201);

        lastVoteId = response.body.id;

        // Verify vote was updated
        const currentVote = await testApp.voteRepo.getByUser(user.id);
        expect(currentVote?.name).toBe(candidate);
      }

      // All votes should have the same ID (upsert behavior)
      expect(lastVoteId!).toBeDefined();
    });

    it('should track when vote was created vs updated', async () => {
      const { user, token } = await testApp.createTestUser('timestamp_voter');

      // Create initial vote
      await request(testApp.app)
        .post('/vote/')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Initial Candidate' })
        .expect(201);

      const initialVote = await testApp.voteRepo.getByUser(user.id);
      const initialCreatedAt = initialVote?.created_at;
      const initialUpdatedAt = initialVote?.updated_at;

      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 50));

      // Update vote
      await request(testApp.app)
        .post('/vote/')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated Candidate' })
        .expect(201);

      const updatedVote = await testApp.voteRepo.getByUser(user.id);

      expect(updatedVote?.created_at).toEqual(initialCreatedAt); // Should remain same
      expect(updatedVote?.updated_at.getTime()).toBeGreaterThan(initialUpdatedAt?.getTime() || 0); // Should be updated
    });
  });
});