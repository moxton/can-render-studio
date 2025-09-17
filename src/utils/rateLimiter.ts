// Rate limiter with local storage persistence
class RateLimiter {
  private calls: number[] = [];
  private maxCalls: number;
  private timeWindow: number; // in milliseconds
  private storageKey: string;

  constructor(maxCalls: number, timeWindowMinutes: number, storageKey: string = 'api_rate_limit') {
    this.maxCalls = maxCalls;
    this.timeWindow = timeWindowMinutes * 60 * 1000;
    this.storageKey = storageKey;
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.calls = data.calls || [];
      }
    } catch (error) {
      console.warn('Failed to load rate limit data from storage:', error);
      this.calls = [];
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify({
        calls: this.calls,
        lastUpdated: Date.now()
      }));
    } catch (error) {
      console.warn('Failed to save rate limit data to storage:', error);
    }
  }

  canMakeCall(): boolean {
    const now = Date.now();
    
    // Remove calls outside the time window
    this.calls = this.calls.filter(callTime => now - callTime < this.timeWindow);
    this.saveToStorage();
    
    return this.calls.length < this.maxCalls;
  }

  recordCall(): void {
    this.calls.push(Date.now());
    this.saveToStorage();
  }

  getTimeUntilNextCall(): number {
    if (this.calls.length < this.maxCalls) return 0;
    
    const oldestCall = Math.min(...this.calls);
    const timeUntilReset = this.timeWindow - (Date.now() - oldestCall);
    return Math.max(0, timeUntilReset);
  }

  getRemainingCalls(): number {
    const now = Date.now();
    this.calls = this.calls.filter(callTime => now - callTime < this.timeWindow);
    return Math.max(0, this.maxCalls - this.calls.length);
  }

  reset(): void {
    this.calls = [];
    this.saveToStorage();
  }
}

// Anonymous users: 5 calls per day
export const anonymousRateLimiter = new RateLimiter(5, 1440, 'app_state_cache');

// Authenticated users: 5 calls per day  
export const userRateLimiter = new RateLimiter(5, 1440, 'user_session_data');