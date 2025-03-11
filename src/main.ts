import { config } from './config';
import { fetchSubscription } from './core/fetcher';
import { ParserFactory } from './core/parser';
import { Storage } from './core/storage';
import { logger } from './utils/logger';
import { Node } from './config/types';
import { PROTOCOLS } from './const';
import { CloudflareClient } from './core/cloudflare';
import { sleep } from 'cloudflare-tools';

async function main() {
    try {
        const cloudflare = new CloudflareClient(config);
        const result = await cloudflare.start();
        await sleep(5000);

        logger.info('开始处理订阅任务');
        const storage = new Storage(config.storage);
        const allNodes: Node[] = [];
        // 1. 并行获取所有订阅内容
        logger.info('开始获取所有订阅内容');
        const subscriptionContents = await Promise.all(
            result.map(async sub => {
                try {
                    logger.info('正在获取订阅: %s (%s)', sub.name, sub.url);
                    const content = await fetchSubscription(sub.url);
                    return { name: sub.name, content, success: true };
                } catch (error) {
                    logger.error('获取订阅失败 [%s]: %s', sub.name, error);
                    return { name: sub.name, content: '', success: false };
                }
            })
        );
        logger.info('所有订阅内容获取完成');
        // 2. 解析所有订阅内容
        logger.info('开始解析订阅内容');
        for (const { name, content, success } of subscriptionContents) {
            if (!success) continue;
            logger.info('正在解析订阅: %s', name);
            for (const protocol of PROTOCOLS) {
                try {
                    const parser = ParserFactory.getParser(protocol);
                    const nodes = parser.parseContent(content);
                    if (nodes.length > 0) {
                        logger.info('订阅 %s 解析到 %d 个 %s 节点', name, nodes.length, protocol.toUpperCase());
                        allNodes.push(...nodes);
                    }
                } catch (error) {
                    logger.debug('解析 %s 协议失败: %s', protocol.toUpperCase(), error);
                }
            }
        }
        logger.info('所有订阅解析完成，共解析到 %d 个节点', allNodes.length);
        // 3. 保存节点
        await storage.saveNodes(allNodes);

        // 4. 删除自定义域名
        await cloudflare.deleteCustomHostname();
    } catch (error) {
        logger.error('程序执行失败: %s', error);
        process.exit(1);
    }
}

main();

