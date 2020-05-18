import axios from 'axios';
import { youtube } from './config';
import { MongoCollections } from './mongo';

const MINUTE_IN_MILLISECONDS = 60 * 1000;

export interface IYoutubeChannels {
  items: Array<{ id: string }>;
}

export interface IYoutubeStreams {
  items: any[];
}

class YoutubeClient {
  private baseUrl = 'https://www.googleapis.com/youtube/v3';

  public async getChannels(channelName: string): Promise<IYoutubeChannels> {
    const cacheData = await MongoCollections.youtube.findOne({
      endpoint: 'channels',
    });

    if (cacheData) {
      return cacheData.data;
    }

    const url = new URL(`${this.baseUrl}/channels`);

    url.searchParams.set('forUsername', channelName);
    url.searchParams.set('part', 'id');
    url.searchParams.set('key', youtube.apiKey);

    const { data } = await axios.get<IYoutubeChannels>(url.href);

    await MongoCollections.youtube.insertOne({
      endpoint: 'channels',
      data,
      createdDate: new Date(),
      expireDate: new Date(new Date().getTime() + 60 * MINUTE_IN_MILLISECONDS),
    });

    return data;
  }

  public async getStreams(channelId: string): Promise<IYoutubeStreams> {
    const cacheData = await MongoCollections.youtube.findOne({
      endpoint: 'search',
    });

    if (cacheData) {
      return cacheData.data;
    }

    const url = new URL(`${this.baseUrl}/search`);

    url.searchParams.set('channelId', channelId);
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('type', 'video');
    url.searchParams.set('eventType', 'live');
    url.searchParams.set('key', youtube.apiKey);

    const { data } = await axios.get<IYoutubeStreams>(url.href);

    await MongoCollections.youtube.insertOne({
      endpoint: 'search',
      data,
      createdDate: new Date(),
      expireDate: new Date(new Date().getTime() + 60 * MINUTE_IN_MILLISECONDS),
    });

    return data;
  }
}

export const youtubeClient = new YoutubeClient();
