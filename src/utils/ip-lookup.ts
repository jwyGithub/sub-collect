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
     * 批量查询IP的国家代码
     * @param ips IP地址数组
     * @returns Map<ip, countryCode>
     */
    async batchLookup(ips: string[]): Promise<IpLookupResult> {
        const results: IpLookupResult = [];
        for (const provider of this.providers) {
            try {
                const result = await provider.lookup(ips);
                results.push(...result);
            } catch (error) {
                logger.error('[ERROR] 批量查询IP失败: %s', error);
            }
        }
        return results;
    }
}

export const ipLookup = new IpLookupService();

