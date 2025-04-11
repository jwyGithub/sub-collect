import { logger } from './logger';
import { IpLookupProvider, CfDoHProvider } from './provider';

class IpLookupService {
    private cache = new Map<string, string>();
    private pendingQueries = new Map<string, Promise<string>>();
    private lastQueryTime = 0;
    private minQueryInterval = 500; // 每次查询最小间隔 500ms
    private batchSize = 20; // 每批处理的IP数量
    private providers: IpLookupProvider[];

    constructor() {
        // 按优先级顺序添加查询服务
        this.providers = [new CfDoHProvider()];
    }

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

        // 分批处理未缓存的IP
        for (let i = 0; i < uncachedIps.length; i += this.batchSize) {
            const batch = uncachedIps.slice(i, i + this.batchSize);
            const promises = batch.map(ip => this.lookupSingle(ip));

            try {
                const batchResults = await Promise.all(promises);
                batch.forEach((ip, index) => {
                    const countryCode = batchResults[index];
                    results.set(ip, countryCode);
                    this.cache.set(ip, countryCode);
                });
            } catch (error) {
                logger.error('[ERROR] 批量查询IP失败: %s', error);
                batch.forEach(ip => {
                    results.set(ip, 'ERROR');
                });
            }

            // 如果还有更多批次，等待一下再继续
            if (i + this.batchSize < uncachedIps.length) {
                await new Promise(resolve => setTimeout(resolve, this.minQueryInterval));
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

                // 依次尝试所有查询服务
                for (const provider of this.providers) {
                    try {
                        const countryCode = await provider.lookup(ip);
                        this.lastQueryTime = Date.now();
                        return countryCode;
                    } catch (error) {
                        logger.debug('[RETRY] 查询失败，尝试下一个服务: %s', error);
                        // 等待一下再尝试下一个服务
                        await new Promise(resolve => setTimeout(resolve, this.minQueryInterval));
                    }
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
}

export const ipLookup = new IpLookupService();

