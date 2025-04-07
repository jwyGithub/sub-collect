import { BaseParser } from './base';
import { SsNode } from '../../config/types';
import { base64Decode } from '../../utils/base64';
import { ParseError } from '../../utils/error';
import { tryUrlDecode } from 'cloudflare-tools';
import { formatPs } from '@/utils';

export class SsParser extends BaseParser {
    constructor() {
        super('ss');
    }

    parseLine(line: string): SsNode {
        try {
            // 解析 URL
            const url = new URL(line);

            return {
                protocol: 'ss',
                address: url.hostname,
                port: url.port,
                hash: formatPs(tryUrlDecode(url.hash))
            };
        } catch (error) {
            throw new ParseError(`Failed to parse SS config: ${error}`);
        }
    }
}

