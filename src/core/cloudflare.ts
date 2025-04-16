import { Config } from '@/config/types';
import { logger } from '@/utils/logger';
import Cloudflare from 'cloudflare';
import { randomUUID } from 'node:crypto';

class CloudflareWorker {
    private fakeDomain: string;
    private fakeDomainId: string = '';
    constructor(
        private readonly cloudflare: Cloudflare,
        private readonly config: Config,
        private readonly domain: Cloudflare.Workers.Domains.Domain,
        private readonly protocol: 'vless' | 'trojan'
    ) {
        this.cloudflare = cloudflare;
        this.config = config;
        this.domain = domain;

        this.fakeDomain = `tempssl-${randomUUID()}.${this.domain.zone_name}`;
    }

    public async start(): Promise<string> {
        logger.info(`%s 开始设置自定义域名`, this.domain.service);
        await this.setCustomHostname();
        return `https://${this.fakeDomain}/${this.config.uuid}?sub=${this.config.subs[this.protocol]}`;
    }

    private async setCustomHostname() {
        try {
            const res = await this.cloudflare.workers.domains.update({
                account_id: this.config.cloudflare.account_id,
                environment: this.domain.environment || 'production',
                hostname: this.fakeDomain,
                service: this.domain.service || '',
                zone_id: this.config.cloudflare.zone_id
            });
            this.fakeDomainId = res.id || '';
            logger.info(`%s 自定义域名设置成功`, this.domain.service);
        } catch (error) {
            logger.error(`%s 设置自定义域名失败 : %s`, this.domain.service, error);
        }
    }

    public async deleteCustomHostname() {
        try {
            await this.cloudflare.workers.domains.delete(this.fakeDomainId, {
                account_id: this.config.cloudflare.account_id
            });
            logger.info(`%s 自定义域名删除成功`, this.domain.service);
        } catch (error) {
            logger.error(`%s 删除自定义域名失败 : %s`, this.domain.service, error);
        }
    }

    public async deleteCustomSsl() {
        try {
            const res = await this.cloudflare.ssl.certificatePacks.list({
                zone_id: this.config.cloudflare.zone_id,
                status: 'all'
            });
            const sslPack = this.getSslPack(res.result, this.fakeDomain);

            if (sslPack) {
                logger.info(`%s 删除自定义SSL证书`, sslPack.id);
                await this.cloudflare.ssl.certificatePacks.delete(sslPack.id, {
                    zone_id: this.config.cloudflare.zone_id
                });
            } else {
                logger.info(`%s 没有自定义SSL证书`, this.fakeDomain);
            }
        } catch (error) {
            logger.error(`%s 删除自定义SSL证书失败 : %s`, this.fakeDomain, error);
        }
    }

    private getSslPack(list: any[] = [], uuid: string) {
        for (const item of list) {
            const [zone, domain] = item.hosts;
            const matchKey = domain.replace(`.${zone}`, '');
            if (matchKey === uuid) {
                return item;
            }
        }
        return null;
    }
}

export class CloudflareClient {
    private readonly config: Config;
    private readonly cloudflare: Cloudflare;
    private vless: CloudflareWorker | undefined = undefined;
    private trojan: CloudflareWorker | undefined = undefined;

    private vlessResult: string = '';
    private trojanResult: string = '';

    constructor(config: Config) {
        this.config = config;
        this.cloudflare = new Cloudflare({
            apiToken: this.config.cloudflare.token
        });
    }

    public async start() {
        try {
            const res = await this.cloudflare.workers.domains.list({
                account_id: this.config.cloudflare.account_id,
                zone_id: this.config.cloudflare.zone_id
            });
            const vless = res.result.find(item => item.service === this.config.cloudflare.vless_service);
            const trojan = res.result.find(item => item.service === this.config.cloudflare.trojan_service);
            if (vless) {
                this.vless = new CloudflareWorker(this.cloudflare, this.config, vless, 'vless');
                const vlessResult = await this.vless.start();
                this.vlessResult = vlessResult;
            }
            if (trojan) {
                this.trojan = new CloudflareWorker(this.cloudflare, this.config, trojan, 'trojan');
                const trojanResult = await this.trojan.start();
                this.trojanResult = trojanResult;
            }
            return [
                { name: this.config.cloudflare.vless_service, url: this.vlessResult },
                { name: this.config.cloudflare.trojan_service, url: this.trojanResult },
                ...Object.entries(this.config.subs).map(([name, url]: [string, string]) => ({ name, url }))
            ];
        } catch (error) {
            logger.error(error);
            return [];
        }
    }

    public async deleteCustomHostname() {
        try {
            await this.vless?.deleteCustomHostname();
            await this.trojan?.deleteCustomHostname();
        } catch (error) {
            logger.error('删除自定义域名失败', error);
        }
    }

    public async deleteCustomSsl() {
        try {
            await this.vless?.deleteCustomSsl();
            await this.trojan?.deleteCustomSsl();
        } catch (error) {
            logger.error('删除自定义SSL证书失败', error);
        }
    }
}

