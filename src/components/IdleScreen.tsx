"use client";

import { useEffect, useRef, useState, FormEvent } from "react";
import { BackgroundFx } from "./BackgroundFx";
import type { SVGProps } from "react";
import { motion } from "framer-motion";

type IdleScreenLabels = {
  tagLine: string;
  title: string;
  subtitle: string;
  inputLabel: string;
  placeholder: string;
  startButton: string;
  quickVibes: string;
  favoritesTitle: string;
  removeFavorite: string;
};

type IdleScreenProps = {
  onStart: (activity: string, tagOverride?: string) => void;
  labels: IdleScreenLabels;
  lang: "RU" | "EN";
  onSetLang: (lang: "RU" | "EN") => void;
  favorites?: Array<{
    changeuuid: string;
    name: string;
    url_resolved: string;
    tags: string[];
    favicon?: string;
  }>;
  onPlayFavorite?: (favorite: {
    changeuuid: string;
    name: string;
    url_resolved: string;
    tags: string[];
    favicon?: string;
  }) => void;
  onRemoveFavorite?: (id: string) => void;
};

const HeartIcon = ({
  filled,
  ...props
}: SVGProps<SVGSVGElement> & { filled?: boolean }) => (
  <svg
    viewBox="0 0 24 24"
    fill={filled ? "currentColor" : "none"}
    stroke="currentColor"
    {...props}
  >
    <path
      d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 5.5-7 10-7 10Z"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const quickTags = [
  "LO-FI",
  "PHONK",
  "METAL",
  "CHIPTUNE",
  "SYNTHWAVE",
  "AMBIENT",
  "TECHNO",
  "RETRO GAME",
  "JAZZ",
  "SOUL",
  "PIANO",
  "HIP-HOP",
  "DNB",
  "K-POP",
];

export function IdleScreen({
  onStart,
  labels,
  lang,
  onSetLang,
  favorites,
  onPlayFavorite,
  onRemoveFavorite,
}: IdleScreenProps) {
  const [activity, setActivity] = useState("");
  const [removingIds, setRemovingIds] = useState<Set<string>>(new Set());
  const removalTimersRef = useRef<Map<string, number>>(new Map());

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = activity.trim();
    onStart(trimmed);
  };

  useEffect(() => {
    return () => {
      removalTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      removalTimersRef.current.clear();
    };
  }, []);

  const handleRemoveFavorite = (id: string) => {
    if (removingIds.has(id)) return;
    setRemovingIds((prev) => new Set(prev).add(id));
    const timer = window.setTimeout(() => {
      onRemoveFavorite?.(id);
      setRemovingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      removalTimersRef.current.delete(id);
    }, 520);
    removalTimersRef.current.set(id, timer);
  };

  return (
    <div className="flex h-[100dvh] overflow-hidden items-center justify-center bg-background px-4 py-4 sm:min-h-screen sm:py-10">
      <div className="crt-shell w-full max-w-5xl rounded-3xl">
        <div className="crt-screen crt-text crt-life relative flex h-full flex-col items-center justify-between gap-6 rounded-3xl px-5 py-6 text-center sm:gap-10 sm:px-12 sm:py-10">
          <BackgroundFx />
          <div className="absolute left-6 top-6 h-3 w-16 bg-neon/40 shadow-[0_0_12px_rgba(255,119,168,0.7)]" />
          <div className="absolute right-6 top-6 h-3 w-10 bg-neon/40 shadow-[0_0_12px_rgba(255,119,168,0.7)]" />

          <div className="z-10 mb-1 flex w-full justify-end sm:absolute sm:right-4 sm:top-4 sm:mb-0 sm:w-auto">
            <div className="flex overflow-hidden rounded-2xl border-2 border-neon bg-[#2a182a]/80 text-[7px] uppercase tracking-[0.3em] text-neon backdrop-blur-md sm:text-[8px]">
              <button
                type="button"
                onClick={() => onSetLang("RU")}
                className={`pixel-button px-3 py-2 transition-transform hover:scale-105 active:scale-95 will-change-transform ${
                  lang === "RU" ? "bg-neon text-[#2d1b2e]" : ""
                }`}
              >
                RU
              </button>
              <button
                type="button"
                onClick={() => onSetLang("EN")}
                className={`pixel-button px-3 py-2 transition-transform hover:scale-105 active:scale-95 will-change-transform ${
                  lang === "EN" ? "bg-neon text-[#2d1b2e]" : ""
                }`}
              >
                EN
              </button>
            </div>
          </div>

          <header className="flex w-full flex-col items-center gap-2 sm:gap-3">
            <p className="text-[9px] tracking-[0.45em] text-neon/70 sm:text-xs sm:tracking-[0.5em]">
              {labels.tagLine}
            </p>
            <h1 className="title-3d glow-pulse text-xl text-neon-bright sm:text-4xl">
              {labels.title}
            </h1>
            <p className="text-[9px] tracking-[0.28em] text-neon/70 sm:text-xs sm:tracking-[0.3em]">
              {labels.subtitle}
            </p>
          </header>

          <form
            onSubmit={handleSubmit}
            className="mt-8 flex w-full max-w-xl flex-col items-center gap-4 sm:mt-10 sm:gap-6"
          >
            <input
              id="activity"
              type="text"
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
              placeholder={labels.placeholder}
              className="pixel-input w-full rounded-2xl border-2 border-neon bg-black/40 px-4 py-3 text-[9px] uppercase tracking-[0.25em] text-neon outline-none backdrop-blur-md transition focus:border-neon-bright focus:ring-2 focus:ring-neon-bright sm:py-4 sm:text-xs sm:tracking-[0.28em]"
              autoComplete="off"
            />

            <button
              type="submit"
              className="pixel-button mt-1 w-full max-w-[220px] rounded-2xl border-2 border-neon bg-black/40 px-5 py-3 text-[9px] uppercase tracking-[0.32em] text-neon backdrop-blur-md transition hover:bg-neon hover:text-[#2d1b2e] hover:scale-105 active:scale-95 will-change-transform sm:mt-2 sm:max-w-[240px] sm:px-7 sm:py-4 sm:text-xs sm:tracking-[0.35em]"
            >
              {labels.startButton}
            </button>
          </form>

          <div className="mt-1 flex w-full max-w-2xl flex-col gap-3 sm:mt-2 sm:gap-4">
            <p className="text-center text-[9px] uppercase tracking-[0.3em] text-neon/80 sm:text-xs sm:tracking-[0.35em]">
              {labels.quickVibes}
            </p>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-[var(--background)] to-transparent md:hidden" />
              <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-[var(--background)] to-transparent md:hidden" />
              <div className="flex flex-nowrap w-full gap-3 overflow-x-auto overflow-y-visible pb-2 justify-start md:flex-wrap md:justify-center md:gap-2 md:max-w-4xl md:mx-auto md:overflow-visible md:pb-0">
                {quickTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => onStart(tag, tag)}
                    className="pixel-tag relative shrink-0 rounded-2xl px-3 py-2 text-[9px] uppercase tracking-[0.25em] text-neon transition hover:z-50 hover:bg-neon hover:text-[#2d1b2e] hover:scale-105 active:scale-95 will-change-transform sm:px-4 sm:py-3 sm:text-[10px]"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {favorites && favorites.length > 0 && (
            <div className="mt-3 flex w-full max-w-2xl flex-col gap-3 sm:mt-6 sm:gap-4">
              <p className="text-center text-[9px] uppercase tracking-[0.3em] text-neon/80 sm:text-xs sm:tracking-[0.35em]">
                {labels.favoritesTitle}
              </p>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-[var(--background)] to-transparent md:hidden" />
                <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-[var(--background)] to-transparent md:hidden" />
                <div className="flex flex-nowrap w-full snap-x snap-mandatory gap-3 overflow-x-auto overflow-y-visible pb-2 justify-start md:flex-wrap md:justify-center md:gap-2 md:max-w-4xl md:mx-auto md:overflow-visible md:pb-0">
                  {favorites.map((station) => (
                    <motion.div
                      key={station.changeuuid}
                      className={`flex shrink-0 snap-start items-center gap-2 ${
                        removingIds.has(station.changeuuid) ? "pixel-disintegrate" : ""
                      }`}
                      animate={
                        removingIds.has(station.changeuuid)
                          ? { opacity: 0, scale: 0.85 }
                          : { opacity: 1, scale: 1 }
                      }
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    >
                      <div className="relative">
                        <button
                        type="button"
                        onClick={() => onPlayFavorite?.(station)}
                        className="pixel-tag relative rounded-2xl px-3 py-2 text-[9px] uppercase tracking-[0.22em] text-neon transition hover:z-50 hover:bg-neon hover:text-[#2d1b2e] hover:scale-105 active:scale-95 will-change-transform sm:px-4 sm:py-3 sm:text-[10px]"
                        title={station.name}
                      >
                        {station.name.toUpperCase()}
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          handleRemoveFavorite(station.changeuuid);
                        }}
                        className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-neon bg-black/70 text-neon transition hover:bg-neon hover:text-[#2d1b2e] hover:scale-105 active:scale-95 will-change-transform sm:h-7 sm:w-7"
                        aria-label={labels.removeFavorite}
                      >
                        <HeartIcon className="h-3.5 w-3.5" filled />
                      </button>
                      {removingIds.has(station.changeuuid) && (
                        <div className="pointer-events-none absolute inset-0">
                          <span className="pixel-burst pixel-burst-1" />
                          <span className="pixel-burst pixel-burst-2" />
                          <span className="pixel-burst pixel-burst-3" />
                          <span className="pixel-burst pixel-burst-4" />
                          <span className="pixel-burst pixel-burst-5" />
                          <span className="pixel-burst pixel-burst-6" />
                        </div>
                      )}
                    </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="pointer-events-none absolute bottom-6 left-10 pixel-heart will-change-transform" />
          <div className="pointer-events-none absolute bottom-10 right-16 pixel-heart will-change-transform" />
          <div className="pointer-events-none absolute top-20 right-12 pixel-sparkle will-change-transform" />
          <div className="pointer-events-none absolute top-24 left-16 pixel-sparkle will-change-transform" />

          <div className="pointer-events-none absolute bottom-4 right-6 text-[8px] text-neon/60 sm:text-[10px]">
            v2.0 BETA
          </div>
        </div>
      </div>
    </div>
  );
}

