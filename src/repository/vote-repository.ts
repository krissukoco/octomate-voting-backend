import { Collection, Db, ObjectId } from "mongodb";
import { UpsertVoteRequest, Vote, VoteSummary, VoteSummaryEntry } from "../entity/vote";

export abstract class VoteRepository {
  abstract getDistinctNames(): Promise<string[]>;
  abstract getByUser(userId: string): Promise<Vote|null>;
  abstract getSummary(): Promise<VoteSummary>;
  abstract upsert(data: UpsertVoteRequest): Promise<string>;
}

type VoteDocument = {
  _id?: ObjectId,
  user_id: ObjectId,
  name: string,
  created_at: Date,
  updated_at: Date,
}

export class VoteRepositoryImpl extends VoteRepository {
  private collection: Collection<VoteDocument>;

  constructor(db: Db) {
    super();
    this.collection = db.collection('votes');
  }

  async getDistinctNames(): Promise<string[]> {
    const arr: string[] = await this.collection.distinct('name');
    return arr;
  }

  async getByUser(userId: string): Promise<Vote | null> {
    if (!ObjectId.isValid(userId)) {
      return null;
    }
    const objId = new ObjectId(userId);
    const doc = await this.collection.findOne({ user_id: objId });
    if (!doc) return null;
    return docToVote(doc);
  }

  async getSummary(): Promise<VoteSummary> {
    const res = await this.collection
      .aggregate<{ name: string, count: number }>([
        {
          $group: {
            _id: '$name',
            count: {
              $sum: 1,
            }
          }
        },
        {
          $sort: { count: -1 },
        },
        {
          $project: {
            _id: 0,
            name: '$_id',
            count: 1,
          }
        }
      ])
      .toArray();
    
    const total = res.reduce((prev, curr) => prev + curr.count, 0);

    const list = res.map((v): VoteSummaryEntry => ({
      name: v.name,
      count: v.count,
      percentage: (v.count / total) * 100,
    }))

    return {
      winner: res[0]?.name ?? null,
      count: total,
      list,
    }
  }

  async upsert(data: UpsertVoteRequest): Promise<string> {
    if (!ObjectId.isValid(data.user_id)) {
      throw new Error('invalid userId');
    }
    const userId = new ObjectId(data.user_id);

    const result = await this.collection.updateOne(
      { user_id: userId },
      {
        $set: {
          name: data.name,
          updated_at: new Date(),
        },
        $setOnInsert: {
          created_at: new Date(),
        }
      },
      { upsert: true },
    );
    let upsertedId = result.upsertedId;
    if (!upsertedId) {
      const doc = await this.collection.findOne({ user_id: userId });
      if (!doc) {
        throw new Error("Error inserting to collection 'votes'");
      }
      upsertedId = doc._id;
    }
    return upsertedId.toString();
  }
}

function docToVote(doc: VoteDocument): Vote {
  return {
    id: doc._id?.toString() ?? '',
    user_id: doc.user_id.toString(),
    name: doc.name,
    created_at: doc.created_at,
    updated_at: doc.updated_at,
  }
}