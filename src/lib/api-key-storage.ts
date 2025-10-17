// API Key 存储管理
export class ApiKeyStorage {
  private static readonly STORAGE_KEY = 'deepseek_api_key';

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

  static async setApiKey(apiKey: string): Promise<{ success: boolean; error?: string }> {
    try {
      if (apiKey.trim() === '') {
        localStorage.removeItem(this.STORAGE_KEY);
      } else {
        const encoded = this.encode(apiKey);
        localStorage.setItem(this.STORAGE_KEY, encoded);
      }
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  static async getApiKey(): Promise<{ success: boolean; apiKey?: string; error?: string }> {
    try {
      const encoded = localStorage.getItem(this.STORAGE_KEY);
      if (!encoded) {
        return { success: true, apiKey: '' };
      }
      const apiKey = this.decode(encoded);
      return { success: true, apiKey };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  static async hasApiKey(): Promise<boolean> {
    const result = await this.getApiKey();
    return result.success && !!result.apiKey;
  }

  static async clearApiKey(): Promise<{ success: boolean; error?: string }> {
    return this.setApiKey('');
  }
}