import { logger } from './logger';

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
    private lastQueryTime = 0;
    private minQueryInterval = 500; // 每次查询最小间隔 500ms

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

        // 顺序查询每个IP，交替使用不同的API
        for (const ip of uncachedIps) {
            try {
                const countryCode = await this.lookupSingle(ip);
                results.set(ip, countryCode);
                this.cache.set(ip, countryCode);
            } catch (error) {
                logger.error('[ERROR] 查询IP %s 失败: %s', ip, error);
                results.set(ip, 'ERROR');
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
                // 确保查询间隔
                const now = Date.now();
                const timeSinceLastQuery = now - this.lastQueryTime;
                if (timeSinceLastQuery < this.minQueryInterval) {
                    await new Promise(resolve => setTimeout(resolve, this.minQueryInterval - timeSinceLastQuery));
                }

                // 先尝试 ip-api.com
                try {
                    const ipApiResponse = await this.queryIpApi(ip);
                    if (ipApiResponse.status === 'success' && ipApiResponse.countryCode) {
                        logger.debug(
                            '[IP-API] %s -> %s (%s, %s)',
                            ip,
                            ipApiResponse.countryCode,
                            ipApiResponse.city,
                            ipApiResponse.isp
                        );
                        this.lastQueryTime = Date.now();
                        return ipApiResponse.countryCode;
                    }
                } catch (error) {
                    logger.debug('[RETRY] ip-api.com 查询失败，尝试备用 API: %s', error);
                }

                // 如果 ip-api.com 失败，等待一下再尝试 ipapi.com
                await new Promise(resolve => setTimeout(resolve, this.minQueryInterval));

                // 尝试 ipapi.com
                const ipapiResponse = await this.queryIpapi(ip);
                if (ipapiResponse.country_code) {
                    const securityInfo = ipapiResponse.security;
                    if (securityInfo) {
                        logger.debug(
                            '[IPAPI] %s -> %s (%s, %s) [代理: %s, 威胁等级: %s]',
                            ip,
                            ipapiResponse.country_code,
                            ipapiResponse.city,
                            ipapiResponse.connection?.isp,
                            securityInfo.is_proxy ? securityInfo.proxy_type : '否',
                            securityInfo.threat_level
                        );
                    }
                    this.lastQueryTime = Date.now();
                    return ipapiResponse.country_code;
                }

                logger.warn('[WARN] 无法确定IP %s 的位置', ip);
                return 'UNKNOWN';
            } catch (error) {
                logger.error('[ERROR] 查询IP %s 失败: %s', ip, error);
                return 'ERROR';
            } finally {
                this.pendingQueries.delete(ip);
            }
        })();

        this.pendingQueries.set(ip, queryPromise);
        return queryPromise;
    }

    private async queryIpApi(ip: string): Promise<IpApiResponse> {
        const response = await fetch(`http://ip-api.com/json/${ip}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    }

    private async queryIpapi(ip: string): Promise<IpapiResponse> {
        const response = await fetch(`https://ipapi.com/ip_api.php?ip=${ip}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    }
}

export const ipLookup = new IpLookupService();

