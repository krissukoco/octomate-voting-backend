import { MongoClient, Db } from 'mongodb';

export class DatabaseHelper {
  private static client: MongoClient | null = null;
  private static db: Db | null = null;

  static async connect(): Promise<Db> {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI environment variable is not set');
    }

    if (!this.client) {
      this.client = new MongoClient(process.env.MONGODB_URI);
      await this.client.connect();
    }

    if (!this.db) {
      this.db = this.client.db('test_db');
    }

    return this.db;
  }

  static async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
    }
  }

  static async clearCollections(): Promise<void> {
    if (!this.db) {
      return;
    }

    const collections = await this.db.listCollections().toArray();
    const promises = collections.map(collection => 
      this.db!.collection(collection.name).deleteMany({})
    );
    
    await Promise.all(promises);
  }

  static getDb(): Db {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first');
    }
    return this.db;
  }
}