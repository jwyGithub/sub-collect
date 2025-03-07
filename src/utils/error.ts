export class SubCollectError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'SubCollectError';
  }
}

export class FetchError extends SubCollectError {
  constructor(message: string) {
    super(message, 'FETCH_ERROR');
  }
}

export class ParseError extends SubCollectError {
  constructor(message: string) {
    super(message, 'PARSE_ERROR');
  }
}

export class StorageError extends SubCollectError {
  constructor(message: string) {
    super(message, 'STORAGE_ERROR');
  }
}

export class ConfigError extends SubCollectError {
  constructor(message: string) {
    super(message, 'CONFIG_ERROR');
  }
} 
