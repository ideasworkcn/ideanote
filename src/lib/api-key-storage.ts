// API Key 存储管理
export class ApiKeyStorage {
  private static readonly STORAGE_KEY_PREFIX = 'api_key_';

  // 简单的Base64编码（仅用于混淆，不是真正的加密）
  private static encode(text: string): string {
    return btoa(text);
  }

  private static decode(encoded: string): string {
    try {
      return atob(encoded);
    } catch {
      return '';
    }
  }

  static async setApiKey(apiKey: string, model: string = 'deepseek'): Promise<{ success: boolean; error?: string }> {
    try {
      const storageKey = this.STORAGE_KEY_PREFIX + model;
      if (apiKey.trim() === '') {
        localStorage.removeItem(storageKey);
      } else {
        const encoded = this.encode(apiKey);
        localStorage.setItem(storageKey, encoded);
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  static async getApiKey(model: string = 'deepseek'): Promise<{ success: boolean; apiKey?: string; error?: string }> {
    try {
      const storageKey = this.STORAGE_KEY_PREFIX + model;
      const encoded = localStorage.getItem(storageKey);
      if (!encoded) {
        return { success: true, apiKey: '' };
      }
      const apiKey = this.decode(encoded);
      return { success: true, apiKey };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  static async hasApiKey(model: string = 'deepseek'): Promise<boolean> {
    const result = await this.getApiKey(model);
    return result.success && !!result.apiKey;
  }

  static async clearApiKey(model: string = 'deepseek'): Promise<{ success: boolean; error?: string }> {
    return this.setApiKey('', model);
  }
}