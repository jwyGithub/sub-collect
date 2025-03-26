import Cloudflare from 'cloudflare';
import { config } from './config';
import { logger } from './utils/logger';

const cloudflare = new Cloudflare({
    apiToken: config.cloudflare.token
});

async function clean() {
    try {
        const sslPacks: string[] = [];

        const tempSslPack = (await cloudflare.ssl.certificatePacks.list({
            zone_id: config.cloudflare.zone_id
        })) as { result: { id: string; name: string }[] };

        const getTempSslPack = tempSslPack.result.filter((item: Record<string, any>) => {
            const [zone, domain] = item.hosts;
            const matchKey = domain.replace(`.${zone}`, '');
            sslPacks.push(matchKey);
            return matchKey.startsWith('tempssl-');
        });

        logger.info('SSL 证书包: %s', sslPacks);

        if (getTempSslPack.length === 0) {
            logger.info('没有找到临时 SSL 证书包');
            return;
        }

        logger.info(
            '获取到临时 SSL 证书包: %s',
            getTempSslPack.map(item => item.id)
        );

        for (const pack of getTempSslPack) {
            logger.info('删除临时 SSL 证书包: %s', pack.id);
            await cloudflare.ssl.certificatePacks.delete(pack.id, {
                zone_id: config.cloudflare.zone_id
            });
        }
    } catch (error) {
        logger.error('清理失败: %s', error);
    }
}

clean();

