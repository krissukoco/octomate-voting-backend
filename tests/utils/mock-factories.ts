import { ObjectId } from 'mongodb';
import { User, CreateUserRequest } from '../../src/entity/user';
import { Vote, UpsertVoteRequest, VoteSummary, VoteSummaryEntry } from '../../src/entity/vote';
import { AuthConfig, LoginResponse, JWTClaims } from '../../src/entity/auth';

export class MockFactories {
  static createUser(overrides?: Partial<User>): User {
    const now = new Date();
    return {
      id: new ObjectId().toString(),
      username: 'testuser',
      password: '$2b$10$hashedPassword',
      first_password: 'plainPassword',
      created_at: now,
      updated_at: now,
      ...overrides
    };
  }

  static createUserRequest(overrides?: Partial<CreateUserRequest>): CreateUserRequest {
    return {
      username: 'testuser',
      password: '$2b$10$hashedPassword',
      first_password: 'plainPassword',
      ...overrides
    };
  }

  static createVote(overrides?: Partial<Vote>): Vote {
    const now = new Date();
    return {
      id: new ObjectId().toString(),
      user_id: new ObjectId().toString(),
      name: 'Test Candidate',
      created_at: now,
      updated_at: now,
      ...overrides
    };
  }

  static createUpsertVoteRequest(overrides?: Partial<UpsertVoteRequest>): UpsertVoteRequest {
    return {
      user_id: new ObjectId().toString(),
      name: 'Test Candidate',
      ...overrides
    };
  }

  static createVoteSummaryEntry(overrides?: Partial<VoteSummaryEntry>): VoteSummaryEntry {
    return {
      name: 'Test Candidate',
      count: 5,
      percentage: 50.0,
      ...overrides
    };
  }

  static createVoteSummary(overrides?: Partial<VoteSummary>): VoteSummary {
    return {
      winner: 'Test Candidate',
      count: 10,
      list: [
        this.createVoteSummaryEntry({ name: 'Test Candidate', count: 6, percentage: 60.0 }),
        this.createVoteSummaryEntry({ name: 'Other Candidate', count: 4, percentage: 40.0 })
      ],
      ...overrides
    };
  }

  static createAuthConfig(overrides?: Partial<AuthConfig>): AuthConfig {
    return {
      jwtSecret: 'test-jwt-secret',
      accessTokenDuration: 24,
      adminUsername: 'admin',
      adminPassword: 'admin123',
      saltRounds: 10,
      ...overrides
    };
  }

  static createLoginResponse(overrides?: Partial<LoginResponse>): LoginResponse {
    return {
      accessToken: 'mock-jwt-token',
      validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
      ...overrides
    };
  }

  static createJWTClaims(overrides?: Partial<JWTClaims>): JWTClaims {
    const now = Math.floor(Date.now() / 1000);
    return {
      sub: new ObjectId().toString(),
      aud: 'octomate-voting-backend',
      iss: 'octomate-voting-backend',
      exp: now + 24 * 3600,
      nbf: now,
      iat: now,
      jti: '',
      utyp: 'USER',
      ...overrides
    };
  }
}