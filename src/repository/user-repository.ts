import { Collection, Db, ObjectId, WithId } from "mongodb";
import { PaginatedResponse } from "../entity/common";
import { CreateUserRequest, User } from "../entity/user";

export abstract class UserRepository {
  abstract first(id: string): Promise<User|null>;
  abstract firstByUsername(username: string): Promise<User|null>;
  abstract find(page: number, size: number): Promise<PaginatedResponse<User>>;
  abstract create(data: CreateUserRequest): Promise<User>;
}

type UserDocument = {
  _id?: ObjectId,
  username: string,
  password: string,
  first_password: string,
  created_at: Date,
  updated_at: Date,
}

export class UserRepositoryImpl extends UserRepository {
  private collection: Collection<UserDocument>;

  constructor(db : Db) {
    super();
    this.collection = db.collection('users');
  }

  async first(id: string): Promise<User | null> {
    if (!ObjectId.isValid(id)) {
      return null;
    }
    const objId = new ObjectId(id);

    const doc = await this.collection.findOne({ _id: objId });
    if (!doc) {
      return null;
    }
    return docToUser(doc);
  }

  async firstByUsername(username: string): Promise<User | null> {
    const doc = await this.collection.findOne<UserDocument>({ username });
    if (!doc) {
      return null;
    }
    return docToUser(doc);
  }

  async find(page: number, size: number): Promise<PaginatedResponse<User>> {
    if (!page || page < 0) {
      page = 1
    }
    if (!size || size < 0) {
      size = 10
    }
    const count = await this.collection.countDocuments({});
    const limit = size;
    const skip = (page-1)*size;

    const docs = await this.collection
      .find<UserDocument>({})
      .sort({ created_at: 1 })
      .skip(skip)
      .limit(limit)
      .toArray();
    const list = docs.map(v => docToUser(v));
    return {
      list,
      pagination: {
        page,
        size,
        total: count,
        last_page: Math.ceil(count/size),
      }
    }
  }

  async create(data: CreateUserRequest): Promise<User> {
    const now = new Date();
    const res = await this.collection.insertOne({
      ...data,
      created_at: now,
      updated_at: now,
    })
    const user = await this.collection.findOne({ _id: res.insertedId });
    if (!user) {
      throw new Error('Error getting user after insert');
    }
    return docToUser(user);
  }
}

function docToUser(doc: UserDocument): User {
  return {
    id: doc._id?.toString() ?? '',
    username: doc.username,
    password: doc.password,
    first_password: doc.first_password,
    created_at: doc.created_at,
    updated_at: doc.updated_at,
  }
}