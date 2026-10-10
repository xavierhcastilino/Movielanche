import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowRight } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function CinematicIntro({ homePageRef }) {
  const sectionRef = useRef(null);
  const sceneRef = useRef(null);
  const imageRef = useRef(null);
  const screenGlowRef = useRef(null);
  const indicatorRef = useRef(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(media.matches);
    const onChange = (e) => setReducedMotion(e.matches);
    media.addEventListener?.("change", onChange);
    return () => media.removeEventListener?.("change", onChange);
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    const scene = sceneRef.current;
    const image = imageRef.current;
    const glow = screenGlowRef.current;
    const indicator = indicatorRef.current;
    const homePage = homePageRef?.current;
    if (!section || !scene || !image || !glow || !homePage) return;

    // Keep the homepage layered behind the theatre at viewport center during the intro.
    // At the end of the pinned sequence, hand it back to normal document flow without a vertical entrance.
    const showHomeInDocumentFlow = () => {
      const top = window.scrollY;
      homePage.style.position = "absolute";
      homePage.style.top = `${top}px`;
      homePage.style.left = "0";
      homePage.style.right = "0";
      homePage.style.width = "100%";
      homePage.style.zIndex = "0";
      homePage.style.pointerEvents = "auto";
    };
    const keepHomeCenteredBehindScene = () => {
      homePage.style.position = "fixed";
      homePage.style.top = "0";
      homePage.style.left = "0";
      homePage.style.right = "0";
      homePage.style.width = "100%";
      homePage.style.zIndex = "0";
      homePage.style.pointerEvents = "none";
    };

    const ctx = gsap.context(() => {
      if (reducedMotion) {
        gsap.set(scene, { autoAlpha: 0 });
        gsap.set(homePage, {
          autoAlpha: 1,
          clearProps: "transform,filter,pointerEvents",
        });
        return;
      }
      // Keep the homepage fully hidden until the theatre screen has expanded past the viewport.
      keepHomeCenteredBehindScene();
      gsap.set(homePage, {
        autoAlpha: 0,
        scale: 0.985,
        filter: "blur(12px)",
        transformOrigin: "50% 50%",
        pointerEvents: "none",
      });
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "+=3800",
          scrub: 0.7,
          // Pin the whole section so its scroll spacer reliably holds the homepage below the scene.
          pin: section,
          pinSpacing: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onLeave: showHomeInDocumentFlow,
          onEnterBack: keepHomeCenteredBehindScene,
        },
      });
      tl.to(indicator, { autoAlpha: 0, y: 18, duration: 0.12 }, 0)
        .to(
          image,
          { scale: 1.16, duration: 0.2, transformOrigin: "50% 42%" },
          0,
        )
        .to(
          image,
          { scale: 1.48, duration: 0.24, transformOrigin: "50% 42%" },
          0.2,
        )
        .to(
          image,
          { scale: 3.35, duration: 0.39, transformOrigin: "50% 42%" },
          0.44,
        )
        .to(glow, { opacity: 0.92, scale: 1.12, duration: 0.1 }, 0.78)
        // Hold the screen-filling moment, then dissolve the theatre and reveal the homepage from its center.
        .to(glow, { opacity: 0, duration: 0.08 }, 0.88)
        .to(scene, { autoAlpha: 0, duration: 0.08 }, 0.92)
        .to(
          homePage,
          {
            autoAlpha: 1,
            scale: 1,
            filter: "blur(0px)",
            duration: 0.08,
            ease: "power2.out",
            onStart: () => {
              homePage.style.pointerEvents = "auto";
            },
            onReverseComplete: () => {
              homePage.style.pointerEvents = "none";
            },
          },
          0.92,
        );
    }, section);
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("load", refresh, { once: true });
    const resizeObserver = new ResizeObserver(() => ScrollTrigger.refresh());
    resizeObserver.observe(section);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("load", refresh);
      ctx.revert();
      gsap.set(homePage, {
        clearProps:
          "position,top,left,right,width,zIndex,pointerEvents,opacity,visibility,transform,filter",
      });
    };
  }, [reducedMotion, homePageRef]);

  return (
    <section
      className={`cinematic-section ${reducedMotion ? "motion-reduced" : ""}`}
      ref={sectionRef}
      aria-label="Cinematic entrance"
    >
      <div className="cinematic-scene" ref={sceneRef}>
        <div className="scene-vignette" />
        <img
          ref={imageRef}
          className="theatre-image"
          src="/images/movielanche-theatre.png"
          alt="A modern cinema auditorium with a glowing blue MOVIELANCHE screen"
          fetchPriority="high"
        />
        <div className="scene-grain" />
        <div className="screen-entry-glow" ref={screenGlowRef} />
        <div className="intro-brand">
          <span className="intro-brand-line" /> A NEW WAY TO EXPERIENCE CINEMA{" "}
          <span className="intro-brand-line" />
        </div>
        <div className="scroll-cue" ref={indicatorRef}>
          <span>SCROLL TO ENTER</span>
          <div className="scroll-cue-icon">
            <ArrowDown size={15} />
          </div>
        </div>
        {reducedMotion && (
          <a className="reduced-enter" href="#home">
            Enter MovieLanche <ArrowRight size={16} />
          </a>
        )}
      </div>
    </section>
  );
}
