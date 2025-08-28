import bcrypt from 'bcrypt';
import { AdminUsecaseImpl } from '../../../src/usecase/admin-usecase';
import { MockUserRepository, MockVoteRepository } from '../../utils/mock-repositories';
import { MockFactories } from '../../utils/mock-factories';
import { AppError } from '../../../src/entity/error';

// Mock bcrypt
jest.mock('bcrypt');
const mockBcrypt = bcrypt as any;

// Mock the random utility
jest.mock('../../../src/utils/random', () => ({
  generateRandomString: jest.fn()
}));

import { generateRandomString } from '../../../src/utils/random';
const mockGenerateRandomString = generateRandomString as jest.MockedFunction<typeof generateRandomString>;

describe('AdminUsecaseImpl', () => {
  let adminUsecase: AdminUsecaseImpl;
  let mockUserRepo: MockUserRepository;
  let mockVoteRepo: MockVoteRepository;
  let authConfig: any;

  beforeEach(() => {
    mockUserRepo = new MockUserRepository();
    mockVoteRepo = new MockVoteRepository();
    authConfig = MockFactories.createAuthConfig({
      saltRounds: 10
    });
    
    adminUsecase = new AdminUsecaseImpl(authConfig, mockUserRepo, mockVoteRepo);
    
    jest.clearAllMocks();
  });

  describe('getUsers', () => {
    it('should delegate to user repository and return paginated users', async () => {
      const expectedResult = {
        list: [
          MockFactories.createUser({ username: 'user1' }),
          MockFactories.createUser({ username: 'user2' })
        ],
        pagination: {
          page: 1,
          size: 10,
          total: 2,
          last_page: 1
        }
      };

      mockUserRepo.mockFindImplementation(async (page, size) => expectedResult);

      const result = await adminUsecase.getUsers(1, 10);

      expect(result).toEqual(expectedResult);
      mockUserRepo.expectFindCalled(1, 10);
    });

    it('should pass through page and size parameters correctly', async () => {
      const expectedResult = {
        list: [],
        pagination: { page: 2, size: 5, total: 0, last_page: 0 }
      };

      mockUserRepo.mockFindImplementation(async () => expectedResult);

      await adminUsecase.getUsers(2, 5);

      mockUserRepo.expectFindCalled(2, 5);
    });
  });

  describe('getVoteSummary', () => {
    it('should delegate to vote repository and return vote summary', async () => {
      const expectedSummary = MockFactories.createVoteSummary({
        winner: 'Test Candidate',
        count: 100
      });

      mockVoteRepo.mockGetSummaryImplementation(async () => expectedSummary);

      const result = await adminUsecase.getVoteSummary();

      expect(result).toEqual(expectedSummary);
      mockVoteRepo.expectGetSummaryCalled();
    });
  });

  describe('createUser', () => {
    beforeEach(() => {
      mockGenerateRandomString.mockReturnValue('randomPassword123');
      mockBcrypt.hash.mockResolvedValue('$2b$10$hashedRandomPassword');
    });

    it('should create user with generated password when username is available', async () => {
      const username = 'newuser';
      const expectedUser = MockFactories.createUser({
        username,
        password: '$2b$10$hashedRandomPassword',
        first_password: 'randomPassword123'
      });

      mockUserRepo.mockFirstByUsernameImplementation(async () => null); // User doesn't exist
      mockUserRepo.mockCreateImplementation(async (data) => ({
        ...expectedUser,
        username: data.username,
        password: data.password,
        first_password: data.first_password
      }));

      const result = await adminUsecase.createUser(username);

      expect(result.username).toBe(username);
      expect(result.password).toBe('$2b$10$hashedRandomPassword');
      expect(result.first_password).toBe('randomPassword123');
      
      mockUserRepo.expectFirstByUsernameCalled(username);
      mockUserRepo.expectCreateCalled({
        username,
        password: '$2b$10$hashedRandomPassword',
        first_password: 'randomPassword123'
      });

      expect(mockGenerateRandomString).toHaveBeenCalledWith(12);
      expect(mockBcrypt.hash).toHaveBeenCalledWith('randomPassword123', 10);
    });

    it('should throw AppError when username already exists', async () => {
      const username = 'existinguser';
      const existingUser = MockFactories.createUser({ username });

      mockUserRepo.mockFirstByUsernameImplementation(async () => existingUser);

      await expect(adminUsecase.createUser(username)).rejects.toThrow(AppError);
      await expect(adminUsecase.createUser(username)).rejects.toThrow('username already exists');

      mockUserRepo.expectFirstByUsernameCalled(username);
      // Ensure create is never called when user exists
      expect(mockUserRepo['mockCreate']).not.toHaveBeenCalled();
    });

    it('should use correct salt rounds from config', async () => {
      const customAuthConfig = MockFactories.createAuthConfig({ saltRounds: 15 });
      const customAdminUsecase = new AdminUsecaseImpl(customAuthConfig, mockUserRepo, mockVoteRepo);
      
      const username = 'testuser';
      mockUserRepo.mockFirstByUsernameImplementation(async () => null);
      mockUserRepo.mockCreateImplementation(async () => MockFactories.createUser());

      await customAdminUsecase.createUser(username);

      expect(mockBcrypt.hash).toHaveBeenCalledWith('randomPassword123', 15);
    });

    it('should generate random password with correct length', async () => {
      const username = 'testuser';
      mockUserRepo.mockFirstByUsernameImplementation(async () => null);
      mockUserRepo.mockCreateImplementation(async () => MockFactories.createUser());

      await adminUsecase.createUser(username);

      expect(mockGenerateRandomString).toHaveBeenCalledWith(12);
    });

    it('should handle bcrypt hash failure', async () => {
      const username = 'testuser';
      mockUserRepo.mockFirstByUsernameImplementation(async () => null);
      mockBcrypt.hash.mockRejectedValue(new Error('Hash failed'));

      await expect(adminUsecase.createUser(username)).rejects.toThrow('Hash failed');
      
      mockUserRepo.expectFirstByUsernameCalled(username);
      // Ensure create is never called when hashing fails
      expect(mockUserRepo['mockCreate']).not.toHaveBeenCalled();
    });

    it('should handle repository create failure', async () => {
      const username = 'testuser';
      mockUserRepo.mockFirstByUsernameImplementation(async () => null);
      mockUserRepo.mockCreateImplementation(async () => {
        throw new Error('Database error');
      });

      await expect(adminUsecase.createUser(username)).rejects.toThrow('Database error');
      
      mockUserRepo.expectFirstByUsernameCalled(username);
      expect(mockGenerateRandomString).toHaveBeenCalled();
      expect(mockBcrypt.hash).toHaveBeenCalled();
    });

    it('should create different passwords for different users', async () => {
      mockGenerateRandomString
        .mockReturnValueOnce('password1')
        .mockReturnValueOnce('password2');
      
      mockBcrypt.hash
        .mockResolvedValueOnce('$2b$10$hashed1')
        .mockResolvedValueOnce('$2b$10$hashed2');

      mockUserRepo.mockFirstByUsernameImplementation(async () => null);
      mockUserRepo.mockCreateImplementation(async (data) => MockFactories.createUser({
        username: data.username,
        password: data.password,
        first_password: data.first_password
      }));

      const user1 = await adminUsecase.createUser('user1');
      const user2 = await adminUsecase.createUser('user2');

      expect(user1.first_password).toBe('password1');
      expect(user1.password).toBe('$2b$10$hashed1');
      expect(user2.first_password).toBe('password2');
      expect(user2.password).toBe('$2b$10$hashed2');
    });
  });
});