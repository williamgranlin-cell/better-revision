import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type UserRole = 'free' | 'premium' | 'admin';

interface SubscriptionState {
  subscribed: boolean;
  role: UserRole;
  isAdmin: boolean;
  subscriptionEnd: string | null;
  loading: boolean;
}

// Feature limits based on role
export const FEATURE_LIMITS = {
  free: {
    flashcardsPerDay: 10,
    aiChatMessages: 5,
    maxCourses: 3,
    maxFlashcardSets: 5,
  },
  premium: {
    flashcardsPerDay: Infinity,
    aiChatMessages: Infinity,
    maxCourses: Infinity,
    maxFlashcardSets: Infinity,
  },
  admin: {
    flashcardsPerDay: Infinity,
    aiChatMessages: Infinity,
    maxCourses: Infinity,
    maxFlashcardSets: Infinity,
  },
};

export const useSubscription = () => {
  const { user } = useAuth();
  const [state, setState] = useState<SubscriptionState>({
    subscribed: false,
    role: 'free',
    isAdmin: false,
    subscriptionEnd: null,
    loading: true,
  });

  const checkSubscription = useCallback(async () => {
    if (!user) {
      setState({
        subscribed: false,
        role: 'free',
        isAdmin: false,
        subscriptionEnd: null,
        loading: false,
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      
      if (error) throw error;

      setState({
        subscribed: data.subscribed,
        role: data.role as UserRole,
        isAdmin: data.is_admin,
        subscriptionEnd: data.subscription_end,
        loading: false,
      });
    } catch (error) {
      console.error('Error checking subscription:', error);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [user]);

  useEffect(() => {
    checkSubscription();
    
    // Refresh every minute
    const interval = setInterval(checkSubscription, 60000);
    return () => clearInterval(interval);
  }, [checkSubscription]);

  const createCheckout = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout');
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error creating checkout:', error);
      throw error;
    }
  };

  const openCustomerPortal = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Error opening customer portal:', error);
      throw error;
    }
  };

  const getLimits = () => FEATURE_LIMITS[state.role];

  const canUseFeature = (feature: keyof typeof FEATURE_LIMITS.free, currentUsage: number) => {
    const limits = getLimits();
    return currentUsage < limits[feature];
  };

  return {
    ...state,
    checkSubscription,
    createCheckout,
    openCustomerPortal,
    getLimits,
    canUseFeature,
  };
};
