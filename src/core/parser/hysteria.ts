import { BaseParser } from './base';
import { HysteriaNode } from '../../config/types';
import { ParseError } from '../../utils/error';
import { tryUrlDecode } from 'cloudflare-tools';

export class HysteriaParser extends BaseParser {
    constructor() {
        super('hysteria');
    }

    parseLine(line: string): HysteriaNode {
        try {
            // 解析 URL
            const url = new URL(line);

            return {
                protocol: 'hysteria',
                address: url.hostname,
                port: url.port,
                hash: tryUrlDecode(url.hash).replace('|', '-')
            };
        } catch (error) {
            throw new ParseError(`Failed to parse Hysteria config: ${error}`);
        }
    }
}

