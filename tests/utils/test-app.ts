import express from 'express';
import jwt from 'jsonwebtoken';
import { DatabaseHelper } from './database-helper';
import { MockFactories } from './mock-factories';
import { UserRepositoryImpl } from '../../src/repository/user-repository';
import { VoteRepositoryImpl } from '../../src/repository/vote-repository';
import { AdminUsecaseImpl } from '../../src/usecase/admin-usecase';
import { AuthUsecaseImpl } from '../../src/usecase/auth-usecase';
import { VoteUsecaseImpl } from '../../src/usecase/vote-usecase';
import { createAdminRouter } from '../../src/router/admin-router';
import createAuthRouter from '../../src/router/auth-router';
import { createVoteRouter } from '../../src/router/vote-router';
import { authMiddleware, userTypeMiddleware } from '../../src/middleware/auth';
import { AuthConfig, JWTClaims } from '../../src/entity/auth';

export class TestApp {
  public app: express.Express;
  public authConfig: AuthConfig;
  public userRepo: UserRepositoryImpl;
  public voteRepo: VoteRepositoryImpl;

  constructor() {
    this.authConfig = MockFactories.createAuthConfig({
      jwtSecret: 'test-secret-key',
      accessTokenDuration: 24,
      adminUsername: 'admin',
      adminPassword: 'admin123',
      saltRounds: 10
    });

    const db = DatabaseHelper.getDb();
    this.userRepo = new UserRepositoryImpl(db);
    this.voteRepo = new VoteRepositoryImpl(db);

    const adminUc = new AdminUsecaseImpl(this.authConfig, this.userRepo, this.voteRepo);
    const authUc = new AuthUsecaseImpl(this.authConfig, this.userRepo);
    const voteUc = new VoteUsecaseImpl(this.voteRepo);

    const authMw = authMiddleware(this.authConfig.jwtSecret);
    const adminMw = userTypeMiddleware('ADMIN');
    const userMw = userTypeMiddleware('USER');

    this.app = express();
    this.app.use(express.json());

    this.app.use('/auth', createAuthRouter(this.authConfig, authMw, authUc));
    this.app.use('/admin', authMw, adminMw, createAdminRouter(adminUc));
    this.app.use('/vote', authMw, userMw, createVoteRouter(voteUc));
  }

  generateUserToken(userId: string): string {
    const claims = MockFactories.createJWTClaims({
      sub: userId,
      utyp: 'USER'
    });
    return jwt.sign(claims, this.authConfig.jwtSecret);
  }

  generateAdminToken(): string {
    const claims = MockFactories.createJWTClaims({
      sub: 'admin',
      utyp: 'ADMIN'
    });
    return jwt.sign(claims, this.authConfig.jwtSecret);
  }

  async createTestUser(username?: string): Promise<{ user: any; token: string }> {
    const userData = MockFactories.createUserRequest({
      username: username || 'testuser',
      password: '$2b$10$hashedPassword',
      first_password: 'plainPassword'
    });

    const user = await this.userRepo.create(userData);
    const token = this.generateUserToken(user.id);

    return { user, token };
  }

  static async create(): Promise<TestApp> {
    await DatabaseHelper.connect();
    return new TestApp();
  }

  async cleanup(): Promise<void> {
    await DatabaseHelper.clearCollections();
  }
}