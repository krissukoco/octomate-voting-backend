import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AuthUsecaseImpl } from '../../../src/usecase/auth-usecase';
import { MockUserRepository } from '../../utils/mock-repositories';
import { MockFactories } from '../../utils/mock-factories';
import { AppError } from '../../../src/entity/error';

// Mock bcrypt
jest.mock('bcrypt');
const mockBcrypt = bcrypt as any;

// Mock jsonwebtoken
jest.mock('jsonwebtoken');
const mockJwt = jwt as any;

describe('AuthUsecaseImpl', () => {
  let authUsecase: AuthUsecaseImpl;
  let mockUserRepo: MockUserRepository;
  let authConfig: any;

  beforeEach(() => {
    mockUserRepo = new MockUserRepository();
    authConfig = MockFactories.createAuthConfig({
      jwtSecret: 'test-secret',
      accessTokenDuration: 24,
      adminUsername: 'admin',
      adminPassword: 'admin123'
    });
    
    authUsecase = new AuthUsecaseImpl(authConfig, mockUserRepo);
    
    jest.clearAllMocks();
  });

  describe('loginUser', () => {
    it('should return login response when credentials are valid', async () => {
      const username = 'testuser';
      const password = 'plainPassword';
      const hashedPassword = '$2b$10$hashedPassword';
      
      const user = MockFactories.createUser({
        id: 'user123',
        username,
        password: hashedPassword
      });

      mockUserRepo.mockFirstByUsernameImplementation(async () => user);
      mockBcrypt.compare.mockResolvedValue(true);
      mockJwt.sign.mockReturnValue('mocked-jwt-token');

      const result = await authUsecase.loginUser(username, password);

      expect(result.accessToken).toBe('mocked-jwt-token');
      expect(result.validUntil).toBeInstanceOf(Date);
      
      mockUserRepo.expectFirstByUsernameCalled(username);
      expect(mockBcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
      expect(mockJwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'user123',
          aud: 'octomate-voting-backend',
          iss: 'octomate-voting-backend',
          utyp: 'USER'
        }),
        'test-secret'
      );
    });

    it('should throw AppError when user does not exist', async () => {
      const username = 'nonexistent';
      const password = 'anypassword';

      mockUserRepo.mockFirstByUsernameImplementation(async () => null);

      await expect(authUsecase.loginUser(username, password)).rejects.toThrow(AppError);
      await expect(authUsecase.loginUser(username, password)).rejects.toThrow('Invalid Credentials');

      mockUserRepo.expectFirstByUsernameCalled(username);
      expect(mockBcrypt.compare).not.toHaveBeenCalled();
      expect(mockJwt.sign).not.toHaveBeenCalled();
    });

    it('should throw AppError when password is incorrect', async () => {
      const username = 'testuser';
      const password = 'wrongpassword';
      const hashedPassword = '$2b$10$hashedPassword';
      
      const user = MockFactories.createUser({
        username,
        password: hashedPassword
      });

      mockUserRepo.mockFirstByUsernameImplementation(async () => user);
      mockBcrypt.compare.mockResolvedValue(false);

      await expect(authUsecase.loginUser(username, password)).rejects.toThrow(AppError);
      await expect(authUsecase.loginUser(username, password)).rejects.toThrow('Invalid Credentials');

      mockUserRepo.expectFirstByUsernameCalled(username);
      expect(mockBcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
      expect(mockJwt.sign).not.toHaveBeenCalled();
    });

    it('should throw AppError when bcrypt comparison fails', async () => {
      const username = 'testuser';
      const password = 'plainPassword';
      const user = MockFactories.createUser({ username });

      mockUserRepo.mockFirstByUsernameImplementation(async () => user);
      mockBcrypt.compare.mockRejectedValue(new Error('Bcrypt error'));

      await expect(authUsecase.loginUser(username, password)).rejects.toThrow(AppError);
      await expect(authUsecase.loginUser(username, password)).rejects.toThrow('Invalid Credentials');

      mockUserRepo.expectFirstByUsernameCalled(username);
    });

    it('should generate JWT with correct claims and expiration', async () => {
      const username = 'testuser';
      const password = 'plainPassword';
      const user = MockFactories.createUser({
        id: 'user123',
        username
      });

      mockUserRepo.mockFirstByUsernameImplementation(async () => user);
      mockBcrypt.compare.mockResolvedValue(true);
      mockJwt.sign.mockReturnValue('mocked-jwt-token');

      const beforeLogin = Date.now();
      const result = await authUsecase.loginUser(username, password);
      const afterLogin = Date.now();

      expect(mockJwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'user123',
          aud: 'octomate-voting-backend',
          iss: 'octomate-voting-backend',
          utyp: 'USER',
          exp: expect.any(Number),
          iat: expect.any(Number),
          nbf: expect.any(Number),
          jti: ''
        }),
        'test-secret'
      );

      // Verify expiration is approximately 24 hours from now
      const expectedExpiration = beforeLogin + 24 * 3600 * 1000;
      const actualExpiration = result.validUntil.getTime();
      expect(Math.abs(actualExpiration - expectedExpiration)).toBeLessThan(5000); // Within 5 seconds
    });
  });

  describe('loginAdmin', () => {
    it('should return login response when admin credentials are correct', async () => {
      const username = 'admin';
      const password = 'admin123';

      mockJwt.sign.mockReturnValue('admin-jwt-token');

      const result = await authUsecase.loginAdmin(username, password);

      expect(result.accessToken).toBe('admin-jwt-token');
      expect(result.validUntil).toBeInstanceOf(Date);
      
      expect(mockJwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'admin',
          aud: 'octomate-voting-backend',
          iss: 'octomate-voting-backend',
          utyp: 'ADMIN'
        }),
        'test-secret'
      );
    });

    it('should throw AppError when admin username is incorrect', async () => {
      const username = 'wrongadmin';
      const password = 'admin123';

      await expect(authUsecase.loginAdmin(username, password)).rejects.toThrow(AppError);
      await expect(authUsecase.loginAdmin(username, password)).rejects.toThrow('Invalid Credentials');

      expect(mockJwt.sign).not.toHaveBeenCalled();
    });

    it('should throw AppError when admin password is incorrect', async () => {
      const username = 'admin';
      const password = 'wrongpassword';

      await expect(authUsecase.loginAdmin(username, password)).rejects.toThrow(AppError);
      await expect(authUsecase.loginAdmin(username, password)).rejects.toThrow('Invalid Credentials');

      expect(mockJwt.sign).not.toHaveBeenCalled();
    });

    it('should use admin credentials from config', async () => {
      const customConfig = MockFactories.createAuthConfig({
        adminUsername: 'superadmin',
        adminPassword: 'secret123'
      });
      const customAuthUsecase = new AuthUsecaseImpl(customConfig, mockUserRepo);

      mockJwt.sign.mockReturnValue('custom-admin-token');

      const result = await customAuthUsecase.loginAdmin('superadmin', 'secret123');

      expect(result.accessToken).toBe('custom-admin-token');
      expect(mockJwt.sign).toHaveBeenCalled();
    });

    it('should generate JWT with admin claims', async () => {
      const username = 'admin';
      const password = 'admin123';

      mockJwt.sign.mockReturnValue('admin-jwt-token');

      await authUsecase.loginAdmin(username, password);

      expect(mockJwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'admin',
          utyp: 'ADMIN'
        }),
        'test-secret'
      );
    });
  });

  describe('getUser', () => {
    it('should return user when user exists', async () => {
      const userId = 'user123';
      const expectedUser = MockFactories.createUser({
        id: userId,
        username: 'testuser'
      });

      mockUserRepo.mockFirstImplementation(async () => expectedUser);

      const result = await authUsecase.getUser(userId);

      expect(result).toEqual(expectedUser);
      mockUserRepo.expectFirstCalled(userId);
    });

    it('should return null when user does not exist', async () => {
      const userId = 'nonexistent';

      mockUserRepo.mockFirstImplementation(async () => null);

      const result = await authUsecase.getUser(userId);

      expect(result).toBeNull();
      mockUserRepo.expectFirstCalled(userId);
    });

    it('should delegate to user repository correctly', async () => {
      const userId = 'user456';
      
      mockUserRepo.mockFirstImplementation(async (id) => {
        if (id === userId) {
          return MockFactories.createUser({ id: userId });
        }
        return null;
      });

      const result = await authUsecase.getUser(userId);

      expect(result?.id).toBe(userId);
      mockUserRepo.expectFirstCalled(userId);
    });
  });

  describe('JWT token generation', () => {
    it('should use correct access token duration from config', async () => {
      const customConfig = MockFactories.createAuthConfig({
        accessTokenDuration: 48 // 48 hours instead of 24
      });
      const customAuthUsecase = new AuthUsecaseImpl(customConfig, mockUserRepo);
      
      const user = MockFactories.createUser();
      mockUserRepo.mockFirstByUsernameImplementation(async () => user);
      mockBcrypt.compare.mockResolvedValue(true);
      mockJwt.sign.mockReturnValue('token');

      const beforeLogin = Date.now();
      const result = await customAuthUsecase.loginUser('testuser', 'password');

      const expectedExpiration = beforeLogin + 48 * 3600 * 1000;
      const actualExpiration = result.validUntil.getTime();
      expect(Math.abs(actualExpiration - expectedExpiration)).toBeLessThan(5000);
    });

    it('should use correct JWT secret from config', async () => {
      const customConfig = MockFactories.createAuthConfig({
        jwtSecret: 'custom-secret-key'
      });
      const customAuthUsecase = new AuthUsecaseImpl(customConfig, mockUserRepo);
      
      mockJwt.sign.mockReturnValue('token-with-custom-secret');

      await customAuthUsecase.loginAdmin('admin', 'admin123');

      expect(mockJwt.sign).toHaveBeenCalledWith(
        expect.any(Object),
        'custom-secret-key'
      );
    });

    it('should generate different tokens for user and admin', async () => {
      const user = MockFactories.createUser({ id: 'user123' });
      mockUserRepo.mockFirstByUsernameImplementation(async () => user);
      mockBcrypt.compare.mockResolvedValue(true);
      
      mockJwt.sign
        .mockReturnValueOnce('user-token')
        .mockReturnValueOnce('admin-token');

      const userResult = await authUsecase.loginUser('testuser', 'password');
      const adminResult = await authUsecase.loginAdmin('admin', 'admin123');

      expect(userResult.accessToken).toBe('user-token');
      expect(adminResult.accessToken).toBe('admin-token');

      expect(mockJwt.sign).toHaveBeenNthCalledWith(1, 
        expect.objectContaining({ sub: 'user123', utyp: 'USER' }), 
        expect.any(String)
      );
      expect(mockJwt.sign).toHaveBeenNthCalledWith(2, 
        expect.objectContaining({ sub: 'admin', utyp: 'ADMIN' }), 
        expect.any(String)
      );
    });
  });
});