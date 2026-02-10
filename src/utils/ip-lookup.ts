import { logger } from './logger';
import { IpLookupProvider, DoHProvider, DoHResponse } from './provider';

type IpLookupResult = Array<Partial<DoHResponse>>;
class IpLookupService {
    private providers: IpLookupProvider[];

    constructor() {
        // 按优先级顺序添加查询服务
        this.providers = [new DoHProvider()];
    }

    /**
     * 批量查询IP的国家代码（支持并发）
     * @param ips IP地址数组
     * @param concurrency 并发数量，每批次查询的IP数
     * @returns IpLookupResult
     */
    async batchLookup(ips: string[], concurrency: number = 10): Promise<IpLookupResult> {
        // 将 IP 按 concurrency 分批
        const chunks: string[][] = [];
        for (let i = 0; i < ips.length; i += concurrency) {
            chunks.push(ips.slice(i, i + concurrency));
        }

        const results: IpLookupResult = [];

        // 所有分批并发请求
        const tasks = chunks.flatMap(chunk =>
            this.providers.map(async provider => {
                try {
                    return await provider.lookup(chunk);
                } catch (error) {
                    logger.error('[ERROR] 批量查询IP失败: %s', error);
                    return [];
                }
            })
        );

        const settled = await Promise.all(tasks);
        for (const result of settled) {
            results.push(...result);
        }

        return results;
    }
}

export const ipLookup = new IpLookupService();

