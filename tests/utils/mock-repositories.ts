import { UserRepository } from '../../src/repository/user-repository';
import { VoteRepository } from '../../src/repository/vote-repository';
import { User, CreateUserRequest } from '../../src/entity/user';
import { Vote, UpsertVoteRequest, VoteSummary } from '../../src/entity/vote';
import { PaginatedResponse } from '../../src/entity/common';

export class MockUserRepository extends UserRepository {
  private mockFirst = jest.fn();
  private mockFirstByUsername = jest.fn();
  private mockFind = jest.fn();
  private mockCreate = jest.fn();

  async first(id: string): Promise<User | null> {
    return this.mockFirst(id);
  }

  async firstByUsername(username: string): Promise<User | null> {
    return this.mockFirstByUsername(username);
  }

  async find(page: number, size: number): Promise<PaginatedResponse<User>> {
    return this.mockFind(page, size);
  }

  async create(data: CreateUserRequest): Promise<User> {
    return this.mockCreate(data);
  }

  // Jest mock methods for testing
  mockFirstImplementation(implementation: (id: string) => Promise<User | null>) {
    this.mockFirst.mockImplementation(implementation);
    return this;
  }

  mockFirstByUsernameImplementation(implementation: (username: string) => Promise<User | null>) {
    this.mockFirstByUsername.mockImplementation(implementation);
    return this;
  }

  mockFindImplementation(implementation: (page: number, size: number) => Promise<PaginatedResponse<User>>) {
    this.mockFind.mockImplementation(implementation);
    return this;
  }

  mockCreateImplementation(implementation: (data: CreateUserRequest) => Promise<User>) {
    this.mockCreate.mockImplementation(implementation);
    return this;
  }

  expectFirstCalled(id: string) {
    expect(this.mockFirst).toHaveBeenCalledWith(id);
    return this;
  }

  expectFirstByUsernameCalled(username: string) {
    expect(this.mockFirstByUsername).toHaveBeenCalledWith(username);
    return this;
  }

  expectFindCalled(page: number, size: number) {
    expect(this.mockFind).toHaveBeenCalledWith(page, size);
    return this;
  }

  expectCreateCalled(data: CreateUserRequest) {
    expect(this.mockCreate).toHaveBeenCalledWith(data);
    return this;
  }
}

export class MockVoteRepository extends VoteRepository {
  private mockGetDistinctNames = jest.fn();
  private mockGetByUser = jest.fn();
  private mockGetSummary = jest.fn();
  private mockUpsert = jest.fn();

  async getDistinctNames(): Promise<string[]> {
    return this.mockGetDistinctNames();
  }

  async getByUser(userId: string): Promise<Vote | null> {
    return this.mockGetByUser(userId);
  }

  async getSummary(): Promise<VoteSummary> {
    return this.mockGetSummary();
  }

  async upsert(data: UpsertVoteRequest): Promise<string> {
    return this.mockUpsert(data);
  }

  // Jest mock methods for testing
  mockGetDistinctNamesImplementation(implementation: () => Promise<string[]>) {
    this.mockGetDistinctNames.mockImplementation(implementation);
    return this;
  }

  mockGetByUserImplementation(implementation: (userId: string) => Promise<Vote | null>) {
    this.mockGetByUser.mockImplementation(implementation);
    return this;
  }

  mockGetSummaryImplementation(implementation: () => Promise<VoteSummary>) {
    this.mockGetSummary.mockImplementation(implementation);
    return this;
  }

  mockUpsertImplementation(implementation: (data: UpsertVoteRequest) => Promise<string>) {
    this.mockUpsert.mockImplementation(implementation);
    return this;
  }

  expectGetDistinctNamesCalled() {
    expect(this.mockGetDistinctNames).toHaveBeenCalled();
    return this;
  }

  expectGetByUserCalled(userId: string) {
    expect(this.mockGetByUser).toHaveBeenCalledWith(userId);
    return this;
  }

  expectGetSummaryCalled() {
    expect(this.mockGetSummary).toHaveBeenCalled();
    return this;
  }

  expectUpsertCalled(data: UpsertVoteRequest) {
    expect(this.mockUpsert).toHaveBeenCalledWith(data);
    return this;
  }
}