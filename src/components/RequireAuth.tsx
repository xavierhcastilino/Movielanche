import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { isDemoAuthenticated } from '../utils/onboarding';

/** Sends visitors to /auth until both their mobile number and email are verified, then returns them to where they were headed. */
export function RequireAuth() {
  const location = useLocation();
  if (!isDemoAuthenticated()) return <Navigate to="/auth" replace state={{ from: `${location.pathname}${location.search}` }} />;
  return <Outlet />;
}
