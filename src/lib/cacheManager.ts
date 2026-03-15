/**
 * Mock Cache Manager to simulate Redis in an Enterprise environment.
 * Reuses responses for identical prompts to save API cost.
 */
import { eventBus } from "./eventBus.js";
class EnterpriseCache {
  private store: Map<string, { value: any; expiry: number }> = new Map();
  private ttlMs: number = 60 * 1000 * 5; // 5 minutes

  generateKey(mode: string, prompt: string, sessionId: string): string {
    return `${mode}:${sessionId}:${Buffer.from(prompt).toString('base64').substring(0, 32)}`;
  }

  get(key: string): any | null {
    const item = this.store.get(key);
    if (!item) {
      eventBus.publish({ topic: "LLM_CACHE", message: `MISS for key: ${key}` });
      return null;
    }
    if (Date.now() > item.expiry) {
      this.store.delete(key);
      eventBus.publish({ topic: "LLM_CACHE", message: `EXPIRED for key: ${key}` });
      return null;
    }
    eventBus.publish({ topic: "LLM_CACHE", message: `HIT for key: ${key}` });
    return item.value;
  }

  set(key: string, value: any, customTtlMs?: number) {
    this.store.set(key, {
      value,
      expiry: Date.now() + (customTtlMs || this.ttlMs)
    });
  }

  clear() {
    this.store.clear();
  }
}

export const CacheManager = new EnterpriseCache();
