import { tryBase64Decode, tryBase64Encode } from 'cloudflare-tools';

/**
 * Base64 解码
 * @param str Base64 字符串
 * @returns 解码后的字符串
 */
export function base64Decode(str: string): string {
    try {
        return tryBase64Decode(str);
    } catch (error) {
        throw new Error(`Failed to decode base64 string: ${error}`);
    }
}

/**
 * Base64 编码
 * @param str 原始字符串
 * @returns Base64 字符串
 */
export function base64Encode(str: string): string {
    try {
        return tryBase64Encode(str);
    } catch (error) {
        throw new Error(`Failed to encode string to base64: ${error}`);
    }
}

