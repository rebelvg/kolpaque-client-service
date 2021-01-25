import { MongoCollections } from '../src/mongo';

export async function up(): Promise<void> {
  const { Youtube } = MongoCollections;

  await Youtube.createIndex(
    {
      expireDate: 1,
    },
    { expireAfterSeconds: 0 },
  );
}
