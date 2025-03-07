import pino from 'pino';
import { config } from '../config';

// 定义日志级别对应的标记
const levelTags = {
    trace: '[TRACE]',
    debug: '[DEBUG]',
    info: '[INFO]',
    warn: '[WARN]',
    error: '[ERROR]',
    fatal: '[FATAL]'
} as const;

// 创建一个代理记录器来添加标记
const createProxyLogger = (baseLogger: pino.Logger) => {
    const handler: ProxyHandler<pino.Logger> = {
        get(target, property) {
            if (property === 'level' || property === 'child') {
                return target[property as keyof pino.Logger];
            }

            if (typeof target[property as keyof pino.Logger] === 'function') {
                return (...args: any[]) => {
                    if (typeof args[0] === 'string') {
                        const level = property as keyof typeof levelTags;
                        const tag = levelTags[level] || '';
                        args[0] = `${tag} ${args[0]}`;
                    }
                    return (target[property as keyof pino.Logger] as Function).apply(target, args);
                };
            }

            return target[property as keyof pino.Logger];
        }
    };

    return new Proxy(baseLogger, handler);
};

const baseLogger = pino({
    level: config.logger.level,
    transport: config.logger.pretty
        ? {
              target: 'pino-pretty',
              options: {
                  colorize: true,
                  translateTime: '[HH:MM:ss]',
                  ignore: 'pid,hostname',
                  singleLine: true,
                  levelFirst: false
              }
          }
        : undefined,
    formatters: {
        level: label => {
            return { level: label.toUpperCase() };
        }
    },
    base: undefined
});

export const logger = createProxyLogger(baseLogger);

