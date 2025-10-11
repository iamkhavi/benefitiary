import axios from 'axios';
import { setTimeout } from 'timers/promises';

export interface ProxyConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
  type: 'http' | 'https' | 'socks5';
}

export interface ProxyHealth {
  proxy: ProxyConfig;
  isHealthy: boolean;
  responseTime?: number;
  lastChecked: Date;
  errorCount: number;
  successCount: number;
}

export interface ProxyManagerConfig {
  healthCheckInterval: number; // milliseconds
  healthCheckTimeout: number; // milliseconds
  maxErrorCount: number;
  rotationStrategy: 'round-robin' | 'random' | 'least-used' | 'fastest';
}

export class ProxyManager {
  private proxies: ProxyConfig[];
  private proxyHealth: Map<string, ProxyHealth> = new Map();
  private currentIndex = 0;
  private config: ProxyManagerConfig;
  private healthCheckTimer?: NodeJS.Timeout;

  constructor(proxies: ProxyConfig[], config?: Partial<ProxyManagerConfig>) {
    this.proxies = proxies;
    this.config = {
      healthCheckInterval: 300000, // 5 minutes
      healthCheckTimeout: 10000, // 10 seconds
      maxErrorCount: 3,
      rotationStrategy: 'round-robin',
      ...config
    };

    this.initializeProxyHealth();
    this.startHealthChecking();
  }

  private initializeProxyHealth(): void {
    this.proxies.forEach(proxy => {
      const key = this.getProxyKey(proxy);
      this.proxyHealth.set(key, {
        proxy,
        isHealthy: true, // Assume healthy initially
        lastChecked: new Date(),
        errorCount: 0,
        successCount: 0
      });
    });
  }

  private getProxyKey(proxy: ProxyConfig): string {
    return `${proxy.host}:${proxy.port}`;
  }

  private startHealthChecking(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    this.healthCheckTimer = setInterval(async () => {
      await this.checkAllProxiesHealth();
    }, this.config.healthCheckInterval);
  }

  async checkAllProxiesHealth(): Promise<void> {
    const healthChecks = this.proxies.map(proxy => this.checkProxyHealth(proxy));
    await Promise.allSettled(healthChecks);
  }

  async checkProxyHealth(proxy: ProxyConfig): Promise<boolean> {
    const key = this.getProxyKey(proxy);
    const health = this.proxyHealth.get(key);
    
    if (!health) {
      return false;
    }

    const startTime = Date.now();

    try {
      const testClient = axios.create({
        timeout: this.config.healthCheckTimeout,
        proxy: {
          host: proxy.host,
          port: proxy.port,
          auth: proxy.username && proxy.password ? {
            username: proxy.username,
            password: proxy.password
          } : undefined
        }
      });

      const response = await testClient.get('https://httpbin.org/ip');
      const responseTime = Date.now() - startTime;

      if (response.status === 200) {
        health.isHealthy = true;
        health.responseTime = responseTime;
        health.successCount++;
        health.errorCount = 0; // Reset error count on success
        health.lastChecked = new Date();
        return true;
      }
    } catch (error) {
      health.errorCount++;
      health.lastChecked = new Date();
      
      // Mark as unhealthy if error count exceeds threshold
      if (health.errorCount >= this.config.maxErrorCount) {
        health.isHealthy = false;
      }

      console.warn(`Proxy health check failed for ${key}:`, error);
    }

    return false;
  }

  getNextProxy(): ProxyConfig | null {
    const healthyProxies = this.getHealthyProxies();
    
    if (healthyProxies.length === 0) {
      return null;
    }

    switch (this.config.rotationStrategy) {
      case 'round-robin':
        return this.getRoundRobinProxy(healthyProxies);
      case 'random':
        return this.getRandomProxy(healthyProxies);
      case 'least-used':
        return this.getLeastUsedProxy(healthyProxies);
      case 'fastest':
        return this.getFastestProxy(healthyProxies);
      default:
        return this.getRoundRobinProxy(healthyProxies);
    }
  }

  private getRoundRobinProxy(healthyProxies: ProxyConfig[]): ProxyConfig {
    const proxy = healthyProxies[this.currentIndex % healthyProxies.length];
    this.currentIndex++;
    return proxy;
  }

  private getRandomProxy(healthyProxies: ProxyConfig[]): ProxyConfig {
    const randomIndex = Math.floor(Math.random() * healthyProxies.length);
    return healthyProxies[randomIndex];
  }

  private getLeastUsedProxy(healthyProxies: ProxyConfig[]): ProxyConfig {
    let leastUsedProxy = healthyProxies[0];
    let minUsage = Infinity;

    healthyProxies.forEach(proxy => {
      const health = this.proxyHealth.get(this.getProxyKey(proxy));
      if (health && health.successCount < minUsage) {
        minUsage = health.successCount;
        leastUsedProxy = proxy;
      }
    });

    return leastUsedProxy;
  }

  private getFastestProxy(healthyProxies: ProxyConfig[]): ProxyConfig {
    let fastestProxy = healthyProxies[0];
    let minResponseTime = Infinity;

    healthyProxies.forEach(proxy => {
      const health = this.proxyHealth.get(this.getProxyKey(proxy));
      if (health && health.responseTime && health.responseTime < minResponseTime) {
        minResponseTime = health.responseTime;
        fastestProxy = proxy;
      }
    });

    return fastestProxy;
  }

  getHealthyProxies(): ProxyConfig[] {
    return this.proxies.filter(proxy => {
      const health = this.proxyHealth.get(this.getProxyKey(proxy));
      return health && health.isHealthy;
    });
  }

  getProxyHealth(proxy: ProxyConfig): ProxyHealth | null {
    return this.proxyHealth.get(this.getProxyKey(proxy)) || null;
  }

  getAllProxyHealth(): ProxyHealth[] {
    return Array.from(this.proxyHealth.values());
  }

  getHealthyProxyCount(): number {
    return this.getHealthyProxies().length;
  }

  getTotalProxyCount(): number {
    return this.proxies.length;
  }

  addProxy(proxy: ProxyConfig): void {
    const key = this.getProxyKey(proxy);
    
    if (!this.proxyHealth.has(key)) {
      this.proxies.push(proxy);
      this.proxyHealth.set(key, {
        proxy,
        isHealthy: true,
        lastChecked: new Date(),
        errorCount: 0,
        successCount: 0
      });

      // Immediately check health of new proxy
      this.checkProxyHealth(proxy);
    }
  }

  removeProxy(proxy: ProxyConfig): boolean {
    const key = this.getProxyKey(proxy);
    const index = this.proxies.findIndex(p => this.getProxyKey(p) === key);
    
    if (index !== -1) {
      this.proxies.splice(index, 1);
      this.proxyHealth.delete(key);
      return true;
    }
    
    return false;
  }

  markProxyAsUsed(proxy: ProxyConfig): void {
    const health = this.proxyHealth.get(this.getProxyKey(proxy));
    if (health) {
      health.successCount++;
    }
  }

  markProxyAsErrored(proxy: ProxyConfig): void {
    const health = this.proxyHealth.get(this.getProxyKey(proxy));
    if (health) {
      health.errorCount++;
      
      if (health.errorCount >= this.config.maxErrorCount) {
        health.isHealthy = false;
      }
    }
  }

  resetProxyStats(proxy?: ProxyConfig): void {
    if (proxy) {
      const health = this.proxyHealth.get(this.getProxyKey(proxy));
      if (health) {
        health.errorCount = 0;
        health.successCount = 0;
        health.isHealthy = true;
      }
    } else {
      this.proxyHealth.forEach(health => {
        health.errorCount = 0;
        health.successCount = 0;
        health.isHealthy = true;
      });
    }
  }

  getProxyStats(): {
    total: number;
    healthy: number;
    unhealthy: number;
    averageResponseTime: number;
  } {
    const total = this.proxies.length;
    const healthy = this.getHealthyProxyCount();
    const unhealthy = total - healthy;
    
    const responseTimes = Array.from(this.proxyHealth.values())
      .filter(health => health.responseTime !== undefined)
      .map(health => health.responseTime!);
    
    const averageResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0;

    return {
      total,
      healthy,
      unhealthy,
      averageResponseTime
    };
  }

  destroy(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }
  }
}

export class ProxyPool {
  private pools: Map<string, ProxyManager> = new Map();

  createPool(name: string, proxies: ProxyConfig[], config?: Partial<ProxyManagerConfig>): ProxyManager {
    const manager = new ProxyManager(proxies, config);
    this.pools.set(name, manager);
    return manager;
  }

  getPool(name: string): ProxyManager | null {
    return this.pools.get(name) || null;
  }

  removePool(name: string): boolean {
    const manager = this.pools.get(name);
    if (manager) {
      manager.destroy();
      this.pools.delete(name);
      return true;
    }
    return false;
  }

  getAllPools(): Map<string, ProxyManager> {
    return new Map(this.pools);
  }

  destroy(): void {
    this.pools.forEach(manager => manager.destroy());
    this.pools.clear();
  }
}

// Global proxy pool instance
export const globalProxyPool = new ProxyPool();