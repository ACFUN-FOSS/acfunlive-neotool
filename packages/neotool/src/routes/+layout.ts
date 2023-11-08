import { BackendSession, EventHandler, neotoolID } from '@acfunlive-neotool/shared';
import tauriSession from 'acfunlive-backend-js/tauri.js';
import type { AppConfig } from 'tauri-plugin-acfunlive-neotool-base-api';

import type { Config } from '$lib/scripts/load';

export const prerender = true;
export const ssr = false;

export type LoadedData = {
  config: Config;
  appConfigs: AppConfig[];
  session: BackendSession;
  eventHandler: EventHandler;
};

export async function load(): Promise<LoadedData> {
  try {
    // 因为top level不能有Node没有的东西，所以要动态加载
    const load = await import('$lib/scripts/load');

    const config = await load.loadConfig();
    const appConfigs = await load.loadAppConfigs(config.appsDir);
    const session = new BackendSession(
      tauriSession(),
      neotoolID,
      config.liverUID !== undefined && config.liverUID > 0 ? config.liverUID : undefined
    );
    const eventHandler = new EventHandler(
      session,
      appConfigs,
      appConfigs.map((config) => {
        return { id: config.id, enable: true };
      })
    );
    await eventHandler.init();

    return {
      config,
      appConfigs,
      session,
      eventHandler
    };
  } catch (e) {
    throw new Error(`failed load data: ${e}`);
  }
}
