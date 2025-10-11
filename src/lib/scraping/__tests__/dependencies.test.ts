/**
 * Tests for required scraping dependencies
 */

import { describe, it, expect } from 'vitest';

describe('Scraping Dependencies', () => {
  describe('Required Packages', () => {
    it('should have cheerio available', async () => {
      const cheerio = await import('cheerio');
      expect(cheerio.load).toBeDefined();
    });

    it('should have playwright available', async () => {
      const playwright = await import('playwright');
      expect(playwright.chromium).toBeDefined();
      expect(playwright.firefox).toBeDefined();
      expect(playwright.webkit).toBeDefined();
    });

    it('should have axios available', async () => {
      const axios = await import('axios');
      expect(axios.default).toBeDefined();
      expect(axios.default.get).toBeDefined();
      expect(axios.default.post).toBeDefined();
    });

    it('should have redis available', async () => {
      const redis = await import('redis');
      expect(redis.createClient).toBeDefined();
    });

    it('should have ioredis available', async () => {
      const ioredis = await import('ioredis');
      expect(ioredis.default).toBeDefined();
    });
  });

  describe('Node.js Built-ins', () => {
    it('should have crypto available', async () => {
      const crypto = await import('crypto');
      expect(crypto.createHash).toBeDefined();
      expect(crypto.randomBytes).toBeDefined();
    });

    it('should have fs available', async () => {
      const fs = await import('fs');
      expect(fs.existsSync).toBeDefined();
      expect(fs.readFileSync).toBeDefined();
    });

    it('should have path available', async () => {
      const path = await import('path');
      expect(path.join).toBeDefined();
      expect(path.resolve).toBeDefined();
    });

    it('should have url available', async () => {
      const url = await import('url');
      expect(url.URL).toBeDefined();
      expect(url.parse).toBeDefined();
    });
  });

  describe('TypeScript Support', () => {
    it('should support TypeScript interfaces', () => {
      // This test verifies that TypeScript compilation works
      interface TestInterface {
        id: string;
        name: string;
      }

      const testObject: TestInterface = {
        id: 'test',
        name: 'Test Object'
      };

      expect(testObject.id).toBe('test');
      expect(testObject.name).toBe('Test Object');
    });

    it('should support TypeScript enums', () => {
      enum TestEnum {
        VALUE_ONE = 'VALUE_ONE',
        VALUE_TWO = 'VALUE_TWO'
      }

      expect(TestEnum.VALUE_ONE).toBe('VALUE_ONE');
      expect(TestEnum.VALUE_TWO).toBe('VALUE_TWO');
    });
  });
});