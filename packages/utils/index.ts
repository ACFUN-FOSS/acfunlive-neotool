export * from './src/svg.js';

export const defaultInterval = 10000;

/**
 * 等待一段时间
 * @param ms 等待的时间（毫秒）
 */
export function delay(ms: number): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}
