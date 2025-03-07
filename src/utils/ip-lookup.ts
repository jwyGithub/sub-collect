import { logger } from './logger';
import { fetchWithRetry } from 'cloudflare-tools';

interface IpApiResponse {
    status: string;
    country?: string;
    countryCode?: string;
    region?: string;
    regionName?: string;
    city?: string;
    isp?: string;
    org?: string;
    message?: string;
}

interface IpapiResponse {
    ip?: string;
    country_code?: string;
    country_name?: string;
    region_code?: string;
    region_name?: string;
    city?: string;
    connection?: {
        isp?: string;
    };
    security?: {
        is_proxy?: boolean;
        proxy_type?: string;
        is_tor?: boolean;
        threat_level?: string;
    };
    error?: {
        code: number;
        info: string;
    };
}

class IpLookupService {
    private cache = new Map<string, string>();
    private pendingQueries = new Map<string, Promise<string>>();
    private rateLimitDelay = 200; // 每个请求间隔200ms，避免API限制

    /**
     * 批量查询IP的国家代码
     * @param ips IP地址数组
     * @returns Map<ip, countryCode>
     */
    async batchLookup(ips: string[]): Promise<Map<string, string>> {
        // 去重IP
        const uniqueIps = [...new Set(ips)];
        const results = new Map<string, string>();
        const uncachedIps: string[] = [];

        // 先检查缓存
        for (const ip of uniqueIps) {
            const cached = this.cache.get(ip);
            if (cached) {
                results.set(ip, cached);
            } else {
                uncachedIps.push(ip);
            }
        }

        if (uncachedIps.length === 0) {
            return results;
        }

        // 并发查询，但限制并发数
        const batchSize = 10;
        for (let i = 0; i < uncachedIps.length; i += batchSize) {
            const batch = uncachedIps.slice(i, i + batchSize);
            const promises = batch.map(ip => this.lookupSingle(ip));

            try {
                const batchResults = await Promise.all(promises);
                batchResults.forEach((countryCode, index) => {
                    const ip = batch[index];
                    results.set(ip, countryCode);
                    this.cache.set(ip, countryCode);
                });
            } catch (error) {
                logger.error('批量查询IP失败: %s', error);
            }

            // 添加延迟，避免触发API限制
            if (i + batchSize < uncachedIps.length) {
                await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay * batchSize));
            }
        }

        return results;
    }

    /**
     * 查询单个IP的国家代码
     * @param ip IP地址
     * @returns 国家代码
     */
    private async lookupSingle(ip: string): Promise<string> {
        // 检查是否已有相同IP的查询正在进行
        if (this.pendingQueries.has(ip)) {
            return this.pendingQueries.get(ip)!;
        }

        const queryPromise = (async () => {
            try {
                // 首先尝试 ip-api.com
                const ipApiResponse = await this.queryIpApi(ip);
                if (ipApiResponse.status === 'success' && ipApiResponse.countryCode) {
                    logger.debug('IP %s -> %s (%s, %s)', ip, ipApiResponse.countryCode, ipApiResponse.city, ipApiResponse.isp);
                    return ipApiResponse.countryCode;
                }

                // 如果失败，尝试 ipapi.com
                const ipapiResponse = await this.queryIpapi(ip);
                if (ipapiResponse.country_code) {
                    const securityInfo = ipapiResponse.security;
                    if (securityInfo) {
                        logger.debug(
                            'IP %s -> %s (%s, %s) [代理: %s, 威胁等级: %s]',
                            ip,
                            ipapiResponse.country_code,
                            ipapiResponse.city,
                            ipapiResponse.connection?.isp,
                            securityInfo.is_proxy ? securityInfo.proxy_type : '否',
                            securityInfo.threat_level
                        );
                    }
                    return ipapiResponse.country_code;
                }

                logger.warn('无法确定IP %s 的位置', ip);
                return 'UNKNOWN';
            } catch (error) {
                logger.error('查询IP %s 失败: %s', ip, error);
                return 'ERROR';
            } finally {
                this.pendingQueries.delete(ip);
            }
        })();

        this.pendingQueries.set(ip, queryPromise);
        return queryPromise;
    }

    private async queryIpApi(ip: string): Promise<IpApiResponse> {
        const response = await fetchWithRetry(`http://ip-api.com/json/${ip}`, { retries: 3, retryDelay: 1000 });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.data.json();
    }

    private async queryIpapi(ip: string): Promise<IpapiResponse> {
        const response = await fetchWithRetry(`https://ipapi.com/ip_api.php?ip=${ip}`, { retries: 3, retryDelay: 1000 });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.data.json();
    }
}

export const ipLookup = new IpLookupService();

