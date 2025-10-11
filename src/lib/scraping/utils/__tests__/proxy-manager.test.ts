import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { ProxyManager, ProxyPool, globalProxyPool, ProxyConfig } from '../proxy-manager';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

// Mock setTimeout
vi.mock('timers/promises', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    setTimeout: vi.fn().mockResolvedValue(undefined)
  };
});

describe('ProxyManager', () => {
  let proxyManager: ProxyManager;
  let mockProxies: ProxyConfig[];
  let mockAxiosInstance: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockProxies = [
      { host: 'proxy1.com', port: 8080, type: 'http' },
      { host: 'proxy2.com', port: 8080, type: 'http' },
      { host: 'proxy3.com', port: 8080, type: 'http' }
    ];

    mockAxiosInstance = {
      get: vi.fn()
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);
  });

  afterEach(() => {
    if (proxyManager) {
      proxyManager.destroy();
    }
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should initialize with proxies and default config', () => {
      proxyManager = new ProxyManager(mockProxies);
      
      expect(proxyManager.getTotalProxyCount()).toBe(3);
      expect(proxyManager.getHealthyProxyCount()).toBe(3); // Initially all healthy
    });

    it('should initialize with custom config', () => {
      const customConfig = {
        healthCheckInterval: 60000,
        maxErrorCount: 5,
        rotationStrategy: 'random' as const
      };

      proxyManager = new ProxyManager(mockProxies, customConfig);
      
      expect(proxyManager.getTotalProxyCount()).toBe(3);
    });
  });

  describe('proxy health checking', () => {
    beforeEach(() => {
      proxyManager = new ProxyManager(mockProxies, {
        healthCheckInterval: 1000,
        healthCheckTimeout: 5000
      });
    });

    it('should check proxy health successfully', async () => {
      mockAxiosInstance.get.mockResolvedValue({ status: 200, data: { origin: '1.2.3.4' } });

      const isHealthy = await proxyManager.checkProxyHealth(mockProxies[0]);
      
      expect(isHealthy).toBe(true);
      expect(mockedAxios.create).toHaveBeenCalledWith({
        timeout: 5000,
        proxy: {
          host: 'proxy1.com',
          port: 8080,
          auth: undefined
        }
      });
    });

    it('should handle proxy health check failure', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Connection failed'));

      const isHealthy = await proxyManager.checkProxyHealth(mockProxies[0]);
      
      expect(isHealthy).toBe(false);
      
      const health = proxyManager.getProxyHealth(mockProxies[0]);
      expect(health?.errorCount).toBe(1);
    });

    it('should mark proxy as unhealthy after max errors', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('Connection failed'));

      // Fail 3 times (default maxErrorCount)
      await proxyManager.checkProxyHealth(mockProxies[0]);
      await proxyManager.checkProxyHealth(mockProxies[0]);
      await proxyManager.checkProxyHealth(mockProxies[0]);
      
      const health = proxyManager.getProxyHealth(mockProxies[0]);
      expect(health?.isHealthy).toBe(false);
      expect(health?.errorCount).toBe(3);
    });

    it('should reset error count on successful health check', async () => {
      mockAxiosInstance.get
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockRejectedValueOnce(new Error('Connection failed'))
        .mockResolvedValueOnce({ status: 200 });

      // Fail twice
      await proxyManager.checkProxyHealth(mockProxies[0]);
      await proxyManager.checkProxyHealth(mockProxies[0]);
      
      let health = proxyManager.getProxyHealth(mockProxies[0]);
      expect(health?.errorCount).toBe(2);

      // Then succeed
      await proxyManager.checkProxyHealth(mockProxies[0]);
      
      health = proxyManager.getProxyHealth(mockProxies[0]);
      expect(health?.errorCount).toBe(0);
      expect(health?.isHealthy).toBe(true);
    });

    it('should check all proxies health', async () => {
      mockAxiosInstance.get.mockResolvedValue({ status: 200 });

      await proxyManager.checkAllProxiesHealth();
      
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(3);
    });
  });

  describe('proxy rotation strategies', () => {
    beforeEach(() => {
      proxyManager = new ProxyManager(mockProxies);
    });

    it('should use round-robin strategy', () => {
      proxyManager = new ProxyManager(mockProxies, { rotationStrategy: 'round-robin' });
      
      const proxy1 = proxyManager.getNextProxy();
      const proxy2 = proxyManager.getNextProxy();
      const proxy3 = proxyManager.getNextProxy();
      const proxy4 = proxyManager.getNextProxy(); // Should cycle back
      
      expect(proxy1).toBe(mockProxies[0]);
      expect(proxy2).toBe(mockProxies[1]);
      expect(proxy3).toBe(mockProxies[2]);
      expect(proxy4).toBe(mockProxies[0]);
    });

    it('should use random strategy', () => {
      proxyManager = new ProxyManager(mockProxies, { rotationStrategy: 'random' });
      
      const proxy = proxyManager.getNextProxy();
      
      expect(mockProxies).toContain(proxy);
    });

    it('should use least-used strategy', () => {
      proxyManager = new ProxyManager(mockProxies, { rotationStrategy: 'least-used' });
      
      // Mark first proxy as used
      proxyManager.markProxyAsUsed(mockProxies[0]);
      
      const proxy = proxyManager.getNextProxy();
      
      // Should return one of the unused proxies
      expect([mockProxies[1], mockProxies[2]]).toContain(proxy);
    });

    it('should use fastest strategy', async () => {
      proxyManager = new ProxyManager(mockProxies, { rotationStrategy: 'fastest' });
      
      // Mock different response times
      mockAxiosInstance.get.mockResolvedValue({ status: 200 });

      // Manually set response times for testing
      const health1 = proxyManager.getProxyHealth(mockProxies[0]);
      const health2 = proxyManager.getProxyHealth(mockProxies[1]);
      const health3 = proxyManager.getProxyHealth(mockProxies[2]);
      
      if (health1) health1.responseTime = 300;
      if (health2) health2.responseTime = 100; // Fastest
      if (health3) health3.responseTime = 200;
      
      const proxy = proxyManager.getNextProxy();
      
      // Should return the fastest proxy (proxy2)
      expect(proxy).toBe(mockProxies[1]);
    });

    it('should return null when no healthy proxies available', () => {
      // Mark all proxies as unhealthy
      mockProxies.forEach(proxy => {
        for (let i = 0; i < 3; i++) {
          proxyManager.markProxyAsErrored(proxy);
        }
      });
      
      const proxy = proxyManager.getNextProxy();
      expect(proxy).toBeNull();
    });
  });

  describe('proxy management', () => {
    beforeEach(() => {
      proxyManager = new ProxyManager(mockProxies);
    });

    it('should add new proxy', () => {
      const newProxy: ProxyConfig = { host: 'proxy4.com', port: 8080, type: 'http' };
      
      proxyManager.addProxy(newProxy);
      
      expect(proxyManager.getTotalProxyCount()).toBe(4);
      expect(proxyManager.getProxyHealth(newProxy)).not.toBeNull();
    });

    it('should not add duplicate proxy', () => {
      proxyManager.addProxy(mockProxies[0]);
      
      expect(proxyManager.getTotalProxyCount()).toBe(3); // Should remain the same
    });

    it('should remove proxy', () => {
      const initialCount = proxyManager.getTotalProxyCount();
      const proxyToRemove = mockProxies[0];
      
      // Verify proxy exists before removal
      expect(proxyManager.getProxyHealth(proxyToRemove)).not.toBeNull();
      
      const removed = proxyManager.removeProxy(proxyToRemove);
      
      expect(removed).toBe(true);
      expect(proxyManager.getTotalProxyCount()).toBe(initialCount - 1);
      expect(proxyManager.getProxyHealth(proxyToRemove)).toBeNull();
    });

    it('should return false when removing non-existent proxy', () => {
      const nonExistentProxy: ProxyConfig = { host: 'nonexistent.com', port: 8080, type: 'http' };
      
      const removed = proxyManager.removeProxy(nonExistentProxy);
      
      expect(removed).toBe(false);
      expect(proxyManager.getTotalProxyCount()).toBe(3);
    });

    it('should mark proxy as used', () => {
      proxyManager.markProxyAsUsed(mockProxies[0]);
      
      const health = proxyManager.getProxyHealth(mockProxies[0]);
      expect(health?.successCount).toBe(1);
    });

    it('should mark proxy as errored', () => {
      proxyManager.markProxyAsErrored(mockProxies[0]);
      
      const health = proxyManager.getProxyHealth(mockProxies[0]);
      expect(health?.errorCount).toBe(1);
    });

    it('should reset proxy stats', () => {
      proxyManager.markProxyAsUsed(mockProxies[0]);
      proxyManager.markProxyAsErrored(mockProxies[0]);
      
      proxyManager.resetProxyStats(mockProxies[0]);
      
      const health = proxyManager.getProxyHealth(mockProxies[0]);
      expect(health?.successCount).toBe(0);
      expect(health?.errorCount).toBe(0);
      expect(health?.isHealthy).toBe(true);
    });

    it('should reset all proxy stats', () => {
      mockProxies.forEach(proxy => {
        proxyManager.markProxyAsUsed(proxy);
        proxyManager.markProxyAsErrored(proxy);
      });
      
      proxyManager.resetProxyStats();
      
      mockProxies.forEach(proxy => {
        const health = proxyManager.getProxyHealth(proxy);
        expect(health?.successCount).toBe(0);
        expect(health?.errorCount).toBe(0);
        expect(health?.isHealthy).toBe(true);
      });
    });
  });

  describe('proxy statistics', () => {
    beforeEach(() => {
      proxyManager = new ProxyManager(mockProxies);
    });

    it('should get proxy statistics', async () => {
      // Mock health check with response time
      mockAxiosInstance.get.mockResolvedValue({ status: 200 });
      
      await proxyManager.checkProxyHealth(mockProxies[0]);
      
      const stats = proxyManager.getProxyStats();
      
      expect(stats.total).toBe(3);
      expect(stats.healthy).toBe(3);
      expect(stats.unhealthy).toBe(0);
      expect(typeof stats.averageResponseTime).toBe('number');
    });

    it('should get all proxy health info', () => {
      const allHealth = proxyManager.getAllProxyHealth();
      
      expect(allHealth).toHaveLength(3);
      allHealth.forEach(health => {
        expect(health).toHaveProperty('proxy');
        expect(health).toHaveProperty('isHealthy');
        expect(health).toHaveProperty('lastChecked');
        expect(health).toHaveProperty('errorCount');
        expect(health).toHaveProperty('successCount');
      });
    });
  });

  describe('cleanup', () => {
    it('should destroy properly', () => {
      proxyManager = new ProxyManager(mockProxies, { healthCheckInterval: 1000 });
      
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      
      proxyManager.destroy();
      
      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });
});

describe('ProxyPool', () => {
  let proxyPool: ProxyPool;
  let mockProxies: ProxyConfig[];

  beforeEach(() => {
    vi.clearAllMocks();
    proxyPool = new ProxyPool();
    mockProxies = [
      { host: 'proxy1.com', port: 8080, type: 'http' },
      { host: 'proxy2.com', port: 8080, type: 'http' }
    ];
  });

  afterEach(() => {
    proxyPool.destroy();
  });

  it('should create proxy pool', () => {
    const manager = proxyPool.createPool('test-pool', mockProxies);
    
    expect(manager).toBeInstanceOf(ProxyManager);
    expect(manager.getTotalProxyCount()).toBe(2);
  });

  it('should get proxy pool', () => {
    const manager1 = proxyPool.createPool('test-pool', mockProxies);
    const manager2 = proxyPool.getPool('test-pool');
    
    expect(manager1).toBe(manager2);
  });

  it('should return null for non-existent pool', () => {
    const manager = proxyPool.getPool('non-existent');
    
    expect(manager).toBeNull();
  });

  it('should remove proxy pool', () => {
    proxyPool.createPool('test-pool', mockProxies);
    
    const removed = proxyPool.removePool('test-pool');
    
    expect(removed).toBe(true);
    expect(proxyPool.getPool('test-pool')).toBeNull();
  });

  it('should return false when removing non-existent pool', () => {
    const removed = proxyPool.removePool('non-existent');
    
    expect(removed).toBe(false);
  });

  it('should get all pools', () => {
    proxyPool.createPool('pool1', mockProxies);
    proxyPool.createPool('pool2', mockProxies);
    
    const allPools = proxyPool.getAllPools();
    
    expect(allPools.size).toBe(2);
    expect(allPools.has('pool1')).toBe(true);
    expect(allPools.has('pool2')).toBe(true);
  });

  it('should destroy all pools', () => {
    const manager1 = proxyPool.createPool('pool1', mockProxies);
    const manager2 = proxyPool.createPool('pool2', mockProxies);
    
    const destroySpy1 = vi.spyOn(manager1, 'destroy');
    const destroySpy2 = vi.spyOn(manager2, 'destroy');
    
    proxyPool.destroy();
    
    expect(destroySpy1).toHaveBeenCalled();
    expect(destroySpy2).toHaveBeenCalled();
    expect(proxyPool.getAllPools().size).toBe(0);
  });
});

describe('globalProxyPool', () => {
  beforeEach(() => {
    globalProxyPool.destroy(); // Clean state
  });

  afterEach(() => {
    globalProxyPool.destroy();
  });

  it('should be a ProxyPool instance', () => {
    expect(globalProxyPool).toBeInstanceOf(ProxyPool);
  });

  it('should maintain state across calls', () => {
    const mockProxies: ProxyConfig[] = [
      { host: 'proxy1.com', port: 8080, type: 'http' }
    ];
    
    globalProxyPool.createPool('test', mockProxies);
    
    const manager = globalProxyPool.getPool('test');
    expect(manager).not.toBeNull();
    expect(manager!.getTotalProxyCount()).toBe(1);
  });
});