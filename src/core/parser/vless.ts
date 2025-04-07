import { BaseParser } from './base';
import { VlessNode } from '../../config/types';
import { ParseError } from '../../utils/error';
import { tryUrlDecode } from 'cloudflare-tools';
import { formatPs } from '@/utils';

export class VlessParser extends BaseParser {
    constructor() {
        super('vless');
    }

    parseLine(line: string): VlessNode {
        try {
            // 解析 URL
            const url = new URL(line);

            return {
                protocol: 'vless',
                address: url.hostname,
                port: url.port,
                hash: formatPs(tryUrlDecode(url.hash))
            };
        } catch (error) {
            throw new ParseError(`Failed to parse Vless config: ${error}`);
        }
    }
}

