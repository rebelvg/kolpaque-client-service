import axios from 'axios';

import { youtube } from './config';

export interface IYoutubeChannels {
  items: Array<{ id: string }>;
}

export interface IYoutubeStreams {
  items: any[];
}

class YoutubeClient {
  private baseUrl = 'https://www.googleapis.com/youtube/v3';

  public async getChannels(channelName: string): Promise<IYoutubeChannels> {
    const channelsUrl = new URL(`${this.baseUrl}/channels`);

    channelsUrl.searchParams.set('forUsername', channelName);
    channelsUrl.searchParams.set('part', 'id');
    channelsUrl.searchParams.set('key', youtube.apiKey);

    const { data } = await axios.get<IYoutubeChannels>(channelsUrl.href);

    return data;
  }

  public async getStreams(channelId: string): Promise<IYoutubeStreams> {
    const searchUrl = new URL(`${this.baseUrl}/search`);

    searchUrl.searchParams.set('channelId', channelId);
    searchUrl.searchParams.set('part', 'snippet');
    searchUrl.searchParams.set('type', 'video');
    searchUrl.searchParams.set('eventType', 'live');
    searchUrl.searchParams.set('key', youtube.apiKey);

    const { data } = await axios.get<IYoutubeStreams>(searchUrl.href);

    return data;
  }
}

export const youtubeClient = new YoutubeClient();
