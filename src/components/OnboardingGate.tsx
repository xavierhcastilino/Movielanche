import { Navigate } from 'react-router-dom';
import { Home } from '../pages/Home';
import { hasCompletedOnboarding, isDemoAuthenticated } from '../utils/onboarding';

export function OnboardingGate() {
  if (!isDemoAuthenticated()) return <Navigate to="/auth" replace />;
  if (!hasCompletedOnboarding()) return <Navigate to="/onboarding/genres" replace />;
  return <Home />;
}
