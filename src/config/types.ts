export interface StorageConfig {
    base_path: string;
    files: {
        vless: string;
        vmess: string;
        trojan: string;
        ssr: string;
        ss: string;
        hysteria: string;
        hysteria2: string;
    };
}
export interface LoggerConfig {
    level: string;
    pretty: boolean;
}

// 过滤规则配置接口
export interface FilterRules {
    patterns: string[];
    countryCodes: string[];
}

// 基础配置接口（default.yaml）
export interface BaseConfig {
    storage: StorageConfig;
    logger: LoggerConfig;
    filter: FilterRules;
}

// 环境配置接口（development.yaml 或环境变量）
export interface EnvConfig {
    subs: {
        vless: string;
        trojan: string;
    };
    cloudflare: {
        token: string;
        account_id: string;
        zone_id: string;
    };
}

// 完整配置接口
export interface Config extends BaseConfig, EnvConfig {}

// 支持的协议类型
export type ProtocolType = 'vmess' | 'vless' | 'trojan' | 'ssr' | 'ss' | 'hysteria' | 'hysteria2';

// 解析后的节点基础接口
export interface BaseNode {
    protocol: ProtocolType;
    address: string;
    port: string;
    hash: string;
}

// 各协议特定的配置接口
export interface VmessNode extends BaseNode {
    protocol: 'vmess';
}

export interface VlessNode extends BaseNode {
    protocol: 'vless';
}

export interface TrojanNode extends BaseNode {
    protocol: 'trojan';
}

export interface SsrNode extends BaseNode {
    protocol: 'ssr';
}

export interface SsNode extends BaseNode {
    protocol: 'ss';
}

export interface HysteriaNode extends BaseNode {
    protocol: 'hysteria';
}

export interface Hysteria2Node extends BaseNode {
    protocol: 'hysteria2';
}

export type Node = VmessNode | VlessNode | TrojanNode | SsrNode | SsNode | HysteriaNode | Hysteria2Node;

