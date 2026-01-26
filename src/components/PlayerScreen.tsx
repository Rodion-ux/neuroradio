"use client";

import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { AudioWave } from "./AudioWave";
import { BackgroundFx } from "./BackgroundFx";
import type { SVGProps } from "react";

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
    addFavorite: string;
    removeFavorite: string;
    favoriteAdded: string;
  };
  lang: "RU" | "EN";
  onSetLang: (lang: "RU" | "EN") => void;
  audioLevelRef?: React.MutableRefObject<number>;
  accentColor?: string;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  volume: number;
  isMuted: boolean;
  onVolumeChange: (value: number) => void;
  onToggleMute: () => void;
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

const SpeakerIcon = ({
  muted,
  ...props
}: SVGProps<SVGSVGElement> & { muted?: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" {...props}>
    <path
      d="M4 10v4h4l5 4V6l-5 4H4z"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    {!muted && (
      <>
        <path
          d="M16 9a4 4 0 0 1 0 6"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M18.5 6.5a7 7 0 0 1 0 11"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </>
    )}
    {muted && <line x1="19" y1="5" x2="5" y2="19" strokeWidth="2" />}
  </svg>
);

const lerp = (from: number, to: number, t: number) =>
  Math.round(from + (to - from) * t);

const lerpColor = (from: [number, number, number], to: [number, number, number], t: number) =>
  [lerp(from[0], to[0], t), lerp(from[1], to[1], t), lerp(from[2], to[2], t)] as [
    number,
    number,
    number,
  ];

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
  isFavorite,
  onToggleFavorite,
  volume,
  isMuted,
  onVolumeChange,
  onToggleMute,
}: PlayerScreenProps) {
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<number | null>(null);
  const [favoriteBurst, setFavoriteBurst] = useState(false);
  const [favoriteMessage, setFavoriteMessage] = useState<string | null>(null);
  const favoriteTimeoutRef = useRef<number | null>(null);
  const primaryTitle = (stationName || "SEARCHING...").toUpperCase();
  const shouldMarquee = primaryTitle.length > 18;
  const marqueeDuration = Math.max(12, primaryTitle.length * 0.6);
  const tagLabel = currentTag.toUpperCase();
  const trackDisplay = trackTitle?.trim() ? trackTitle : labels.trackFallback;
  const trackLine = trackDisplay.toUpperCase();
  const shouldTrackMarquee = trackLine.length > 24;
  const trackMarqueeDuration = Math.max(10, trackLine.length * 0.5);
  const statusLine = statusDetail ?? "";
  const shouldStatusMarquee = statusLine.length > 34;
  const canCopy = Boolean(trackTitle?.trim());
  const glowColor = accentColor ?? "#ff77a8";
  const titleStyle: React.CSSProperties & { [key: string]: string | number } = {
    filter: `drop-shadow(0 0 12px ${glowColor})`,
  };
  const trackStyle: React.CSSProperties & { [key: string]: string | number } | undefined =
    shouldTrackMarquee ? { ["--marquee-duration"]: `${trackMarqueeDuration}s` } : undefined;
  const statusStyle: (React.CSSProperties & { [key: string]: string | number }) | undefined =
    shouldStatusMarquee
      ? { ["--marquee-duration"]: `${Math.max(10, statusLine.length * 0.45)}s` }
      : undefined;
  const volumeValue = isMuted ? 0 : volume;
  const volumeColor = (() => {
    const low: [number, number, number] = [74, 248, 255];
    const mid: [number, number, number] = [166, 107, 255];
    const high: [number, number, number] = [255, 119, 168];
    if (volumeValue <= 0.4) {
      return lerpColor(low, mid, volumeValue / 0.4);
    }
    if (volumeValue <= 0.8) {
      return lerpColor(mid, high, (volumeValue - 0.4) / 0.4);
    }
    return high;
  })();
  const volumeColorVar = `${volumeColor[0]} ${volumeColor[1]} ${volumeColor[2]}`;
  const volumeStyle: React.CSSProperties & { [key: string]: string | number } = {
    ["--volume-fill"]: `${Math.round(volumeValue * 100)}%`,
    ["--volume-track-color"]: volumeColorVar,
  };

  if (shouldMarquee) {
    titleStyle["--marquee-duration"] = `${marqueeDuration}s`;
  }

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        window.clearTimeout(copyTimeoutRef.current);
      }
      if (favoriteTimeoutRef.current) {
        window.clearTimeout(favoriteTimeoutRef.current);
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

  const handleFavoriteClick = () => {
    const nextIsFavorite = !isFavorite;
    onToggleFavorite();
    if (nextIsFavorite) {
      setFavoriteMessage(labels.favoriteAdded);
      if (favoriteTimeoutRef.current) {
        window.clearTimeout(favoriteTimeoutRef.current);
      }
      favoriteTimeoutRef.current = window.setTimeout(() => {
        setFavoriteMessage(null);
      }, 1500);
    }
  };

  useEffect(() => {
    if (!isFavorite) return;
    setFavoriteBurst(true);
    const timeout = window.setTimeout(() => setFavoriteBurst(false), 500);
    return () => window.clearTimeout(timeout);
  }, [isFavorite]);

  return (
    <div
      className={`flex h-[100dvh] overflow-hidden items-center justify-center bg-background px-4 py-4 sm:min-h-screen sm:py-10 ${
        isPlaying ? "neon-breathe" : ""
      }`}
    >
      <div className="crt-shell w-full max-w-5xl rounded-3xl">
        <div className="crt-screen crt-text crt-life relative flex h-full flex-col items-center justify-between gap-4 rounded-3xl px-5 py-6 text-center text-neon sm:gap-10 sm:px-12 sm:py-10">
          <BackgroundFx />
          <div className="absolute left-4 top-4 h-3 w-16 bg-neon/40 shadow-[0_0_10px_rgba(255,119,168,0.6)] sm:left-6 sm:top-6 sm:shadow-[0_0_12px_rgba(255,119,168,0.7)]" />
          <div className="absolute right-4 top-4 h-3 w-10 bg-neon/40 shadow-[0_0_10px_rgba(255,119,168,0.6)] sm:right-6 sm:top-6 sm:shadow-[0_0_12px_rgba(255,119,168,0.7)]" />
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

          <div
            className={`pointer-events-none absolute left-4 top-4 text-[8px] sm:left-6 sm:top-6 sm:text-xs ${
              isPlaying ? "neon-title" : "text-neon/70"
            }`}
          >
            NEURO RADIO
          </div>

          <div className="mt-2 flex w-full max-w-3xl flex-col items-center gap-4 sm:mt-6 sm:gap-8">
            <p className="text-[9px] uppercase tracking-[0.3em] text-neon/80 sm:text-xs sm:tracking-[0.35em]">
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
            <p className="text-[8px] uppercase tracking-[0.25em] text-neon/70 sm:text-[10px] sm:tracking-[0.3em]">
              {labels.genre}: {tagLabel}
            </p>

            <div className="mt-1 flex w-full items-center justify-center sm:mt-2">
              <div
                className={`pixel-scene relative flex h-[25vh] max-h-[25vh] w-full max-w-2xl items-center justify-center rounded-3xl border-2 border-neon bg-[#2a182a] sm:h-64 sm:max-h-none ${
                  isPlaying ? "scene-pulse" : ""
                }`}
                style={
                  isPlaying
                    ? {
                        boxShadow: `0 0 18px ${glowColor}55, 0 0 36px ${glowColor}22`,
                      }
                    : undefined
                }
              >
                <div className="pixel-sun" />
                <div className="pixel-grid" />
                <div
                  className={`pixel-visualizer ${
                    isPlaying ? "visualizer-active" : "visualizer-muted"
                  } absolute bottom-6 flex h-20 w-full items-center justify-center rounded-2xl px-0 sm:bottom-8 sm:h-28`}
                >
                  <AudioWave
                    isPlaying={isPlaying}
                    className="h-full w-full"
                    canvasClassName="h-full w-full"
                    lineWidth={3}
                    levelRef={audioLevelRef}
                  />
                </div>
                <div className="pointer-events-none absolute right-4 top-4 flex items-center gap-2 text-[7px] uppercase tracking-[0.25em] text-neon sm:right-6 sm:top-6 sm:text-[9px] sm:tracking-[0.3em]">
                  <span className="live-dot h-2 w-2 rounded-full" />
                  {labels.liveStream}
                </div>
              </div>
            </div>

            <div className="flex w-full flex-nowrap items-center justify-center gap-4">
              <button
                type="button"
                onClick={onPrevStation}
                className="pixel-button flex h-10 w-10 items-center justify-center rounded-2xl border-2 border-neon bg-black/40 backdrop-blur-md transition-transform hover:scale-105 active:scale-95 will-change-transform sm:h-12 sm:w-12"
              >
                <Image
                  src="/icon-prev.svg"
                  alt="Previous station"
                  width={24}
                  height={24}
                  className="h-5 w-5 sm:h-7 sm:w-7"
                  priority
                />
              </button>
              <button
                type="button"
                onClick={onTogglePlay}
                className="pixel-button flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-neon bg-black/40 backdrop-blur-md transition-transform hover:scale-105 active:scale-95 will-change-transform sm:h-14 sm:w-14"
              >
                <Image
                  src={isPlaying ? "/icon-pause.svg" : "/icon-play.svg"}
                  alt={isPlaying ? "Pause" : "Play"}
                  width={28}
                  height={28}
                  className="h-6 w-6 sm:h-8 sm:w-8"
                  priority
                />
              </button>
              <button
                type="button"
                onClick={onNextStation}
                className="pixel-button flex h-10 w-10 items-center justify-center rounded-2xl border-2 border-neon bg-black/40 backdrop-blur-md transition-transform hover:scale-105 active:scale-95 will-change-transform sm:h-12 sm:w-12"
              >
                <Image
                  src="/icon-next.svg"
                  alt="Next station"
                  width={24}
                  height={24}
                  className="h-5 w-5 sm:h-7 sm:w-7"
                  priority
                />
              </button>
              <div className="relative">
                <motion.button
                  type="button"
                  onClick={handleFavoriteClick}
                  className={`pixel-button relative flex h-10 w-10 items-center justify-center rounded-2xl border-2 border-neon bg-black/40 text-neon backdrop-blur-md transition-transform hover:scale-105 active:scale-95 will-change-transform sm:h-12 sm:w-12 ${
                    isFavorite ? "text-neon-bright" : ""
                  }`}
                  aria-label={isFavorite ? labels.removeFavorite : labels.addFavorite}
                >
                  <motion.span
                    animate={favoriteBurst ? { scale: [1, 1.3, 1] } : { scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="relative z-10"
                  >
                    <HeartIcon className="h-5 w-5" filled={isFavorite} />
                  </motion.span>
                  <AnimatePresence>
                    {favoriteBurst && (
                      <motion.span
                        initial={{ opacity: 0.6, scale: 0.6 }}
                        animate={{ opacity: 0, scale: 1.6 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.5 }}
                        className="absolute inset-0 rounded-2xl border-2 border-neon"
                      />
                    )}
                  </AnimatePresence>
                </motion.button>
                <AnimatePresence>
                  {favoriteMessage && (
                    <motion.span
                      initial={{ opacity: 0, y: 6, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                      className="pointer-events-none absolute left-1/2 top-[-14px] -translate-x-1/2 text-[7px] uppercase tracking-[0.25em] text-neon-bright"
                    >
                      {favoriteMessage}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              <div className="hidden items-center gap-2 md:flex">
                <button
                  type="button"
                  onClick={onToggleMute}
                  className="flex h-9 w-9 items-center justify-center transition-transform hover:scale-105 active:scale-95 will-change-transform sm:h-10 sm:w-10"
                  style={{ color: `rgb(${volumeColorVar})` }}
                  aria-label={isMuted ? "Unmute" : "Mute"}
                >
                  <SpeakerIcon muted={isMuted} className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(event) => onVolumeChange(Number(event.target.value))}
                  className={`volume-slider h-5 w-24 ${isMuted ? "opacity-60" : ""}`}
                  style={volumeStyle}
                  aria-label="Volume"
                />
              </div>
            </div>

            <div className="mt-2 flex w-full items-center gap-3 md:hidden">
              <button
                type="button"
                onClick={onToggleMute}
                className="flex h-9 w-9 items-center justify-center transition-transform hover:scale-105 active:scale-95 will-change-transform"
                style={{ color: `rgb(${volumeColorVar})` }}
                aria-label={isMuted ? "Unmute" : "Mute"}
              >
                <SpeakerIcon muted={isMuted} className="h-4 w-4" />
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(event) => onVolumeChange(Number(event.target.value))}
                className={`volume-slider h-5 w-full ${isMuted ? "opacity-60" : ""}`}
                style={volumeStyle}
                aria-label="Volume"
              />
            </div>

            <button
              type="button"
              onClick={handleCopy}
              disabled={!canCopy}
              className={`relative mt-2 w-full max-w-2xl rounded-2xl border-2 border-neon bg-black/40 px-4 py-2 text-center backdrop-blur-md transition-transform will-change-transform sm:mt-4 sm:py-3 ${
                canCopy ? "hover:scale-105 active:scale-95" : "cursor-default opacity-80"
              }`}
              aria-label={trackLine}
            >
              <div className={shouldTrackMarquee ? "marquee" : ""}>
                <p
                  className={`text-[8px] uppercase tracking-[0.24em] text-neon-bright sm:text-[9px] sm:tracking-[0.32em] ${
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
              className="pixel-button mt-2 w-full max-w-[160px] rounded-2xl border-2 border-neon bg-black/40 px-4 py-2 text-[9px] uppercase tracking-[0.3em] text-neon backdrop-blur-md transition hover:bg-neon hover:text-[#2d1b2e] hover:scale-105 active:scale-95 will-change-transform sm:mt-4 sm:max-w-[200px] sm:px-6 sm:py-4 sm:text-xs sm:tracking-[0.35em]"
            >
              {labels.stop}
            </button>

            {statusText && (
              <p className="text-[8px] uppercase tracking-[0.25em] text-neon/70 sm:text-[10px] sm:tracking-[0.3em]">
                {statusText}
              </p>
            )}
            {statusDetail && (
              <div className={shouldStatusMarquee ? "marquee" : ""}>
                <p
                  className={`text-[7px] uppercase tracking-[0.25em] text-neon/50 sm:text-[9px] sm:tracking-[0.3em] ${
                    shouldStatusMarquee ? "marquee-track" : ""
                  }`}
                  style={statusStyle}
                >
                  {statusDetail}
                </p>
              </div>
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
            v2.0 BETA
          </div>
        </div>
      </div>
    </div>
  );
}

