import { parse } from 'yaml';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { Config, BaseConfig, EnvConfig } from './types';

// 加载配置文件
function loadConfigFile<T>(filename: string): T {
    try {
        const configPath = join(process.cwd(), 'config', filename);
        if (!existsSync(configPath)) {
            throw new Error(`Config file not found: ${filename}`);
        }
        const fileContents = readFileSync(configPath, 'utf8');
        return parse(fileContents) as T;
    } catch (error) {
        throw new Error(`Failed to load config file ${filename}: ${error}`);
    }
}

// 从环境变量加载订阅配置
function loadSubsFromEnv(): EnvConfig['subs'] {
    const subsEnv = process.env.SUBS;
    if (!subsEnv) {
        return [];
    }

    try {
        return JSON.parse(subsEnv);
    } catch (error) {
        throw new Error(`Failed to parse SUBS environment variable: ${error}`);
    }
}

// 加载环境配置
function loadEnvConfig(): EnvConfig {
    const isDev = process.env.NODE_ENV !== 'production';

    // 生产环境：从环境变量加载
    if (!isDev) {
        return {
            subs: loadSubsFromEnv()
        };
    }

    // 开发环境：尝试从 development.yaml 加载
    try {
        return loadConfigFile<EnvConfig>('development.yaml');
    } catch (error) {
        console.warn('开发环境配置加载失败，使用空订阅列表:', error);
        return {
            subs: []
        };
    }
}

// 合并配置
function mergeConfig(baseConfig: BaseConfig, envConfig: EnvConfig): Config {
    return {
        ...baseConfig,
        ...envConfig
    };
}

// 加载基础配置
const baseConfig = loadConfigFile<BaseConfig>('default.yaml');

// 加载环境配置
const envConfig = loadEnvConfig();

// 导出合并后的配置
export const config = mergeConfig(baseConfig, envConfig);

