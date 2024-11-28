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

  public async getChannels(
    channelName: string,
    ip: string,
    accessToken: string,
    forHandle: boolean,
  ): Promise<IYoutubeChannels> {
    const { Youtube } = MongoCollections;

    const cacheData = await Youtube.findOne({
      endpoint: 'channels',
      params: channelName,
    });

    if (cacheData) {
      return cacheData.data;
    }

    const url = new URL(`${this.baseUrl}/channels`);

    if (forHandle) {
      url.searchParams.set('forHandle', channelName);
    } else {
      url.searchParams.set('forUsername', channelName);
    }

    url.searchParams.set('part', 'id');
    url.searchParams.set('key', YOUTUBE.API_KEY);

    const { data } = await axios.get<IYoutubeChannels>(url.href, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    await Youtube.updateOne(
      {
        endpoint: 'channels',
        params: channelName,
      },
      {
        $set: {
          data,
          ip,
          createdDate: new Date(),
          expireDate: new Date(
            new Date().getTime() + 7 * 24 * 60 * MINUTE_IN_MILLISECONDS,
          ),
        },
      },
      {
        upsert: true,
      },
    );

    return data;
  }

  public async getStreams(
    channelId: string,
    ip: string,
    accessToken: string,
  ): Promise<IYoutubeStreams> {
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
    url.searchParams.set('key', YOUTUBE.API_KEY);

    try {
      const { data } = await axios.get<IYoutubeStreams>(url.href, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      await Youtube.updateOne(
        {
          endpoint: 'search',
          params: channelId,
        },
        {
          $set: {
            data,
            ip,
            createdDate: new Date(),
            expireDate: new Date(
              new Date().getTime() + 15 * MINUTE_IN_MILLISECONDS,
            ),
          },
        },
        {
          upsert: true,
        },
      );

      return data;
    } catch (error) {
      return null;
    }
  }
}

export const youtubeClient = new YoutubeClient();
