import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { StorageConfig, Node, ProtocolType, FilterRules } from '../config/types';
import { StorageError } from '../utils/error';
import { logger } from '../utils/logger';
import { config } from '../config';
import { ipLookup } from '../utils/ip-lookup';

export class Storage {
    private readonly filterRules: FilterRules;
    private readonly regexPatterns: RegExp[];
    private readonly storageConfig: StorageConfig;

    constructor(storageConfig: StorageConfig) {
        this.storageConfig = storageConfig;
        this.filterRules = config.filter;
        // 预编译正则表达式
        this.regexPatterns = this.filterRules.patterns
            .map(pattern => {
                try {
                    return new RegExp(pattern);
                } catch (error) {
                    logger.warn('正则表达式编译失败: %s (%s)', pattern, error);
                    return null;
                }
            })
            .filter((regex): regex is RegExp => regex !== null);
    }

    /**
     * 保存节点到文件
     * @param nodes 节点列表
     */
    async saveNodes(nodes: Node[]): Promise<void> {
        try {
            // 确保存储目录存在
            await mkdir(this.storageConfig.base_path, { recursive: true });

            // 按协议分组节点
            const groupedNodes = this.groupNodesByProtocol(nodes);

            // 对每个协议组的节点进行去重和过滤
            const deduplicatedGroups = new Map<ProtocolType, Node[]>();
            for (const [protocol, protocolNodes] of groupedNodes.entries()) {
                // 先进行过滤
                const filteredNodes = await this.filterNodes(protocolNodes);
                const filteredCount = protocolNodes.length - filteredNodes.length;
                if (filteredCount > 0) {
                    logger.info('协议 %s 过滤完成，移除了 %d 个无效节点', protocol.toUpperCase(), filteredCount);
                }

                // 再进行去重
                const uniqueNodes = this.deduplicateNodes(filteredNodes);
                deduplicatedGroups.set(protocol, uniqueNodes);

                const removedCount = filteredNodes.length - uniqueNodes.length;
                if (removedCount > 0) {
                    logger.info('协议 %s 去重完成，移除了 %d 个重复节点', protocol.toUpperCase(), removedCount);
                }
            }

            // 保存去重后的节点
            await Promise.all(
                Array.from(deduplicatedGroups.entries()).map(([protocol, protocolNodes]) => this.saveProtocolNodes(protocol, protocolNodes))
            );

            logger.info('所有节点保存完成');
        } catch (error) {
            logger.error('保存节点失败: %s', error);
            throw new StorageError(`Failed to save nodes: ${error}`);
        }
    }

    /**
     * 按协议分组节点
     * @param nodes 节点列表
     */
    private groupNodesByProtocol(nodes: Node[]): Map<ProtocolType, Node[]> {
        const groups = new Map<ProtocolType, Node[]>();

        for (const node of nodes) {
            const protocolNodes = groups.get(node.protocol) || [];
            protocolNodes.push(node);
            groups.set(node.protocol, protocolNodes);
        }

        return groups;
    }

    /**
     * 检查地址是否在黑名单中
     * @param address IP 地址或域名
     * @returns 是否在黑名单中
     */
    private isInBlacklist(address: string): boolean {
        // 检查正则表达式匹配
        for (const regex of this.regexPatterns) {
            if (regex.test(address)) {
                return true;
            }
        }
        return false;
    }

    /**
     * 过滤节点
     * @param nodes 需要过滤的节点列表
     * @returns 过滤后的节点列表
     */
    private async filterNodes(nodes: Node[]): Promise<Node[]> {
        // 收集所有需要查询的IP地址（排除已在黑名单中的IP）
        const ipsToLookup = nodes
            .filter(node => {
                // 只处理 IPv4 地址
                if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(node.address)) {
                    return false;
                }
                // 排除已在黑名单中的地址
                if (this.isInBlacklist(node.address)) {
                    logger.debug('跳过黑名单地址查询: %s', node.address);
                    return false;
                }
                return true;
            })
            .map(node => node.address);

        // 批量查询IP地理位置
        const ipCountryCodes = await ipLookup.batchLookup(ipsToLookup);

        return nodes.filter(node => {
            // 检查地址是否在黑名单中
            if (this.isInBlacklist(node.address)) {
                logger.info('⛔ 黑名单过滤 [%s:%s] -> 命中规则', node.address, node.port);
                return false;
            }

            // 检查IP地理位置
            if (/^(\d{1,3}\.){3}\d{1,3}$/.test(node.address)) {
                const countryCode = ipCountryCodes.get(node.address);
                if (countryCode && this.filterRules.countryCodes.includes(countryCode)) {
                    logger.info('⛔ 地理位置过滤 [%s:%s] -> 命中规则: %s', node.address, node.port, countryCode);
                    return false;
                }
            }

            return true;
        });
    }

    /**
     * 节点去重
     * @param nodes 需要去重的节点列表
     * @returns 去重后的节点列表
     */
    private deduplicateNodes(nodes: Node[]): Node[] {
        const seen = new Map<string, Node>();

        // 遍历所有节点，只保留每个 ip:port 组合的第一个节点
        for (const node of nodes) {
            const key = `${node.address}:${node.port}`;
            if (!seen.has(key)) {
                seen.set(key, node);
            }
        }

        return Array.from(seen.values());
    }

    /**
     * 保存单个协议的节点
     * @param protocol 协议类型
     * @param nodes 节点列表
     */
    private async saveProtocolNodes(protocol: ProtocolType, nodes: Node[]): Promise<void> {
        const filename = this.storageConfig.files[protocol];
        if (!filename) {
            logger.warn('未配置 %s 协议的存储文件', protocol.toUpperCase());
            return;
        }

        const filepath = join(this.storageConfig.base_path, filename);
        const content = nodes.map(node => `${node.address}:${node.port}${node.hash}`).join('\n');

        try {
            await writeFile(filepath, content);
            logger.info('已保存 %d 个 %s 节点', nodes.length, protocol.toUpperCase());
        } catch (error) {
            logger.error('保存 %s 节点失败: %s', protocol.toUpperCase(), error);
            throw new StorageError(`Failed to save ${protocol} nodes: ${error}`);
        }
    }
}

