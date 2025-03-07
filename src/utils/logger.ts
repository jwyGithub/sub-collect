import pino from 'pino';
import { config } from '../config';

// 定义日志级别对应的表情
const levelEmojis = {
    trace: '🔍',
    debug: '🐛',
    info: '📝',
    warn: '⚠️',
    error: '❌',
    fatal: '💀'
} as const;

// 创建一个代理记录器来添加表情
const createProxyLogger = (baseLogger: pino.Logger) => {
    const handler: ProxyHandler<pino.Logger> = {
        get(target, property) {
            if (property === 'level' || property === 'child') {
                return target[property as keyof pino.Logger];
            }

            if (typeof target[property as keyof pino.Logger] === 'function') {
                return (...args: any[]) => {
                    if (typeof args[0] === 'string') {
                        const level = property as keyof typeof levelEmojis;
                        const emoji = levelEmojis[level] || '';
                        args[0] = `${emoji} ${args[0]}`;
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

