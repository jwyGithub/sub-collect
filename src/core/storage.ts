import { StorageConfig, Node, ProtocolType } from '../config/types';
import { StorageError } from '../utils/error';
import { logger } from '../utils/logger';
import { File } from './file';

export class Storage {
    private readonly storageConfig: StorageConfig;
    private readonly file: File;

    constructor(storageConfig: StorageConfig) {
        this.storageConfig = storageConfig;
        this.file = new File(storageConfig.base_path);
    }

    /**
     * 保存节点到文件
     * @param nodes 节点列表
     */
    async saveNodes(nodes: Node[]): Promise<void> {
        try {
            // 按协议分组节点
            const groupedNodes = this.groupNodesByProtocol(nodes);

            // 保存节点
            await Promise.all(
                Array.from(groupedNodes.entries()).map(([protocol, protocolNodes]) => 
                    this.saveProtocolNodes(protocol, protocolNodes)
                )
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

        try {
            await this.file.saveProtocolNodes(filename, nodes);
        } catch (error) {
            logger.error('保存 %s 节点失败: %s', protocol.toUpperCase(), error);
            throw new StorageError(`Failed to save ${protocol} nodes: ${error}`);
        }
    }
}

