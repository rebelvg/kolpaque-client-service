import { MongoCollections } from '../src/mongo';

export async function up(): Promise<void> {
  const { Youtube } = MongoCollections;

  await Youtube.createIndex(
    {
      endpoint: 1,
      params: 1,
    },
    { unique: true },
  );
}
