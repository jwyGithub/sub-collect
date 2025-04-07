import { BaseParser } from './base';
import { Hysteria2Node } from '../../config/types';
import { ParseError } from '../../utils/error';
import { base64Decode } from '@/utils/base64';
import { tryUrlDecode } from 'cloudflare-tools';
import { formatPs } from '@/utils';

export class Hysteria2Parser extends BaseParser {
    constructor() {
        super('hysteria2');
    }

    parseLine(line: string): Hysteria2Node {
        try {
            // 解析 URL
            const url = new URL(line);

            return {
                protocol: 'hysteria2',
                address: url.hostname,
                port: url.port,
                hash: formatPs(tryUrlDecode(url.hash))
            };
        } catch (error) {
            throw new ParseError(`Failed to parse Hysteria2 config: ${error}`);
        }
    }
}

