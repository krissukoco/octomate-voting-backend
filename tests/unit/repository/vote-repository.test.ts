import { ObjectId } from 'mongodb';
import { VoteRepositoryImpl } from '../../../src/repository/vote-repository';
import { DatabaseHelper } from '../../utils/database-helper';
import { MockFactories } from '../../utils/mock-factories';

describe('VoteRepositoryImpl', () => {
  let voteRepository: VoteRepositoryImpl;

  beforeAll(async () => {
    const db = await DatabaseHelper.connect();
    voteRepository = new VoteRepositoryImpl(db);
  });

  afterAll(async () => {
    await DatabaseHelper.disconnect();
  });

  beforeEach(async () => {
    await DatabaseHelper.clearCollections();
  });

  describe('getDistinctNames', () => {
    it('should return empty array when no votes exist', async () => {
      const names = await voteRepository.getDistinctNames();

      expect(names).toEqual([]);
    });

    it('should return distinct vote names', async () => {
      const userId1 = new ObjectId().toString();
      const userId2 = new ObjectId().toString();
      const userId3 = new ObjectId().toString();

      await voteRepository.upsert({ user_id: userId1, name: 'Candidate A' });
      await voteRepository.upsert({ user_id: userId2, name: 'Candidate B' });
      await voteRepository.upsert({ user_id: userId3, name: 'Candidate A' }); // Duplicate name

      const names = await voteRepository.getDistinctNames();

      expect(names).toHaveLength(2);
      expect(names).toContain('Candidate A');
      expect(names).toContain('Candidate B');
    });

    it('should handle special characters in candidate names', async () => {
      const userId = new ObjectId().toString();
      const specialName = 'Candidate with "Special" Characters & Symbols!';

      await voteRepository.upsert({ user_id: userId, name: specialName });

      const names = await voteRepository.getDistinctNames();

      expect(names).toContain(specialName);
    });
  });

  describe('getByUser', () => {
    it('should return vote when user has voted', async () => {
      const userId = new ObjectId().toString();
      const candidateName = 'Test Candidate';

      const voteId = await voteRepository.upsert({ user_id: userId, name: candidateName });
      const vote = await voteRepository.getByUser(userId);

      expect(vote).toBeDefined();
      expect(vote?.id).toBe(voteId);
      expect(vote?.user_id).toBe(userId);
      expect(vote?.name).toBe(candidateName);
      expect(vote?.created_at).toBeInstanceOf(Date);
      expect(vote?.updated_at).toBeInstanceOf(Date);
    });

    it('should return null when user has not voted', async () => {
      const userId = new ObjectId().toString();

      const vote = await voteRepository.getByUser(userId);

      expect(vote).toBeNull();
    });

    it('should return null when invalid ObjectId is provided', async () => {
      const invalidUserId = 'invalid-object-id';

      const vote = await voteRepository.getByUser(invalidUserId);

      expect(vote).toBeNull();
    });

    it('should return null when empty string is provided', async () => {
      const vote = await voteRepository.getByUser('');

      expect(vote).toBeNull();
    });
  });

  describe('getSummary', () => {
    it('should return empty summary when no votes exist', async () => {
      const summary = await voteRepository.getSummary();

      expect(summary.winner).toBeNull();
      expect(summary.count).toBe(0);
      expect(summary.list).toEqual([]);
    });

    it('should return correct summary with single vote', async () => {
      const userId = new ObjectId().toString();
      await voteRepository.upsert({ user_id: userId, name: 'Solo Candidate' });

      const summary = await voteRepository.getSummary();

      expect(summary.winner).toBe('Solo Candidate');
      expect(summary.count).toBe(1);
      expect(summary.list).toHaveLength(1);
      expect(summary.list[0]).toEqual({
        name: 'Solo Candidate',
        count: 1,
        percentage: 100.0
      });
    });

    it('should return correct summary with multiple votes and calculate percentages', async () => {
      // Create 10 votes: 6 for Candidate A, 4 for Candidate B
      for (let i = 1; i <= 6; i++) {
        const userId = new ObjectId().toString();
        await voteRepository.upsert({ user_id: userId, name: 'Candidate A' });
      }
      for (let i = 1; i <= 4; i++) {
        const userId = new ObjectId().toString();
        await voteRepository.upsert({ user_id: userId, name: 'Candidate B' });
      }

      const summary = await voteRepository.getSummary();

      expect(summary.winner).toBe('Candidate A');
      expect(summary.count).toBe(10);
      expect(summary.list).toHaveLength(2);

      // Results should be sorted by count (descending)
      expect(summary.list[0]).toEqual({
        name: 'Candidate A',
        count: 6,
        percentage: 60.0
      });
      expect(summary.list[1]).toEqual({
        name: 'Candidate B',
        count: 4,
        percentage: 40.0
      });
    });

    it('should handle tie scenarios correctly', async () => {
      const userId1 = new ObjectId().toString();
      const userId2 = new ObjectId().toString();

      await voteRepository.upsert({ user_id: userId1, name: 'Candidate A' });
      await voteRepository.upsert({ user_id: userId2, name: 'Candidate B' });

      const summary = await voteRepository.getSummary();

      expect(summary.count).toBe(2);
      expect(summary.list).toHaveLength(2);
      // Winner should be the first one returned by aggregation (depends on sorting)
      expect(['Candidate A', 'Candidate B']).toContain(summary.winner);
    });

    it('should sort candidates by vote count in descending order', async () => {
      // Create votes with different counts
      const candidates = [
        { name: 'Third Place', votes: 2 },
        { name: 'First Place', votes: 5 },
        { name: 'Second Place', votes: 3 }
      ];

      for (const candidate of candidates) {
        for (let i = 0; i < candidate.votes; i++) {
          const userId = new ObjectId().toString();
          await voteRepository.upsert({ user_id: userId, name: candidate.name });
        }
      }

      const summary = await voteRepository.getSummary();

      expect(summary.winner).toBe('First Place');
      expect(summary.list[0].name).toBe('First Place');
      expect(summary.list[1].name).toBe('Second Place');
      expect(summary.list[2].name).toBe('Third Place');
    });
  });

  describe('upsert', () => {
    it('should insert new vote when user has not voted', async () => {
      const userId = new ObjectId().toString();
      const candidateName = 'New Candidate';

      const voteId = await voteRepository.upsert({ user_id: userId, name: candidateName });

      expect(voteId).toBeDefined();
      expect(typeof voteId).toBe('string');

      const vote = await voteRepository.getByUser(userId);
      expect(vote).toBeDefined();
      expect(vote?.user_id).toBe(userId);
      expect(vote?.name).toBe(candidateName);
    });

    it('should update existing vote when user has already voted', async () => {
      const userId = new ObjectId().toString();
      const originalCandidate = 'Original Candidate';
      const newCandidate = 'New Candidate';

      // First vote
      const firstVoteId = await voteRepository.upsert({ user_id: userId, name: originalCandidate });
      
      // Update vote
      const secondVoteId = await voteRepository.upsert({ user_id: userId, name: newCandidate });

      expect(firstVoteId).toBe(secondVoteId); // Should be same document ID

      const vote = await voteRepository.getByUser(userId);
      expect(vote).toBeDefined();
      expect(vote?.user_id).toBe(userId);
      expect(vote?.name).toBe(newCandidate); // Should be updated
      expect(vote?.updated_at.getTime()).toBeGreaterThan(vote?.created_at.getTime() || 0);
    });

    it('should throw error when invalid ObjectId is provided', async () => {
      const invalidUserId = 'invalid-object-id';
      const candidateName = 'Test Candidate';

      await expect(
        voteRepository.upsert({ user_id: invalidUserId, name: candidateName })
      ).rejects.toThrow('invalid userId');
    });

    it('should handle empty candidate name', async () => {
      const userId = new ObjectId().toString();
      const emptyCandidateName = '';

      const voteId = await voteRepository.upsert({ user_id: userId, name: emptyCandidateName });

      expect(voteId).toBeDefined();

      const vote = await voteRepository.getByUser(userId);
      expect(vote?.name).toBe('');
    });

    it('should handle special characters in candidate name', async () => {
      const userId = new ObjectId().toString();
      const specialName = 'Candidate with "Special" Characters & Symbols!';

      const voteId = await voteRepository.upsert({ user_id: userId, name: specialName });

      expect(voteId).toBeDefined();

      const vote = await voteRepository.getByUser(userId);
      expect(vote?.name).toBe(specialName);
    });

    it('should set created_at only on insert, update updated_at on both insert and update', async () => {
      const userId = new ObjectId().toString();

      // First insert
      await voteRepository.upsert({ user_id: userId, name: 'Candidate 1' });
      const firstVote = await voteRepository.getByUser(userId);
      const originalCreatedAt = firstVote?.created_at;
      const originalUpdatedAt = firstVote?.updated_at;

      // Small delay to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 50));

      // Update
      await voteRepository.upsert({ user_id: userId, name: 'Candidate 2' });
      const updatedVote = await voteRepository.getByUser(userId);

      expect(updatedVote?.created_at).toEqual(originalCreatedAt); // Should remain same
      expect(updatedVote?.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt?.getTime() || 0); // Should be updated
    });
  });
});