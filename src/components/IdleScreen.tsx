"use client";

import { useState, FormEvent } from "react";
import { BackgroundFx } from "./BackgroundFx";

type IdleScreenLabels = {
  tagLine: string;
  title: string;
  subtitle: string;
  inputLabel: string;
  placeholder: string;
  startButton: string;
  quickVibes: string;
  favoritesTitle: string;
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
};

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
}: IdleScreenProps) {
  const [activity, setActivity] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = activity.trim();
    onStart(trimmed);
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
            className="mt-2 flex w-full max-w-xl flex-col items-center gap-4 sm:mt-4 sm:gap-6"
          >
            <label
              htmlFor="activity"
              className="text-[9px] uppercase tracking-[0.3em] text-neon/80 sm:text-xs sm:tracking-[0.35em]"
            >
              {labels.inputLabel}
            </label>

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
            <p className="text-[9px] uppercase tracking-[0.3em] text-neon/80 sm:text-xs sm:tracking-[0.35em]">
              {labels.quickVibes}
            </p>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-[var(--background)] to-transparent md:hidden" />
              <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-[var(--background)] to-transparent md:hidden" />
              <div className="flex w-full gap-3 overflow-x-auto overflow-y-visible pb-2 sm:grid sm:grid-cols-3 sm:gap-3 sm:pb-0 lg:grid-cols-4 md:overflow-visible">
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
              <p className="text-[9px] uppercase tracking-[0.3em] text-neon/80 sm:text-xs sm:tracking-[0.35em]">
                {labels.favoritesTitle}
              </p>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-6 bg-gradient-to-r from-[var(--background)] to-transparent" />
                <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-6 bg-gradient-to-l from-[var(--background)] to-transparent" />
                <div className="flex w-full snap-x snap-mandatory gap-3 overflow-x-auto overflow-y-visible pb-2 md:overflow-visible">
                  {favorites.map((station) => (
                    <button
                      key={station.changeuuid}
                      type="button"
                      onClick={() => onPlayFavorite?.(station)}
                      className="pixel-tag relative shrink-0 snap-start rounded-2xl px-3 py-2 text-[9px] uppercase tracking-[0.22em] text-neon transition hover:z-50 hover:bg-neon hover:text-[#2d1b2e] hover:scale-105 active:scale-95 will-change-transform sm:px-4 sm:py-3 sm:text-[10px]"
                      title={station.name}
                    >
                      {station.name.toUpperCase()}
                    </button>
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
            v0.1 BETA
          </div>
        </div>
      </div>
    </div>
  );
}

