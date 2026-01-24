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
};

type IdleScreenProps = {
  onStart: (activity: string, tagOverride?: string) => void;
  labels: IdleScreenLabels;
  lang: "RU" | "EN";
  onSetLang: (lang: "RU" | "EN") => void;
};

const quickTags = [
  "LO-FI",
  "CHIPTUNE",
  "SYNTHWAVE",
  "AMBIENT",
  "TECHNO",
  "RETRO GAME",
  "JAZZ",
  "PIANO",
  "HIP-HOP",
  "DNB",
];

export function IdleScreen({ onStart, labels, lang, onSetLang }: IdleScreenProps) {
  const [activity, setActivity] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = activity.trim();
    onStart(trimmed.length > 0 ? trimmed : "IDLE");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="crt-shell w-full max-w-5xl">
        <div className="crt-screen crt-text crt-life relative flex flex-col items-center gap-10 px-6 py-10 text-center sm:px-12">
          <BackgroundFx />
          <div className="absolute left-6 top-6 h-3 w-16 bg-neon/40 shadow-[0_0_12px_rgba(255,119,168,0.7)]" />
          <div className="absolute right-6 top-6 h-3 w-10 bg-neon/40 shadow-[0_0_12px_rgba(255,119,168,0.7)]" />

          <div className="absolute right-4 top-4 z-10 flex overflow-hidden rounded border-2 border-neon bg-[#2a182a] text-[7px] uppercase tracking-[0.3em] text-neon sm:text-[8px]">
            <button
              type="button"
              onClick={() => onSetLang("RU")}
              className={`px-2 py-1 ${lang === "RU" ? "bg-neon text-[#2d1b2e]" : ""}`}
            >
              RU
            </button>
            <button
              type="button"
              onClick={() => onSetLang("EN")}
              className={`px-2 py-1 ${lang === "EN" ? "bg-neon text-[#2d1b2e]" : ""}`}
            >
              EN
            </button>
          </div>

          <header className="flex w-full flex-col items-center gap-3">
            <p className="text-[10px] tracking-[0.5em] text-neon/70 sm:text-xs">
              {labels.tagLine}
            </p>
            <h1 className="title-3d glow-pulse text-2xl text-neon-bright sm:text-4xl">
              {labels.title}
            </h1>
            <p className="text-[10px] tracking-[0.3em] text-neon/70 sm:text-xs">
              {labels.subtitle}
            </p>
          </header>

          <form
            onSubmit={handleSubmit}
            className="mt-4 flex w-full max-w-xl flex-col items-center gap-6"
          >
            <label
              htmlFor="activity"
              className="text-[10px] uppercase tracking-[0.35em] text-neon/80 sm:text-xs"
            >
              {labels.inputLabel}
            </label>

            <input
              id="activity"
              type="text"
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
              placeholder={labels.placeholder}
              className="pixel-input w-full rounded-none border-2 border-neon bg-[#2a182a] px-4 py-4 text-[10px] uppercase tracking-[0.25em] text-neon outline-none transition focus:border-neon-bright focus:ring-2 focus:ring-neon-bright sm:text-xs"
              autoComplete="off"
            />

            <button
              type="submit"
              className="pixel-button mt-2 w-full max-w-[240px] border-2 border-neon bg-[#2a182a] px-4 py-3 text-[10px] uppercase tracking-[0.35em] text-neon transition hover:bg-neon hover:text-[#2d1b2e] sm:px-6 sm:py-4 sm:text-xs"
            >
              {labels.startButton}
            </button>
          </form>

          <div className="mt-2 flex w-full max-w-2xl flex-col gap-4">
            <p className="text-[10px] uppercase tracking-[0.35em] text-neon/80 sm:text-xs">
              {labels.quickVibes}
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {quickTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onStart(tag, tag)}
                  className="pixel-tag text-[9px] uppercase tracking-[0.25em] text-neon transition hover:bg-neon hover:text-[#2d1b2e] sm:text-[10px]"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-6 left-10 pixel-heart" />
          <div className="pointer-events-none absolute bottom-10 right-16 pixel-heart" />
          <div className="pointer-events-none absolute top-20 right-12 pixel-sparkle" />
          <div className="pointer-events-none absolute top-24 left-16 pixel-sparkle" />

          <div className="pointer-events-none absolute bottom-4 right-6 text-[8px] text-neon/60 sm:text-[10px]">
            v0.1 BETA
          </div>
        </div>
      </div>
    </div>
  );
}

