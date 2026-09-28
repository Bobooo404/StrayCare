import { useEffect, useRef, useState } from 'react';
import { Pause, Play } from 'lucide-react';

/** Slides kept in `public/`. The leading asset also seeds the preload. */
const SLIDES = [
  { src: '/hero-stray-roadside.jpeg', alt: 'A stray dog on a road at sunset' },
  { src: '/hero-stray-village.jpeg', alt: 'Stray dogs resting on a rural road' },
  { src: '/hero-shelter-pets.jpeg', alt: 'Shelter pets waiting to be adopted' },
  { src: '/hero-puppy.jpeg', alt: 'A young puppy looking for a home' },
  { src: '/hero-stray-resting.jpeg', alt: 'Abandoned stray dogs lying together' },
  { src: '/hero-stray-portrait.jpeg', alt: 'Close up of a stray dog' },
];

const DURATION = 3000;
const FADE = 1600;

export default function HeroSlideshow() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    // Warm the cache for the remaining slides so the cross fade never stalls on
    // a decode. `requestIdleCallback` is not available everywhere.
    const idle = window.requestIdleCallback || ((fn) => window.setTimeout(fn, 400));
    const handle = idle(() => {
      SLIDES.slice(1).forEach(({ src }) => {
        const image = new Image();
        image.src = src;
      });
    });
    return () => {
      if (window.cancelIdleCallback) window.cancelIdleCallback(handle);
    };
  }, []);

  useEffect(() => {
    if (paused) return undefined;
    timer.current = window.setTimeout(() => {
      setIndex((current) => (current + 1) % SLIDES.length);
    }, DURATION);
    return () => window.clearTimeout(timer.current);
  }, [index, paused]);

  return (
    <div
      className="absolute inset-0 -z-10 overflow-hidden bg-emerald-900"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {SLIDES.map((slide, slideIndex) => {
        const isActive = slideIndex === index;
        return (
          <img
            key={slide.src}
            src={slide.src}
            alt={isActive ? slide.alt : ''}
            aria-hidden={!isActive}
            className={`absolute inset-0 h-full w-full object-cover ${
              isActive ? 'hero-slide opacity-65' : 'opacity-0'
            }`}
            style={{
              // The zoom runs slightly longer than the visible window so motion
              // never visibly restarts at the fade boundary.
              animationDuration: `${FADE}ms, ${DURATION + 2400}ms`,
              transitionProperty: 'opacity',
              transitionDuration: `${FADE}ms`,
              transitionTimingFunction: 'ease-in-out',
            }}
          />
        );
      })}

      {/* Contrast scrim: keeps the headline legible over any photo. */}
      <div
        className="absolute inset-0 bg-gradient-to-r from-emerald-950/85 via-emerald-950/65 to-emerald-900/40"
        aria-hidden="true"
      />
      <div
        className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-emerald-950/80 to-transparent"
        aria-hidden="true"
      />

      <div className="absolute bottom-6 left-4 flex items-center gap-3 sm:left-6 lg:left-8">
        <div className="flex items-center gap-2" role="tablist" aria-label="Hero images">
          {SLIDES.map((slide, slideIndex) => (
            <button
              key={slide.src}
              type="button"
              role="tab"
              aria-label={`Show image ${slideIndex + 1} of ${SLIDES.length}`}
              aria-selected={slideIndex === index}
              onClick={() => setIndex(slideIndex)}
              className="group py-2"
            >
              <span
                className={`block h-1 rounded-full transition-all duration-500 ${
                  slideIndex === index
                    ? 'w-8 bg-white'
                    : 'w-3 bg-white/45 group-hover:bg-white/75'
                }`}
              />
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setPaused((value) => !value)}
          aria-label={paused ? 'Play slideshow' : 'Pause slideshow'}
          className="grid h-7 w-7 place-items-center rounded-full text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          {paused ? (
            <Play className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Pause className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </button>
      </div>
    </div>
  );
}
