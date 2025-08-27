import { Vote } from "../entity/vote";
import { VoteRepository } from "../repository/vote-repository";

export declare abstract class VoteUsecase {
  abstract getCurrentVote(userId: string): Promise<Vote|null>;
  // vote is upsert, so if user has voted, it will change their vote "name"
  abstract vote(userId: string, name: string): Promise<string>;
}

export class VoteUsecaseImpl extends VoteUsecase {
  constructor(
    private voteRepo: VoteRepository,
  ) {
    super();
  }

  async getCurrentVote(userId: string): Promise<Vote | null> {
    return await this.voteRepo.getByUser(userId)
  }

  async vote(userId: string, name: string): Promise<string> {
    return await this.voteRepo.upsert({ userId, name });
  }
}