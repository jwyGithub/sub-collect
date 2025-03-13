import { logger } from './logger';

/**
 * IP-API.com 响应接口
 */
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

/**
 * IPAPI.com 响应接口
 */
interface IpapiResponse {
    ip: string;
    hostname: string;
    type: string;
    continent_code: string;
    continent_name: string;
    country_code: string;
    country_name: string;
    region_code: string;
    region_name: string;
    city: string;
    zip: string;
    latitude: number;
    longitude: number;
    msa: null;
    dma: null;
    radius: null;
    ip_routing_type: string;
    connection_type: string;
}

/**
 * IP.SB 响应接口
 */
interface IpSbResponse {
    organization: string;
    longitude: number;
    timezone: string;
    isp: string;
    offset: number;
    asn: number;
    asn_organization: string;
    country: string;
    ip: string;
    latitude: number;
    continent_code: string;
    country_code: string;
}

interface IpApiIoResponse {
    ip: string;
    countryCode: string;
    country_code: string;
    countryName: string;
    country_name: string;
    isInEuropeanUnion: boolean;
    is_in_european_union: boolean;
    regionName: string;
    region_name: string;
    regionCode: string;
    region_code: string;
    city: string;
    zipCode: string;
    zip_code: string;
    timeZone: string;
    time_zone: string;
    latitude: number;
    longitude: number;
    metroCode: number;
    metro_code: number;
    organisation: string;
    flagUrl: string;
    emojiFlag: string;
    currencySymbol: string;
    currency: string;
    callingCode: string;
    countryCapital: string;
    suspiciousFactors: {
        isProxy: boolean;
        isTorNode: boolean;
        isSpam: boolean;
        isSuspicious: boolean;
    };
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
 * IP-API.com 查询服务
 */
export class IpApiProvider implements IpLookupProvider {
    async lookup(ip: string): Promise<string> {
        const response = await fetch(`http://ip-api.com/json/${ip}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: IpApiResponse = await response.json();

        if (data.status === 'success' && data.countryCode) {
            logger.debug('[IP-API] %s -> %s (%s, %s)', ip, data.countryCode, data.city, data.isp);
            return data.countryCode;
        }
        throw new Error('Invalid response from ip-api.com');
    }
}

/**
 * IPAPI.com 查询服务
 */
export class IpapiProvider implements IpLookupProvider {
    async lookup(ip: string): Promise<string> {
        const response = await fetch(`https://ipapi.com/ip_api.php?ip=${ip}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: IpapiResponse = await response.json();

        if (data.country_code) {
            logger.debug('[IPAPI] %s -> %s (%s, %s)', ip, data.country_code, data.city);
            return data.country_code;
        }
        throw new Error('Invalid response from ipapi.com');
    }
}

/**
 * api.ip.sb 查询服务
 */
export class IpSbProvider implements IpLookupProvider {
    async lookup(ip: string): Promise<string> {
        const response = await fetch(`https://api.ip.sb/geoip/${ip}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: IpSbResponse = await response.json();

        if (data.country_code) {
            logger.debug('[IP.SB] %s -> %s (%s, %s)', ip, data.country_code);
            return data.country_code;
        }
        throw new Error('Invalid response from ip.sb');
    }
}

/**
 * ip-api.io 查询服务
 */
export class IpApiIoProvider implements IpLookupProvider {
    async lookup(ip: string): Promise<string> {
        const response = await fetch(`https://ip-api.io/json/${ip}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data: IpApiIoResponse = await response.json();

        if (data.countryCode) {
            logger.debug('[IP-API.IO] %s -> %s (%s, %s)', ip, data.countryCode, data.city);
            return data.countryCode;
        }
        throw new Error('Invalid response from ip-api.io');
    }
}

