import { BaseParser } from './base';
import { SsrNode } from '../../config/types';
import { base64Decode } from '../../utils/base64';
import { ParseError } from '../../utils/error';
import { REMARKS_REG, SSR_REG } from '@/const';
import { tryBase64Decode } from 'cloudflare-tools';
import { formatPs } from '@/utils';

export class SsrParser extends BaseParser {
    constructor() {
        super('ssr');
    }

    parseLine(line: string): SsrNode {
        try {
            const _sub = line.replace('ssr://', '');
            const content = base64Decode(_sub);
            const match = content.match(SSR_REG);
            if (!match) {
                throw new ParseError('error on parseSSRLink');
            }
            const [_, host, port] = match;
            const [__, base64] = content.match(REMARKS_REG) || [];

            return {
                protocol: 'ssr',
                address: host,
                port,
                hash: `#${formatPs(tryBase64Decode(base64))}`
            };
        } catch (error) {
            throw new ParseError(`Failed to parse SSR config: ${error}`);
        }
    }
}

