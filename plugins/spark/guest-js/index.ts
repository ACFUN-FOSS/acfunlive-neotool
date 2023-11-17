import { invoke, transformCallback } from '@tauri-apps/api/tauri';

export type Role = 'user' | 'assistant';

export type ChatText = {
  role: Role;
  content: string;
};

export type SparkRequest = {
  appId: string;
  apiSecret: string;
  apiKey: string;
  uid?: string;
  temperature?: number;
  maxTokens?: number;
  topK?: number;
  chatId?: string;
  history?: ChatText[];
  content: string;
};

export type TokenStatistics = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export type SparkResponse = {
  content: string;
  tokens: TokenStatistics;
};

export async function sparkChat(
  request: SparkRequest,
  callback: (content: string) => void
): Promise<TokenStatistics> {
  return await invoke('plugin:acfunlive-neotool-spark|spark_chat', {
    request,
    cb: transformCallback(callback)
  });
}

export async function sparkChatFull(request: SparkRequest): Promise<SparkResponse> {
  return await invoke('plugin:acfunlive-neotool-spark|spark_chat_full', { request });
}
