"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { AudioWave } from "./AudioWave";
import { BackgroundFx } from "./BackgroundFx";

type PlayerScreenProps = {
  stationName: string;
  currentTag: string;
  trackTitle?: string;
  onStop: () => void;
  onTogglePlay: () => void;
  onNextStation: () => void;
  onPrevStation: () => void;
  isPlaying: boolean;
  statusText?: string;
  statusDetail?: string;
  labels: {
    nowPlaying: string;
    genre: string;
    liveStream: string;
    stop: string;
    trackFallback: string;
    copied: string;
  };
  lang: "RU" | "EN";
  onSetLang: (lang: "RU" | "EN") => void;
  audioLevelRef?: React.MutableRefObject<number>;
  accentColor?: string;
};

export function PlayerScreen({
  stationName,
  currentTag,
  trackTitle,
  onStop,
  onTogglePlay,
  onNextStation,
  onPrevStation,
  isPlaying,
  statusText,
  statusDetail,
  labels,
  lang,
  onSetLang,
  audioLevelRef,
  accentColor,
}: PlayerScreenProps) {
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<number | null>(null);
  const primaryTitle = (stationName || "SEARCHING...").toUpperCase();
  const shouldMarquee = primaryTitle.length > 18;
  const marqueeDuration = Math.max(12, primaryTitle.length * 0.6);
  const tagLabel = currentTag.toUpperCase();
  const trackDisplay = trackTitle?.trim() ? trackTitle : labels.trackFallback;
  const trackLine = trackDisplay.toUpperCase();
  const shouldTrackMarquee = trackLine.length > 24;
  const trackMarqueeDuration = Math.max(10, trackLine.length * 0.5);
  const canCopy = Boolean(trackTitle?.trim());
  const glowColor = accentColor ?? "#ff77a8";
  const titleStyle: React.CSSProperties & { [key: string]: string | number } = {
    filter: `drop-shadow(0 0 12px ${glowColor})`,
  };
  const trackStyle: React.CSSProperties & { [key: string]: string | number } | undefined =
    shouldTrackMarquee ? { ["--marquee-duration"]: `${trackMarqueeDuration}s` } : undefined;

  if (shouldMarquee) {
    titleStyle["--marquee-duration"] = `${marqueeDuration}s`;
  }

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        window.clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const handleCopy = async () => {
    if (!canCopy) return;
    try {
      await navigator.clipboard.writeText(trackTitle!.trim());
      setCopied(true);
      if (copyTimeoutRef.current) {
        window.clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className={`flex min-h-screen items-center justify-center bg-background px-4 py-10 ${isPlaying ? "neon-breathe" : ""}`}>
      <div className="crt-shell w-full max-w-5xl rounded-3xl">
        <div className="crt-screen crt-text crt-life relative flex flex-col items-center gap-10 rounded-3xl px-6 py-10 text-center text-neon sm:px-12">
          <BackgroundFx />
          <div className="absolute left-6 top-6 h-3 w-16 bg-neon/40 shadow-[0_0_12px_rgba(255,119,168,0.7)]" />
          <div className="absolute right-6 top-6 h-3 w-10 bg-neon/40 shadow-[0_0_12px_rgba(255,119,168,0.7)]" />
          <div className="z-10 mb-2 flex w-full justify-end sm:absolute sm:right-4 sm:top-4 sm:mb-0 sm:w-auto">
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

          <div
            className={`pointer-events-none absolute left-6 top-6 text-[10px] sm:text-xs ${
              isPlaying ? "neon-title" : "text-neon/70"
            }`}
          >
            NEURO RADIO
          </div>

          <div className="mt-6 flex w-full max-w-3xl flex-col items-center gap-8">
            <p className="text-[10px] uppercase tracking-[0.35em] text-neon/80 sm:text-xs">
              {labels.nowPlaying}
            </p>
            <div className={shouldMarquee ? "marquee" : ""}>
              <p
                className={`title-3d glow-pulse text-[12px] uppercase tracking-[0.35em] text-neon-bright sm:text-base ${
                  shouldMarquee ? "marquee-track" : ""
                }`}
                style={titleStyle}
              >
                {primaryTitle} {shouldMarquee ? " • " + primaryTitle : ""}
              </p>
            </div>
            <p className="text-[8px] uppercase tracking-[0.3em] text-neon/70 sm:text-[10px]">
              {labels.genre}: {tagLabel}
            </p>

            <div className="mt-2 flex w-full items-center justify-center">
              <div
                className={`pixel-scene relative flex h-52 w-full max-w-2xl items-center justify-center rounded-3xl border-2 border-neon bg-[#2a182a] sm:h-64 ${
                  isPlaying ? "scene-pulse animate-pulse" : ""
                }`}
                style={
                  isPlaying
                    ? {
                        boxShadow: `0 0 26px ${glowColor}66, 0 0 60px ${glowColor}33`,
                      }
                    : undefined
                }
              >
                <div className="pixel-sun" />
                <div className="pixel-grid" />
                <div
                  className={`pixel-visualizer ${
                    isPlaying ? "visualizer-active" : "visualizer-muted"
                  } absolute bottom-8 flex h-24 w-full items-center justify-center rounded-2xl px-0 sm:h-28`}
                >
                  <AudioWave
                    isPlaying={isPlaying}
                    className="h-full w-full"
                    canvasClassName="h-full w-full"
                    lineWidth={3}
                    levelRef={audioLevelRef}
                  />
                </div>
                <div className="pointer-events-none absolute right-6 top-6 flex items-center gap-2 text-[8px] uppercase tracking-[0.3em] text-neon sm:text-[9px]">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-neon-bright" />
                  {labels.liveStream}
                </div>
              </div>
            </div>

            <div className="flex w-full flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={onPrevStation}
                className="pixel-button flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-neon bg-black/40 backdrop-blur-md transition-transform hover:scale-105 active:scale-95 will-change-transform sm:h-12 sm:w-12"
              >
                <Image
                  src="/icon-prev.svg"
                  alt="Previous station"
                  width={24}
                  height={24}
                  className="h-6 w-6 sm:h-7 sm:w-7"
                  priority
                />
              </button>
              <button
                type="button"
                onClick={onTogglePlay}
                className="pixel-button flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-neon bg-black/40 backdrop-blur-md transition-transform hover:scale-105 active:scale-95 will-change-transform sm:h-14 sm:w-14"
              >
                <Image
                  src={isPlaying ? "/icon-pause.svg" : "/icon-play.svg"}
                  alt={isPlaying ? "Pause" : "Play"}
                  width={28}
                  height={28}
                  className="h-7 w-7 sm:h-8 sm:w-8"
                  priority
                />
              </button>
              <button
                type="button"
                onClick={onNextStation}
                className="pixel-button flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-neon bg-black/40 backdrop-blur-md transition-transform hover:scale-105 active:scale-95 will-change-transform sm:h-12 sm:w-12"
              >
                <Image
                  src="/icon-next.svg"
                  alt="Next station"
                  width={24}
                  height={24}
                  className="h-6 w-6 sm:h-7 sm:w-7"
                  priority
                />
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopy}
              disabled={!canCopy}
              className={`relative mt-4 w-full max-w-2xl rounded-2xl border-2 border-neon bg-black/40 px-4 py-3 text-center backdrop-blur-md transition-transform will-change-transform ${
                canCopy ? "hover:scale-105 active:scale-95" : "cursor-default opacity-80"
              }`}
              aria-label={trackLine}
            >
              <div className={shouldTrackMarquee ? "marquee" : ""}>
                <p
                  className={`text-[9px] uppercase tracking-[0.32em] text-neon-bright ${
                    shouldTrackMarquee ? "marquee-track" : ""
                  }`}
                  style={trackStyle}
                >
                  {trackLine}
                  {shouldTrackMarquee ? ` • ${trackLine}` : ""}
                </p>
              </div>
              <AnimatePresence>
                {copied && (
                  <motion.span
                    initial={{ opacity: 0, y: 6, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="pointer-events-none absolute right-3 top-2 text-[8px] uppercase tracking-[0.3em] text-neon-bright"
                  >
                    {labels.copied}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>

            <button
              type="button"
              onClick={onStop}
              className="pixel-button mt-4 w-full max-w-[200px] rounded-2xl border-2 border-neon bg-black/40 px-6 py-4 text-[10px] uppercase tracking-[0.35em] text-neon backdrop-blur-md transition hover:bg-neon hover:text-[#2d1b2e] hover:scale-105 active:scale-95 will-change-transform sm:px-6 sm:py-4 sm:text-xs"
            >
              {labels.stop}
            </button>

            {statusText && (
              <p className="text-[9px] uppercase tracking-[0.3em] text-neon/70 sm:text-[10px]">
                {statusText}
              </p>
            )}
            {statusDetail && (
              <p className="text-[8px] uppercase tracking-[0.3em] text-neon/50 sm:text-[9px]">
                {statusDetail}
              </p>
            )}
          </div>

          {isPlaying && (
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <span className="pixel-note note-left-1 will-change-transform" />
              <span className="pixel-note note-left-2 will-change-transform" />
              <span className="pixel-note note-left-3 will-change-transform" />
              <span className="pixel-note note-right-1 will-change-transform" />
              <span className="pixel-note note-right-2 will-change-transform" />
              <span className="pixel-note note-right-3 will-change-transform" />
            </div>
          )}

          <div className="pointer-events-none absolute bottom-4 right-6 text-[8px] text-neon/60 sm:text-[10px]">
            v0.1 BETA
          </div>
        </div>
      </div>
    </div>
  );
}

