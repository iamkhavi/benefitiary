/**
 * Maya Cache Invalidation Utilities
 * Use these functions to invalidate Maya's context cache when data changes
 */

/**
 * Invalidate Maya cache when user or organization data changes
 */
export async function invalidateMayaCacheForUser(userId: string) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/maya?action=invalidate-user&userId=${userId}`, {
      method: 'GET',
    });
    
    if (response.ok) {
      console.log(`Maya cache invalidated for user ${userId}`);
    } else {
      console.error('Failed to invalidate Maya cache for user:', await response.text());
    }
  } catch (error) {
    console.error('Error invalidating Maya cache for user:', error);
  }
}

/**
 * Invalidate Maya cache when grant or funder data changes
 */
export async function invalidateMayaCacheForGrant(grantId: string) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/maya?action=invalidate-grant&grantId=${grantId}`, {
      method: 'GET',
    });
    
    if (response.ok) {
      console.log(`Maya cache invalidated for grant ${grantId}`);
    } else {
      console.error('Failed to invalidate Maya cache for grant:', await response.text());
    }
  } catch (error) {
    console.error('Error invalidating Maya cache for grant:', error);
  }
}

/**
 * Clear all Maya cache (use sparingly)
 */
export async function clearAllMayaCache() {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/maya?action=clear-cache`, {
      method: 'GET',
    });
    
    if (response.ok) {
      console.log('All Maya cache cleared');
    } else {
      console.error('Failed to clear Maya cache:', await response.text());
    }
  } catch (error) {
    console.error('Error clearing Maya cache:', error);
  }
}

/**
 * Server-side cache invalidation (for use in API routes)
 */
export function invalidateMayaCacheSync(type: 'user' | 'grant', id: string) {
  // This would be used in server-side contexts where we can't make HTTP calls
  // For now, we'll just log - in production you might use Redis pub/sub or similar
  console.log(`Cache invalidation requested: ${type} ${id}`);
}