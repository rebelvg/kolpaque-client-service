import { MongoCollections } from '../mongo';

export async function up(): Promise<void> {
  const youtubeCollection = MongoCollections.youtube;

  await youtubeCollection.createIndex(
    {
      endpoint: 1,
      params: 1,
    },
    { unique: true }
  );
}
