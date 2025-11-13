interface IFoodCache {
  data: IFoodDetails;
  timestamp: number;
}

const MAX_CACHE_SIZE = 1000;
const CACHE_TTL_MS = 24 * 60 * 1000;

export class FoodCache {
  private cache = new Map<string, IFoodCache>();

  public get(key: string): IFoodCache | undefined {
    const cacheItem = this.cache.get(key);
    if (!cacheItem) {
      return undefined;
    }
    if (cacheItem.timestamp + CACHE_TTL_MS < Date.now()) {
      this.cache.delete(key);
      return undefined;
    }
    return cacheItem;
  }

  public set(key: string, value: IFoodDetails): void {
    if (this.cache.size >= MAX_CACHE_SIZE) {
      this.cleanup();
    }

    this.cache.set(key, {
      data: value,
      timestamp: Date.now(),
    });
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete = Array.from(this.cache.keys()).filter((key) => {
      const cacheItem = this.cache.get(key);
      if (!cacheItem) {
        return false;
      }
      return cacheItem.timestamp + CACHE_TTL_MS < now;
    });
    keysToDelete.forEach((key) => {
      this.cache.delete(key);
    });
  }
}
