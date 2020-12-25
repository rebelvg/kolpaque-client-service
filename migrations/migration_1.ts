import { MongoCollections } from '../mongo';

export async function up(): Promise<void> {
  const youtubeCollection = MongoCollections.youtube;

  await youtubeCollection.createIndex(
    {
      expireDate: 1,
    },
    { expireAfterSeconds: 0 },
  );
}
