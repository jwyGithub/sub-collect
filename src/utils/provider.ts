import { logger } from './logger';

/**
 * IP-API.com 响应接口
 */
interface CfWorkerDoHResponse {
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
    timestamp: string;
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
    lookup(ip: string): Promise<string>;
}

/**
 * cf-worker-doh
 */
export class CfDoHProvider implements IpLookupProvider {
    async lookup(ip: string): Promise<string> {
        const url = `https://ip.looby.dpdns.org/ip-info?ip=${ip}`;
        logger.debug('[Cf-Worker-DoH] %s', url);
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: CfWorkerDoHResponse = await response.json();

        if (data.status === 'success' && data.countryCode) {
            logger.debug('[Cf-Worker-DoH] %s -> %s (%s, %s)', ip, data.country, data.regionName, data.city);
            return data.countryCode;
        }
        throw new Error('Invalid response from ip-api.com');
    }
}

