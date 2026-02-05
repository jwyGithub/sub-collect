import { logger } from '../utils/logger';
import { FetchError } from '../utils/error';
import { fetchWithRetry } from 'cloudflare-tools';

/**
 * 获取订阅内容
 * @param url 订阅地址
 * @returns Base64 编码的订阅内容
 */
export async function fetchSubscription(url: string): Promise<string> {
    try {
        const response = await fetchWithRetry(url, {
            retries: 20,
            retryDelay: 1000,
            onRetry(attempt, delay) {
                logger.warn('获取订阅内容失败 (%s), 重试第 %d 次, 等待 %d 毫秒', url, attempt, delay);
            }
        });
        const text = await response.data.text();
        logger.info('成功获取订阅内容 (%s)', url);

        return text;
    } catch (error) {
        logger.error('获取订阅内容失败 (%s): %s', url, error);
        throw new FetchError(`Failed to fetch subscription: ${error}`);
    }
}

