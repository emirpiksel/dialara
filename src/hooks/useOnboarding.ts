import { useState, useEffect } from 'react';

export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = () => {
    try {
      const completed = localStorage.getItem('dialara_onboarding_completed');
      const skipped = localStorage.getItem('dialara_onboarding_skipped');
      
      // Show onboarding if neither completed nor skipped
      if (!completed && !skipped) {
        setShowOnboarding(true);
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const completeOnboarding = () => {
    localStorage.setItem('dialara_onboarding_completed', 'true');
    setShowOnboarding(false);
  };

  const skipOnboarding = () => {
    localStorage.setItem('dialara_onboarding_skipped', 'true');
    setShowOnboarding(false);
  };

  const resetOnboarding = () => {
    localStorage.removeItem('dialara_onboarding_completed');
    localStorage.removeItem('dialara_onboarding_skipped');
    setShowOnboarding(true);
  };

  return {
    showOnboarding,
    isLoading,
    completeOnboarding,
    skipOnboarding,
    resetOnboarding
  };
}