import { BaseParser } from './base';
import { VmessNode } from '../../config/types';
import { base64Decode } from '../../utils/base64';
import { ParseError } from '../../utils/error';
import { tryUrlDecode } from 'cloudflare-tools';
import { formatPs } from '@/utils';

interface VmessConfig {
    v: string;
    ps: string;
    add: string;
    port: number;
    id: string;
    aid?: number;
    net?: string;
    type?: string;
    tls?: string;
    path?: string;
}

export class VmessParser extends BaseParser {
    constructor() {
        super('vmess');
    }

    parseLine(line: string): VmessNode {
        try {
            const _sub = line.replace('vmess://', '');
            const config = JSON.parse(base64Decode(_sub)) as VmessConfig;
            return {
                protocol: 'vmess',
                address: config.add,
                port: config.port.toString(),
                hash: `#${formatPs(tryUrlDecode(config.ps))}`
            };
        } catch (error) {
            throw new ParseError(`Failed to parse Vmess config: ${error}`);
        }
    }
}

