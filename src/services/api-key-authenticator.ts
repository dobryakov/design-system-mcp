import logger from '../utils/logger.js';

/**
 * Validates API key against configured API keys
 */
export class ApiKeyAuthenticator {
  private validApiKeys: Set<string>;

  constructor() {
    const apiKeysEnv = process.env.API_KEYS;
    if (!apiKeysEnv) {
      logger.warn('API_KEYS environment variable not set. Authentication will fail.');
      this.validApiKeys = new Set();
    } else {
      this.validApiKeys = new Set(apiKeysEnv.split(',').map((key) => key.trim()).filter(Boolean));
    }
  }

  /**
   * Validate an API key
   */
  validate(apiKey: string | undefined): boolean {
    if (!apiKey) {
      return false;
    }
    return this.validApiKeys.has(apiKey);
  }

  /**
   * Get the number of configured API keys
   */
  getKeyCount(): number {
    return this.validApiKeys.size;
  }
}

export const apiKeyAuthenticator = new ApiKeyAuthenticator();

