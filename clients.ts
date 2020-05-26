import axios from 'axios';
import { YOUTUBE } from './config';
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

  public async getChannels(channelName: string, ip: string): Promise<IYoutubeChannels> {
    const { Youtube } = MongoCollections;

    const cacheData = await Youtube.findOne({
      endpoint: 'channels',
      params: channelName,
    });

    if (cacheData) {
      return cacheData.data;
    }

    const url = new URL(`${this.baseUrl}/channels`);

    url.searchParams.set('forUsername', channelName);
    url.searchParams.set('part', 'id');
    url.searchParams.set('key', YOUTUBE.apiKey);

    const { data } = await axios.get<IYoutubeChannels>(url.href);

    await Youtube.insertOne({
      endpoint: 'channels',
      params: channelName,
      data,
      ip,
      createdDate: new Date(),
      expireDate: new Date(new Date().getTime() + 7 * 24 * 60 * MINUTE_IN_MILLISECONDS),
    });

    return data;
  }

  public async getStreams(channelId: string, ip: string): Promise<IYoutubeStreams> {
    const { Youtube } = MongoCollections;

    const cacheData = await Youtube.findOne({
      endpoint: 'search',
      params: channelId,
    });

    if (cacheData) {
      return cacheData.data;
    }

    const url = new URL(`${this.baseUrl}/search`);

    url.searchParams.set('channelId', channelId);
    url.searchParams.set('part', 'snippet');
    url.searchParams.set('type', 'video');
    url.searchParams.set('eventType', 'live');
    url.searchParams.set('key', YOUTUBE.apiKey);

    const { data } = await axios.get<IYoutubeStreams>(url.href);

    await Youtube.insertOne({
      endpoint: 'search',
      params: channelId,
      data,
      ip,
      createdDate: new Date(),
      expireDate: new Date(new Date().getTime() + 60 * MINUTE_IN_MILLISECONDS),
    });

    return data;
  }
}

export const youtubeClient = new YoutubeClient();
