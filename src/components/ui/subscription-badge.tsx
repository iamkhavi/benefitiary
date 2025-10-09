'use client';

import { Badge } from '@/components/ui/badge';
import { useSession } from '@/lib/auth-client';
import { useEffect, useState } from 'react';

interface UserSubscription {
  plan: 'BASIC' | 'PRO' | 'ENTERPRISE';
  status: 'ACTIVE' | 'INACTIVE' | 'CANCELLED';
}

export function SubscriptionBadge() {
  const { data: session } = useSession();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSubscription() {
      if (!session?.user) {
        setLoading(false);
        return;
      }

      try {
        // For now, default to BASIC plan for all users
        // In production, you'd fetch this from your payments API
        setSubscription({
          plan: 'BASIC',
          status: 'ACTIVE'
        });
      } catch (error) {
        console.error('Failed to fetch subscription:', error);
        // Default to basic plan on error
        setSubscription({
          plan: 'BASIC', 
          status: 'ACTIVE'
        });
      } finally {
        setLoading(false);
      }
    }

    fetchSubscription();
  }, [session?.user]);

  if (loading || !subscription) {
    return null;
  }

  const getBadgeStyle = () => {
    switch (subscription.plan) {
      case 'PRO':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'ENTERPRISE':
        return 'bg-gold-100 text-gold-800 border-gold-200';
      case 'BASIC':
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPlanLabel = () => {
    switch (subscription.plan) {
      case 'PRO':
        return 'Pro Plan';
      case 'ENTERPRISE':
        return 'Enterprise';
      case 'BASIC':
      default:
        return 'Free Plan';
    }
  };

  return (
    <Badge className={getBadgeStyle()}>
      {getPlanLabel()}
    </Badge>
  );
}