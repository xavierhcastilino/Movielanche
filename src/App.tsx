import { useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { CinematicIntro } from './components/CinematicIntro';
import { MovieTransitionProvider } from './components/MovieTransition';
import { OnboardingGate } from './components/OnboardingGate';
import { AuthPage } from './pages/AuthPage';
import { BookingConfirmation } from './pages/BookingConfirmation';
import { Checkout } from './pages/Checkout';
import { GenreSelect } from './pages/GenreSelect';
import { LocationSelect } from './pages/LocationSelect';
import { MovieDetails } from './pages/MovieDetails';
import { Movies } from './pages/Movies';
import { MyBookings } from './pages/MyBookings';
import { NearbyTheatres } from './pages/NearbyTheatres';
import { NotFound } from './pages/NotFound';
import { Profile } from './pages/Profile';
import { SeatSelection } from './pages/SeatSelection';
import { ShowSelection } from './pages/ShowSelection';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'auto' }); }, [pathname]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <CinematicIntro />
      <MovieTransitionProvider>
        <ScrollToTop />
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/onboarding/genres" element={<GenreSelect />} />
          <Route path="/onboarding/location" element={<LocationSelect />} />
          <Route path="/onboarding/theatres" element={<NearbyTheatres />} />
          <Route element={<AppLayout />}>
            <Route path="/" element={<OnboardingGate />} />
            <Route path="/movies" element={<Movies />} />
            <Route path="/movies/:id" element={<MovieDetails />} />
            <Route path="/shows/:movieId" element={<ShowSelection />} />
            <Route path="/seats/:showId" element={<SeatSelection />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/booking-confirmation" element={<BookingConfirmation />} />
            <Route path="/bookings" element={<MyBookings />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </MovieTransitionProvider>
    </BrowserRouter>
  );
}
