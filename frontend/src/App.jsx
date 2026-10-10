import { useRef } from "react";
import CinematicIntro from "./components/CinematicIntro.jsx";
import HomePage from "./pages/HomePage.jsx";

export default function App() {
  const homePageRef = useRef(null);

  return (
    <>
      <CinematicIntro homePageRef={homePageRef} />
      <div className="home-reveal" ref={homePageRef}>
        <HomePage />
      </div>
    </>
  );
}
