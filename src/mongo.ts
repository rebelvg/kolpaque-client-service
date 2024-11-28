import { MongoClient, Db, Collection } from 'mongodb';

import { DB_URI } from './config';

export interface IMigration {
  name: string;
  timeCreated: Date;
}

export interface IYoutubeCollection {
  endpoint: string;
  params: string;
  data: any | null;
  ip: string;
  createdDate: Date;
  expireDate: Date;
}

export interface ISyncCollection {
  id: string;
  channels: any;
  userId: string;
  ipCreated: string;
  ipUpdated: string;
  createdDate: Date;
  updateDate: Date;
}

let mongoClientDb: Db;

export async function connectMongoDriver(): Promise<MongoClient> {
  const client = await MongoClient.connect(DB_URI);

  mongoClientDb = client.db();

  return client;
}

export class MongoCollections {
  public static getCollection<T>(name: string): Collection<T> {
    return mongoClientDb.collection<T>(name);
  }

  public static get Migrations(): Collection<IMigration> {
    return mongoClientDb.collection<IMigration>('migrations');
  }

  public static get Youtube(): Collection<IYoutubeCollection> {
    return mongoClientDb.collection<IYoutubeCollection>('youtube');
  }

  public static get Sync(): Collection<ISyncCollection> {
    return mongoClientDb.collection<ISyncCollection>('sync');
  }
}
