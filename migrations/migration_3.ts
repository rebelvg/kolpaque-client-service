import { MongoCollections } from '../src/mongo';

export async function up(): Promise<void> {
  const { Youtube } = MongoCollections;

  await Youtube.dropIndex('expireDate');
}
