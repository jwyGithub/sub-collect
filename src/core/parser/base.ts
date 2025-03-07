import { Node, ProtocolType } from '../../config/types';
import { ParseError } from '../../utils/error';
import { logger } from '../../utils/logger';
import { base64Decode } from '../../utils/base64';

export abstract class BaseParser {
    protected protocol: ProtocolType;

    constructor(protocol: ProtocolType) {
        this.protocol = protocol;
    }

    /**
     * 解析单个节点
     * @param line 节点配置行
     */
    abstract parseLine(line: string): Node;

    /**
     * 解析所有节点
     * @param content 订阅内容
     */
    parseContent(content: string): Node[] {
        try {
            // 解码订阅内容
            const decodedContent = base64Decode(content);

            // 按行分割
            const lines = decodedContent.split('\n').filter(line => line.trim());

            const nodes: Node[] = [];

            // 解析每一行
            for (const line of lines) {
                try {
                    if (this.canParse(line)) {
                        const node = this.parseLine(line);
                        nodes.push(node);
                    }
                } catch (error) {
                    logger.warn({ line, error }, '解析节点失败');
                }
            }

            return nodes;
        } catch (error) {
            logger.error({ error }, '解析订阅内容失败');
            throw new ParseError(`Failed to parse subscription content: ${error}`);
        }
    }

    /**
     * 检查是否可以解析该行
     * @param line 配置行
     */
    protected canParse(line: string): boolean {
        return line.toLowerCase().startsWith(`${this.protocol}://`);
    }
}

