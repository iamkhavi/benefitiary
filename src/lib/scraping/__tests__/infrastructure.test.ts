/**
 * Tests for core scraping infrastructure setup
 */

import { describe, it, expect } from 'vitest';
import { existsSync } from 'fs';
import { join } from 'path';

describe('Scraping Infrastructure Setup', () => {
  const scrapingDir = join(process.cwd(), 'src', 'lib', 'scraping');

  describe('Directory Structure', () => {
    it('should have main scraping directory', () => {
      expect(existsSync(scrapingDir)).toBe(true);
    });

    it('should have types directory', () => {
      const typesDir = join(scrapingDir, 'types');
      expect(existsSync(typesDir)).toBe(true);
    });

    it('should have core directory', () => {
      const coreDir = join(scrapingDir, 'core');
      expect(existsSync(coreDir)).toBe(true);
    });

    it('should have engines directory', () => {
      const enginesDir = join(scrapingDir, 'engines');
      expect(existsSync(enginesDir)).toBe(true);
    });

    it('should have processors directory', () => {
      const processorsDir = join(scrapingDir, 'processors');
      expect(existsSync(processorsDir)).toBe(true);
    });

    it('should have sources directory', () => {
      const sourcesDir = join(scrapingDir, 'sources');
      expect(existsSync(sourcesDir)).toBe(true);
    });

    it('should have utils directory', () => {
      const utilsDir = join(scrapingDir, 'utils');
      expect(existsSync(utilsDir)).toBe(true);
    });

    it('should have monitoring directory', () => {
      const monitoringDir = join(scrapingDir, 'monitoring');
      expect(existsSync(monitoringDir)).toBe(true);
    });

    it('should have config directory', () => {
      const configDir = join(scrapingDir, 'config');
      expect(existsSync(configDir)).toBe(true);
    });
  });

  describe('Index Files', () => {
    it('should have main index file', () => {
      const indexFile = join(scrapingDir, 'index.ts');
      expect(existsSync(indexFile)).toBe(true);
    });

    it('should have types index file', () => {
      const typesIndex = join(scrapingDir, 'types', 'index.ts');
      expect(existsSync(typesIndex)).toBe(true);
    });

    it('should have core index file', () => {
      const coreIndex = join(scrapingDir, 'core', 'index.ts');
      expect(existsSync(coreIndex)).toBe(true);
    });

    it('should have engines index file', () => {
      const enginesIndex = join(scrapingDir, 'engines', 'index.ts');
      expect(existsSync(enginesIndex)).toBe(true);
    });

    it('should have processors index file', () => {
      const processorsIndex = join(scrapingDir, 'processors', 'index.ts');
      expect(existsSync(processorsIndex)).toBe(true);
    });

    it('should have sources index file', () => {
      const sourcesIndex = join(scrapingDir, 'sources', 'index.ts');
      expect(existsSync(sourcesIndex)).toBe(true);
    });

    it('should have monitoring index file', () => {
      const monitoringIndex = join(scrapingDir, 'monitoring', 'index.ts');
      expect(existsSync(monitoringIndex)).toBe(true);
    });

    it('should have config index file', () => {
      const configIndex = join(scrapingDir, 'config', 'index.ts');
      expect(existsSync(configIndex)).toBe(true);
    });
  });

  describe('Module Imports', () => {
    it('should be able to import main scraping module', async () => {
      const scrapingModule = await import('../index');
      expect(scrapingModule).toBeDefined();
    });

    it('should be able to import types', async () => {
      const typesModule = await import('../types');
      expect(typesModule.ScrapedSourceType).toBeDefined();
      expect(typesModule.ScrapingFrequency).toBeDefined();
      expect(typesModule.GrantCategory).toBeDefined();
    });

    it('should be able to import config', async () => {
      const configModule = await import('../config');
      expect(configModule.loadScrapingConfig).toBeDefined();
      expect(configModule.validateScrapingConfig).toBeDefined();
    });

    it('should be able to import utils', async () => {
      const utilsModule = await import('../utils');
      expect(utilsModule).toBeDefined();
    });
  });

  describe('Environment Variables', () => {
    it('should handle missing environment variables gracefully', async () => {
      const { loadScrapingConfig } = await import('../config');
      const config = loadScrapingConfig();
      
      expect(config).toBeDefined();
      expect(config.scheduler).toBeDefined();
      expect(config.rateLimit).toBeDefined();
      expect(config.browser).toBeDefined();
      expect(config.staticParser).toBeDefined();
    });
  });
});