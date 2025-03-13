import { writeFile, mkdir } from 'fs/promises';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { logger } from '../utils/logger';
import { Node } from '../config/types';
import { base64Decode } from '@/utils/base64';

export class File {
    private readonly basePath: string;

    constructor(basePath: string) {
        this.basePath = basePath;
    }

    /**
     * 确保目录存在
     * @param dirPath 目录路径
     */
    public async ensureDir(dirPath: string = this.basePath): Promise<void> {
        try {
            await mkdir(dirPath, { recursive: true });
        } catch (error) {
            logger.error('创建目录失败: %s (%s)', dirPath, error);
            throw error;
        }
    }

    /**
     * 同步确保目录存在
     * @param dirPath 目录路径
     */
    public ensureDirSync(dirPath: string = this.basePath): void {
        try {
            mkdirSync(dirPath, { recursive: true });
        } catch (error) {
            logger.error('创建目录失败: %s (%s)', dirPath, error);
            throw error;
        }
    }

    /**
     * 写入文件
     * @param filename 文件名
     * @param content 文件内容
     */
    public async writeFile(filename: string, content: string): Promise<void> {
        const filepath = join(this.basePath, filename);
        try {
            await this.ensureDir();
            await writeFile(filepath, content);
            logger.debug('文件写入成功: %s', filepath);
        } catch (error) {
            logger.error('文件写入失败: %s (%s)', filepath, error);
            throw error;
        }
    }

    /**
     * 同步写入文件
     * @param filename 文件名
     * @param content 文件内容
     */
    public writeFileSync(filename: string, content: string): void {
        const filepath = join(this.basePath, filename);
        try {
            this.ensureDirSync();
            writeFileSync(filepath, content);
            logger.debug('文件写入成功: %s', filepath);
        } catch (error) {
            logger.error('文件写入失败: %s (%s)', filepath, error);
            throw error;
        }
    }

    /**
     * 保存原始订阅内容
     * @param subscriptions 订阅内容列表
     */
    public async saveOriginalContent(subscriptions: Array<{ name: string; content: string; success: boolean }>): Promise<void> {
        const allContent = subscriptions.map(sub => base64Decode(sub.content).split('\n')).flat();
        await this.writeFile('all.txt', allContent.join('\n'));
        logger.info('原始订阅内容已保存到 %s', join(this.basePath, 'all.txt'));
    }

    /**
     * 保存协议节点
     * @param filename 文件名
     * @param nodes 节点列表
     */
    public async saveProtocolNodes(filename: string, nodes: Node[]): Promise<void> {
        const content = nodes.map(node => `${node.address}:${node.port}${node.hash}`).join('\n');

        await this.writeFile(filename, content);
        logger.info('已保存 %d 个节点到 %s', nodes.length, join(this.basePath, filename));
    }
}

