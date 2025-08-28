import { VoteUsecaseImpl } from '../../../src/usecase/vote-usecase';
import { MockVoteRepository } from '../../utils/mock-repositories';
import { MockFactories } from '../../utils/mock-factories';

describe('VoteUsecaseImpl', () => {
  let voteUsecase: VoteUsecaseImpl;
  let mockVoteRepo: MockVoteRepository;

  beforeEach(() => {
    mockVoteRepo = new MockVoteRepository();
    voteUsecase = new VoteUsecaseImpl(mockVoteRepo);
    
    jest.clearAllMocks();
  });

  describe('getCurrentVote', () => {
    it('should return vote when user has voted', async () => {
      const userId = 'user123';
      const expectedVote = MockFactories.createVote({
        user_id: userId,
        name: 'Test Candidate'
      });

      mockVoteRepo.mockGetByUserImplementation(async () => expectedVote);

      const result = await voteUsecase.getCurrentVote(userId);

      expect(result).toEqual(expectedVote);
      mockVoteRepo.expectGetByUserCalled(userId);
    });

    it('should return null when user has not voted', async () => {
      const userId = 'user123';

      mockVoteRepo.mockGetByUserImplementation(async () => null);

      const result = await voteUsecase.getCurrentVote(userId);

      expect(result).toBeNull();
      mockVoteRepo.expectGetByUserCalled(userId);
    });

    it('should delegate to vote repository correctly', async () => {
      const userId = 'user456';
      
      mockVoteRepo.mockGetByUserImplementation(async (id) => {
        if (id === userId) {
          return MockFactories.createVote({ user_id: userId });
        }
        return null;
      });

      const result = await voteUsecase.getCurrentVote(userId);

      expect(result?.user_id).toBe(userId);
      mockVoteRepo.expectGetByUserCalled(userId);
    });

    it('should handle different user IDs correctly', async () => {
      const userId1 = 'user1';
      const userId2 = 'user2';
      
      const vote1 = MockFactories.createVote({ 
        user_id: userId1, 
        name: 'Candidate A' 
      });
      
      mockVoteRepo.mockGetByUserImplementation(async (id) => {
        if (id === userId1) return vote1;
        return null;
      });

      const result1 = await voteUsecase.getCurrentVote(userId1);
      const result2 = await voteUsecase.getCurrentVote(userId2);

      expect(result1).toEqual(vote1);
      expect(result2).toBeNull();
      
      mockVoteRepo.expectGetByUserCalled(userId1);
      mockVoteRepo.expectGetByUserCalled(userId2);
    });
  });

  describe('getOptions', () => {
    it('should return list of available voting options', async () => {
      const expectedOptions = ['Candidate A', 'Candidate B', 'Candidate C'];

      mockVoteRepo.mockGetDistinctNamesImplementation(async () => expectedOptions);

      const result = await voteUsecase.getOptions();

      expect(result).toEqual(expectedOptions);
      mockVoteRepo.expectGetDistinctNamesCalled();
    });

    it('should return empty array when no votes exist', async () => {
      mockVoteRepo.mockGetDistinctNamesImplementation(async () => []);

      const result = await voteUsecase.getOptions();

      expect(result).toEqual([]);
      mockVoteRepo.expectGetDistinctNamesCalled();
    });

    it('should return unique candidate names only', async () => {
      const uniqueOptions = ['Candidate A', 'Candidate B'];

      mockVoteRepo.mockGetDistinctNamesImplementation(async () => uniqueOptions);

      const result = await voteUsecase.getOptions();

      expect(result).toEqual(uniqueOptions);
      expect(result).toHaveLength(2);
      mockVoteRepo.expectGetDistinctNamesCalled();
    });

    it('should delegate to vote repository correctly', async () => {
      const mockOptions = ['Option 1', 'Option 2', 'Option 3'];
      
      mockVoteRepo.mockGetDistinctNamesImplementation(async () => mockOptions);

      await voteUsecase.getOptions();

      mockVoteRepo.expectGetDistinctNamesCalled();
    });

    it('should handle repository errors', async () => {
      mockVoteRepo.mockGetDistinctNamesImplementation(async () => {
        throw new Error('Repository error');
      });

      await expect(voteUsecase.getOptions()).rejects.toThrow('Repository error');
      mockVoteRepo.expectGetDistinctNamesCalled();
    });
  });

  describe('vote', () => {
    it('should create new vote and return vote ID', async () => {
      const userId = 'user123';
      const candidateName = 'Test Candidate';
      const expectedVoteId = 'vote456';

      mockVoteRepo.mockUpsertImplementation(async () => expectedVoteId);

      const result = await voteUsecase.vote(userId, candidateName);

      expect(result).toBe(expectedVoteId);
      mockVoteRepo.expectUpsertCalled({
        user_id: userId,
        name: candidateName
      });
    });

    it('should update existing vote when user changes their choice', async () => {
      const userId = 'user123';
      const newCandidateName = 'Different Candidate';
      const expectedVoteId = 'vote456';

      mockVoteRepo.mockUpsertImplementation(async () => expectedVoteId);

      const result = await voteUsecase.vote(userId, newCandidateName);

      expect(result).toBe(expectedVoteId);
      mockVoteRepo.expectUpsertCalled({
        user_id: userId,
        name: newCandidateName
      });
    });

    it('should handle different user IDs and candidate names', async () => {
      const testCases = [
        { userId: 'user1', candidateName: 'Candidate A', voteId: 'vote1' },
        { userId: 'user2', candidateName: 'Candidate B', voteId: 'vote2' },
        { userId: 'user3', candidateName: 'Candidate A', voteId: 'vote3' }
      ];

      for (const testCase of testCases) {
        mockVoteRepo.mockUpsertImplementation(async (data) => {
          if (data.user_id === testCase.userId && data.name === testCase.candidateName) {
            return testCase.voteId;
          }
          throw new Error('Unexpected call');
        });

        const result = await voteUsecase.vote(testCase.userId, testCase.candidateName);

        expect(result).toBe(testCase.voteId);
        mockVoteRepo.expectUpsertCalled({
          user_id: testCase.userId,
          name: testCase.candidateName
        });
      }
    });

    it('should handle empty candidate name', async () => {
      const userId = 'user123';
      const emptyCandidateName = '';
      const expectedVoteId = 'vote456';

      mockVoteRepo.mockUpsertImplementation(async () => expectedVoteId);

      const result = await voteUsecase.vote(userId, emptyCandidateName);

      expect(result).toBe(expectedVoteId);
      mockVoteRepo.expectUpsertCalled({
        user_id: userId,
        name: emptyCandidateName
      });
    });

    it('should handle special characters in candidate name', async () => {
      const userId = 'user123';
      const specialCandidateName = 'Candidate with "Special" Characters & Symbols!';
      const expectedVoteId = 'vote456';

      mockVoteRepo.mockUpsertImplementation(async () => expectedVoteId);

      const result = await voteUsecase.vote(userId, specialCandidateName);

      expect(result).toBe(expectedVoteId);
      mockVoteRepo.expectUpsertCalled({
        user_id: userId,
        name: specialCandidateName
      });
    });

    it('should delegate to vote repository with correct parameters', async () => {
      const userId = 'user789';
      const candidateName = 'My Candidate';
      const voteId = 'vote123';

      mockVoteRepo.mockUpsertImplementation(async (data) => {
        expect(data.user_id).toBe(userId);
        expect(data.name).toBe(candidateName);
        return voteId;
      });

      const result = await voteUsecase.vote(userId, candidateName);

      expect(result).toBe(voteId);
      mockVoteRepo.expectUpsertCalled({
        user_id: userId,
        name: candidateName
      });
    });

    it('should handle repository errors', async () => {
      const userId = 'user123';
      const candidateName = 'Test Candidate';

      mockVoteRepo.mockUpsertImplementation(async () => {
        throw new Error('Repository upsert error');
      });

      await expect(voteUsecase.vote(userId, candidateName)).rejects.toThrow('Repository upsert error');
      mockVoteRepo.expectUpsertCalled({
        user_id: userId,
        name: candidateName
      });
    });

    it('should return different vote IDs for different operations', async () => {
      mockVoteRepo.mockUpsertImplementation(async (data) => {
        return `vote_${data.user_id}_${data.name.replace(/\s+/g, '_').toLowerCase()}`;
      });

      const result1 = await voteUsecase.vote('user1', 'Candidate A');
      const result2 = await voteUsecase.vote('user2', 'Candidate B');
      const result3 = await voteUsecase.vote('user1', 'Candidate B');

      expect(result1).toBe('vote_user1_candidate_a');
      expect(result2).toBe('vote_user2_candidate_b');
      expect(result3).toBe('vote_user1_candidate_b');
      
      expect(result1).not.toBe(result2);
      expect(result1).not.toBe(result3);
    });
  });
});