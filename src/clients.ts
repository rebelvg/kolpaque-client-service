import axios, { AxiosError } from 'axios';

import { GOOGLE, YOUTUBE } from './config';
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
    forHandle: boolean,
  ): Promise<IYoutubeChannels> {
    const { Youtube } = MongoCollections;

    const cacheData = await Youtube.findOne({
      endpoint: 'channels',
      params: channelName,
    });

    let data: any | null = cacheData?.data || null;
    let expireDate = cacheData?.expireDate || new Date();

    if (!cacheData || Date.now() > cacheData.expireDate.getTime()) {
      const url = new URL(`${this.baseUrl}/channels`);

      if (forHandle) {
        url.searchParams.set('forHandle', channelName);
      } else {
        url.searchParams.set('forUsername', channelName);
      }

      url.searchParams.set('part', 'id');
      url.searchParams.set('key', YOUTUBE.API_KEY);

      try {
        const { data: newData } = await axios.get<IYoutubeChannels>(url.href, {
          headers: {
            // Authorization: `Bearer ${accessToken}`,
          },
        });

        data = newData;

        expireDate = new Date(
          new Date().getTime() + 24 * 60 * MINUTE_IN_MILLISECONDS,
        );
      } catch (error) {
        console.error(error.message, (error as AxiosError)?.response?.data);

        expireDate = new Date(
          new Date().getTime() + 15 * MINUTE_IN_MILLISECONDS,
        );
      }
    }

    await Youtube.updateOne(
      {
        endpoint: 'channels',
        params: channelName,
      },
      {
        $set: {
          data,
          ip,
          expireDate,
        },
        $setOnInsert: {
          createdDate: new Date(),
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
  ): Promise<IYoutubeStreams> {
    const { Youtube } = MongoCollections;

    const cacheData = await Youtube.findOne({
      endpoint: 'search',
      params: channelId,
    });

    let data: any | null = cacheData?.data || null;
    let expireDate = cacheData?.expireDate || new Date();

    if (!cacheData || Date.now() > cacheData.expireDate.getTime()) {
      const url = new URL(`${this.baseUrl}/search`);

      url.searchParams.set('channelId', channelId);
      url.searchParams.set('part', 'snippet');
      url.searchParams.set('type', 'video');
      url.searchParams.set('eventType', 'live');
      url.searchParams.set('key', YOUTUBE.API_KEY);

      try {
        const { data: newData } = await axios.get<IYoutubeStreams>(url.href, {
          headers: {
            // Authorization: `Bearer ${accessToken}`,
          },
        });

        data = newData;

        expireDate = new Date(
          new Date().getTime() + 15 * MINUTE_IN_MILLISECONDS,
        );
      } catch (error) {
        console.error(error.message, (error as AxiosError)?.response?.data);

        expireDate = new Date(
          new Date().getTime() + 15 * MINUTE_IN_MILLISECONDS,
        );
      }
    }

    await Youtube.updateOne(
      {
        endpoint: 'search',
        params: channelId,
      },
      {
        $set: {
          data,
          ip,
          expireDate,
        },
        $setOnInsert: {
          createdDate: new Date(),
        },
      },
      {
        upsert: true,
      },
    );

    return data;
  }
}

export const youtubeClient = new YoutubeClient();
