import { Node, FilterRules } from '../config/types';
import { logger } from '../utils/logger';
import { ipLookup } from '../utils/ip-lookup';
import { config } from '../config';

export class Process {
    private readonly filterRules: FilterRules;
    private readonly regexPatterns: RegExp[];

    constructor() {
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
     * 处理节点列表
     * @param nodes 原始节点列表
     * @returns 处理后的节点列表
     */
    public async process(nodes: Node[]): Promise<Node[]> {
        logger.info('开始处理节点，原始节点数量: %d', nodes.length);

        // 1. 先进行去重
        const uniqueNodes = this.deduplicateNodes(nodes);
        logger.info('节点去重完成: %d -> %d', nodes.length, uniqueNodes.length);

        // 2. 再进行过滤
        const filteredNodes = await this.filterNodes(uniqueNodes);
        logger.info('节点过滤完成: %d -> %d', uniqueNodes.length, filteredNodes.length);

        return filteredNodes;
    }

    /**
     * 节点去重
     * @param nodes 需要去重的节点列表
     * @returns 去重后的节点列表
     */
    private deduplicateNodes(nodes: Node[]): Node[] {
        const nodeMap = new Map<string, Node>();

        for (const node of nodes) {
            const key = `${node.address}:${node.port}`;
            // 如果节点已存在，保留原始链接
            if (!nodeMap.has(key)) {
                nodeMap.set(key, node);
            }
        }

        return Array.from(nodeMap.values());
    }

    /**
     * 检查地址是否在黑名单中
     */
    private isInBlacklist(address: string): boolean {
        return this.regexPatterns.some(regex => regex.test(address));
    }

    /**
     * 过滤节点
     * @param nodes 需要过滤的节点列表
     * @returns 过滤后的节点列表
     */
    private async filterNodes(nodes: Node[]): Promise<Node[]> {
        // 收集需要查询的地址
        const addressToNodes = new Map<string, Node[]>();
        const filteredNodes: Node[] = [];

        // 第一次遍历：过滤黑名单并收集地址
        for (const node of nodes) {
            // 检查地址是否在黑名单中
            if (this.isInBlacklist(node.address)) {
                logger.debug('⛔ 黑名单过滤 [%s:%s] -> 命中规则', node.address, node.port);
                continue;
            }

            // 收集相同地址的节点
            const nodeList = addressToNodes.get(node.address) || [];
            nodeList.push(node);
            addressToNodes.set(node.address, nodeList);
        }

        // 如果没有需要查询的地址，直接返回空数组
        if (addressToNodes.size === 0) {
            return filteredNodes;
        }

        // 批量查询地理位置
        const addressList = Array.from(addressToNodes.keys());
        const lookupResults = await ipLookup.batchLookup(addressList);

        // 处理查询结果
        for (const [address, lookupResult] of lookupResults) {
            const { countryCode = '', region = '' } = lookupResult;
            // 如果地址查询失败或不在黑名单国家/地区中，保留节点
            if (lookupResult.status !== 'error' && !this.filterRules.countryCodes.includes(countryCode)) {
                const nodes = addressToNodes.get(address);
                if (nodes) {
                    filteredNodes.push(
                        ...nodes.map(node => ({
                            ...node,
                            hash: `${node.hash}${countryCode ? `-${countryCode}` : ''}${region ? `-${region}` : ''}`
                        }))
                    );
                }
            } else if (lookupResult.status !== 'error') {
                const nodes = addressToNodes.get(address);
                if (nodes) {
                    nodes.forEach(node => {
                        logger.debug('⛔ 地理位置过滤 [%s:%s] -> 命中规则: %s %s', node.address, node.port, countryCode, region);
                    });
                }
            }
        }

        return filteredNodes;
    }
}

