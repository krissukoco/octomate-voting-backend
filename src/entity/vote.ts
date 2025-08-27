import { BaseCreate, BaseEntity } from "./common";

export type Vote = BaseEntity & {
  userId: string;
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