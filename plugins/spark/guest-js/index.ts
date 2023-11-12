import { invoke } from '@tauri-apps/api/tauri';

export type Role = 'user' | 'assistant';

export type RequestText = {
  role: Role;
  content: string;
};

export type SparkRequest = {
  app_id: string;
  api_secret: string;
  api_key: string;
  uid?: string;
  temperature?: number;
  max_tokens?: number;
  top_k?: number;
  chat_id?: string;
  history?: RequestText[];
  content: string;
};

export type SparkResponse = {
  content: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
};

export async function sparkChat(request: SparkRequest): Promise<SparkResponse> {
  return await invoke('plugin:acfunlive-neotool-spark|spark_chat', { request });
}
