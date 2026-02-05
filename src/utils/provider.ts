import { logger } from './logger';

export interface DoHResponse {
    status: string;
    country: string;
    countryCode: string;
    region: string;
    regionName: string;
    city: string;
    zip: string;
    lat: number;
    lon: number;
    timezone: string;
    isp: string;
    org: string;
    as: string;
    query: string;
}

/**
 * IP 查询服务接口
 */
export interface IpLookupProvider {
    /**
     * 查询 IP 的国家代码
     * @param ip IP地址
     * @returns 国家代码
     */
    lookup(ip: string | string[]): Promise<DoHResponse[]>;
}

export class DoHProvider implements IpLookupProvider {
    async lookup(ip: string | string[]): Promise<DoHResponse[]> {
        const ips = Array.isArray(ip) ? ip : [ip];
        const url = `http://ip-api.com/batch`;
        logger.debug('[Cf-Worker-DoH] %s', url);
        const response = await fetch(url, {
            method: 'post',
            body: JSON.stringify(ips)
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: DoHResponse[] = await response.json();
        return data;
    }
}

