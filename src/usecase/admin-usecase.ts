import bcrypt from 'bcrypt';
import { PaginatedResponse } from "../entity/common";
import { AppError } from "../entity/error";
import { User } from "../entity/user";
import { VoteSummary } from "../entity/vote";
import { UserRepository } from "../repository/user-repository";
import { VoteRepository } from "../repository/vote-repository";
import { AuthConfig } from '../entity/auth';
import { generateRandomString } from '../utils/random';

export abstract class AdminUsecase {
  abstract getUsers(page: number, size: number): Promise<PaginatedResponse<User>>;
  abstract createUser(username: string): Promise<User>;
  abstract getVoteSummary(): Promise<VoteSummary>;
}

export class AdminUsecaseImpl extends AdminUsecase {
  constructor(
    private authConfig: AuthConfig,
    private userRepo: UserRepository,
    private voteRepo: VoteRepository,
  ) {
    super();
  }

  async getUsers(page: number, size: number): Promise<PaginatedResponse<User>> {
    return this.userRepo.find(page, size);
  }

  async getVoteSummary(): Promise<VoteSummary> {
    return this.voteRepo.getSummary() ;
  }

  async createUser(username: string): Promise<User> {
    const exs = await this.userRepo.firstByUsername(username);
    if (exs) {
      throw new AppError('INVALID_ARGUMENT', 'username already exists');
    }

    const pwd = generateRandomString(12);
    const hashed = await bcrypt.hash(pwd, this.authConfig.saltRounds);

    return this.userRepo.create({
      username,
      first_password: pwd,
      password: hashed,
    })
  }
}