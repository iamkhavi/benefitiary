import { describe, it, expect, vi } from 'vitest'
import { getDashboardPath, hasRole, canAccessRoute } from '../auth-utils'

describe('Auth Utils', () => {
  describe('getDashboardPath', () => {
    it('should return correct path for WRITER role', () => {
      expect(getDashboardPath('WRITER')).toBe('/dashboard/writer')
    })

    it('should return correct path for FUNDER role', () => {
      expect(getDashboardPath('FUNDER')).toBe('/dashboard/funder')
    })

    it('should return seeker path for SEEKER role', () => {
      expect(getDashboardPath('SEEKER')).toBe('/dashboard/seeker')
    })

    it('should return seeker path for unknown role', () => {
      expect(getDashboardPath('UNKNOWN')).toBe('/dashboard/seeker')
    })

    it('should return seeker path for undefined role', () => {
      expect(getDashboardPath(undefined as any)).toBe('/dashboard/seeker')
    })
  })

  describe('hasRole', () => {
    it('should return true when user has the specified role', () => {
      const session = { user: { role: 'WRITER' } }
      expect(hasRole(session, 'WRITER')).toBe(true)
    })

    it('should return false when user has different role', () => {
      const session = { user: { role: 'SEEKER' } }
      expect(hasRole(session, 'WRITER')).toBe(false)
    })

    it('should return false when session is null', () => {
      expect(hasRole(null, 'WRITER')).toBe(false)
    })

    it('should return false when user is undefined', () => {
      const session = {}
      expect(hasRole(session, 'WRITER')).toBe(false)
    })
  })

  describe('canAccessRoute', () => {
    it('should return true when user role is in required roles', () => {
      const session = { user: { role: 'WRITER' } }
      expect(canAccessRoute(session, ['WRITER', 'FUNDER'])).toBe(true)
    })

    it('should return false when user role is not in required roles', () => {
      const session = { user: { role: 'SEEKER' } }
      expect(canAccessRoute(session, ['WRITER', 'FUNDER'])).toBe(false)
    })

    it('should return false when session is null', () => {
      expect(canAccessRoute(null, ['WRITER'])).toBe(false)
    })

    it('should return false when user role is undefined', () => {
      const session = { user: {} }
      expect(canAccessRoute(session, ['WRITER'])).toBe(false)
    })

    it('should return false when required roles is empty', () => {
      const session = { user: { role: 'WRITER' } }
      expect(canAccessRoute(session, [])).toBe(false)
    })
  })
})