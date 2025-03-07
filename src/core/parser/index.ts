import { ProtocolType } from '../../config/types';
import { VmessParser } from './vmess';
import { VlessParser } from './vless';
import { TrojanParser } from './trojan';
import { SsrParser } from './ssr';
import { SsParser } from './ss';
import { HysteriaParser } from './hysteria';
import { Hysteria2Parser } from './hysteria2';
import { BaseParser } from './base';

export class ParserFactory {
    private static parsers = new Map<ProtocolType, BaseParser>([
        ['vmess', new VmessParser()],
        ['vless', new VlessParser()],
        ['trojan', new TrojanParser()],
        ['ssr', new SsrParser()],
        ['ss', new SsParser()],
        ['hysteria', new HysteriaParser()],
        ['hysteria2', new Hysteria2Parser()]
    ] as const);

    static getParser(protocol: ProtocolType): BaseParser {
        const parser = this.parsers.get(protocol);
        if (!parser) {
            throw new Error(`No parser found for protocol: ${protocol}`);
        }
        return parser;
    }
}

export * from './base';
export * from './vmess';
export * from './vless';
export * from './trojan';
export * from './ssr';
export * from './ss';
export * from './hysteria';
export * from './hysteria2';

