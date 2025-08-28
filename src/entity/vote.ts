import { BaseCreate, BaseEntity } from "./common";

export type Vote = BaseEntity & {
  user_id: string;
  name: string;
}

export type UpsertVoteRequest = BaseCreate<Vote>;

export type VoteSummary = {
  winner: string|null;
  count: number;
  list: VoteSummaryEntry[];
}

export type VoteSummaryEntry = {
  name: string;
  count: number;
  percentage: number;
}