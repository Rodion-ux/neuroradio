"use client";

import { BackgroundFx } from "./BackgroundFx";

type LoadingScreenProps = {
  progress: number; // 0 - 100
  title?: string;
  statusLine?: string;
  onCancel?: () => void;
  cancelLabel: string;
  lang: "RU" | "EN";
  onSetLang: (lang: "RU" | "EN") => void;
};

export function LoadingScreen({
  progress,
  title = "ANALYZING VIBE...",
  statusLine,
  onCancel,
  cancelLabel,
  lang,
  onSetLang,
}: LoadingScreenProps) {
  const totalBlocks = 20;
  const activeBlocks = Math.round((progress / 100) * totalBlocks);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="crt-shell w-full max-w-4xl rounded-3xl">
        <div className="crt-screen crt-text crt-life relative flex flex-col items-center gap-10 rounded-3xl px-6 py-10 text-center text-neon sm:px-12">
          <BackgroundFx />
          <div className="absolute left-6 top-6 h-3 w-16 bg-neon/40 shadow-[0_0_12px_rgba(255,119,168,0.7)]" />
          <div className="absolute right-6 top-6 h-3 w-10 bg-neon/40 shadow-[0_0_12px_rgba(255,119,168,0.7)]" />

          <div className="absolute right-4 top-4 z-10 flex overflow-hidden rounded-2xl border-2 border-neon bg-[#2a182a]/80 text-[7px] uppercase tracking-[0.3em] text-neon backdrop-blur-md sm:text-[8px]">
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

          <div className="mt-6 flex w-full max-w-md flex-col items-center gap-6">
            <p className="text-[10px] uppercase tracking-[0.35em] text-neon-bright sm:text-xs">
              {title}
              <span className="blink-cursor">_</span>
            </p>

            <div className="w-full rounded-2xl border-2 border-neon bg-black/40 p-2 backdrop-blur-md">
              <div className="grid grid-cols-20 gap-[2px]">
                {Array.from({ length: totalBlocks }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-4 sm:h-5 ${
                      i < activeBlocks ? "bg-neon" : "bg-[#2a182a]"
                    }`}
                  />
                ))}
              </div>
            </div>

            {statusLine && (
              <p className="text-[8px] uppercase tracking-[0.25em] text-neon/70 sm:text-[10px]">
                {statusLine}
              </p>
            )}

            <p className="text-[8px] uppercase tracking-[0.25em] text-neon/70 sm:text-[10px]">
              {progress.toString().padStart(3, "0")}%
            </p>

            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="pixel-button mt-2 w-full max-w-[200px] rounded-2xl border-2 border-neon bg-black/40 px-6 py-4 text-[10px] uppercase tracking-[0.35em] text-neon backdrop-blur-md transition hover:bg-neon hover:text-[#2d1b2e] hover:scale-105 active:scale-95 will-change-transform sm:text-xs"
              >
                {cancelLabel}
              </button>
            )}
          </div>

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

