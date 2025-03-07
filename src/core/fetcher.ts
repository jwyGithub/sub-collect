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
        const response = await fetch(url);
        if (!response.ok) {
            throw new FetchError(`HTTP error! status: ${response.status}`);
        }

        const text = await response.text();
        logger.debug('成功获取订阅内容 (%s)', url);

        return text;
    } catch (error) {
        logger.error('获取订阅内容失败 (%s): %s', url, error);
        throw new FetchError(`Failed to fetch subscription: ${error}`);
    }
}

