import axios, { AxiosError } from 'axios';

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

    let data: any | null = cacheData?.data || null;
    let expireDate = cacheData?.expireDate || new Date();

    let throwError = false;

    if (!cacheData || Date.now() > cacheData.expireDate.getTime()) {
      const url = new URL(`${this.baseUrl}/channels`);

      if (forHandle) {
        url.searchParams.set('forHandle', channelName);
      } else {
        url.searchParams.set('forUsername', channelName);
      }

      url.searchParams.set('part', 'id');

      try {
        const { data: newData } = await axios.get<IYoutubeChannels>(url.href, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        data = newData;

        expireDate = new Date(
          new Date().getTime() + 14 * 24 * 60 * MINUTE_IN_MILLISECONDS,
        );
      } catch (error) {
        console.error(error.message, (error as AxiosError)?.response?.data);

        expireDate = new Date(
          new Date().getTime() + 15 * MINUTE_IN_MILLISECONDS,
        );

        throwError = true;
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

    if (throwError) {
      throw new Error('youtube_error');
    }

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

    let data: any | null = cacheData?.data || null;
    let expireDate = cacheData?.expireDate || new Date();

    let throwError = false;

    if (!cacheData || Date.now() > cacheData.expireDate.getTime()) {
      const url = new URL(`${this.baseUrl}/search`);

      url.searchParams.set('channelId', channelId);
      url.searchParams.set('part', 'snippet');
      url.searchParams.set('type', 'video');
      url.searchParams.set('eventType', 'live');

      try {
        const { data: newData } = await axios.get<IYoutubeStreams>(url.href, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
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

        throwError = true;
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

    if (throwError) {
      throw new Error('youtube_error');
    }

    return data;
  }
}

export const youtubeClient = new YoutubeClient();
