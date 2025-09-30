import { describe, it, expect } from 'vitest';
import { getRoleDisplayName, getRoleDescription, getDashboardPath } from '../dashboard-utils';

describe('Dashboard Utils', () => {
  describe('getRoleDisplayName', () => {
    it('returns correct display name for seeker', () => {
      expect(getRoleDisplayName('SEEKER')).toBe('Grant Seeker');
      expect(getRoleDisplayName('seeker')).toBe('Grant Seeker');
    });

    it('returns correct display name for writer', () => {
      expect(getRoleDisplayName('WRITER')).toBe('Grant Writer');
      expect(getRoleDisplayName('writer')).toBe('Grant Writer');
    });

    it('returns correct display name for funder', () => {
      expect(getRoleDisplayName('FUNDER')).toBe('Grant Funder');
      expect(getRoleDisplayName('funder')).toBe('Grant Funder');
    });

    it('returns default for unknown role', () => {
      expect(getRoleDisplayName('UNKNOWN')).toBe('User');
      expect(getRoleDisplayName('')).toBe('User');
    });
  });

  describe('getRoleDescription', () => {
    it('returns correct description for seeker', () => {
      const description = getRoleDescription('SEEKER');
      expect(description).toContain('Find and apply for grants');
    });

    it('returns correct description for writer', () => {
      const description = getRoleDescription('WRITER');
      expect(description).toContain('Connect with organizations');
    });

    it('returns correct description for funder', () => {
      const description = getRoleDescription('FUNDER');
      expect(description).toContain('Manage your grant opportunities');
    });

    it('returns default for unknown role', () => {
      expect(getRoleDescription('UNKNOWN')).toBe('Welcome to Benefitiary');
    });
  });

  describe('getDashboardPath', () => {
    it('returns correct path for seeker', () => {
      expect(getDashboardPath('SEEKER')).toBe('/dashboard/seeker');
      expect(getDashboardPath('seeker')).toBe('/dashboard/seeker');
    });

    it('returns correct path for writer', () => {
      expect(getDashboardPath('WRITER')).toBe('/dashboard/writer');
      expect(getDashboardPath('writer')).toBe('/dashboard/writer');
    });

    it('returns correct path for funder', () => {
      expect(getDashboardPath('FUNDER')).toBe('/dashboard/funder');
      expect(getDashboardPath('funder')).toBe('/dashboard/funder');
    });

    it('returns seeker path as default', () => {
      expect(getDashboardPath('UNKNOWN')).toBe('/dashboard/seeker');
      expect(getDashboardPath('')).toBe('/dashboard/seeker');
    });
  });
});