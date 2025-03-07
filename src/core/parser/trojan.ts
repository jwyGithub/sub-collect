import { BaseParser } from './base';
import { TrojanNode } from '../../config/types';
import { ParseError } from '../../utils/error';
import { base64Decode } from '@/utils/base64';
import { tryUrlDecode } from 'cloudflare-tools';

export class TrojanParser extends BaseParser {
    constructor() {
        super('trojan');
    }

    parseLine(line: string): TrojanNode {
        try {
            // 解析 URL
            const url = new URL(line);

            return {
                protocol: 'trojan',
                address: url.hostname,
                port: url.port,
                hash: tryUrlDecode(url.hash).replace('|', '-')
            };
        } catch (error) {
            throw new ParseError(`Failed to parse Trojan config: ${error}`);
        }
    }
}

