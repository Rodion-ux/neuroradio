"use client";

import Image from "next/image";

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
};

const bars = Array.from({ length: 16 });

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
}: PlayerScreenProps) {
  const primaryTitle = (stationName || "SEARCHING...").toUpperCase();
  const shouldMarquee = primaryTitle.length > 18;
  const marqueeDuration = Math.max(12, primaryTitle.length * 0.6);
  const tagLabel = currentTag.toUpperCase();
  const trackLine = trackTitle ? trackTitle.toUpperCase() : "";
  const shouldTrackMarquee = trackLine.length > 24;
  const trackMarqueeDuration = Math.max(10, trackLine.length * 0.5);

  return (
    <div className={`flex min-h-screen items-center justify-center bg-background px-4 py-10 ${isPlaying ? "neon-breathe" : ""}`}>
      <div className="crt-shell w-full max-w-5xl">
        <div className="crt-screen crt-text crt-life relative flex flex-col items-center gap-10 px-6 py-10 text-center text-neon sm:px-12">
          <div className="absolute left-6 top-6 h-3 w-16 bg-neon/40 shadow-[0_0_12px_rgba(255,119,168,0.7)]" />
          <div className="absolute right-6 top-6 h-3 w-10 bg-neon/40 shadow-[0_0_12px_rgba(255,119,168,0.7)]" />
          <div
            className={`pointer-events-none absolute left-6 top-6 text-[10px] sm:text-xs ${
              isPlaying ? "neon-title" : "text-neon/70"
            }`}
          >
            NEURO RADIO
          </div>

          <div className="mt-6 flex w-full max-w-3xl flex-col items-center gap-8">
            <p className="text-[10px] uppercase tracking-[0.35em] text-neon/80 sm:text-xs">
              NOW PLAYING:
            </p>
            <div className={shouldMarquee ? "marquee" : ""}>
              <p
                className={`title-3d glow-pulse text-[12px] uppercase tracking-[0.35em] text-neon-bright sm:text-base ${
                  shouldMarquee ? "marquee-track" : ""
                }`}
                style={
                  shouldMarquee
                    ? ({ ["--marquee-duration" as string]: `${marqueeDuration}s` } as React.CSSProperties)
                    : undefined
                }
              >
                {primaryTitle} {shouldMarquee ? " • " + primaryTitle : ""}
              </p>
            </div>
            <p className="text-[8px] uppercase tracking-[0.3em] text-neon/70 sm:text-[10px]">
              GENRE: {tagLabel}
            </p>

            <div className="mt-2 flex w-full items-center justify-center">
              <div
                className={`pixel-scene relative flex h-52 w-full max-w-2xl items-center justify-center border-2 border-neon bg-[#2a182a] sm:h-64 ${
                  isPlaying ? "scene-pulse" : ""
                }`}
              >
                <div className="pixel-sun" />
                <div className="pixel-horizon" />
                <div className="pixel-grid" />
                <div
                  className={`pixel-visualizer ${
                    isPlaying ? "visualizer-active" : "visualizer-muted"
                  } absolute bottom-8 flex h-24 w-[75%] items-end justify-between border-2 border-neon bg-[#2a182a] px-3 pb-3 pt-4 sm:h-28 sm:px-4 sm:pb-4`}
                >
                  {bars.map((_, i) => (
                    <div
                      key={i}
                      className={`h-full w-[6%] origin-bottom bg-neon-bright visualizer-bar visualizer-bar-${i}`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex w-full flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={onPrevStation}
                className="pixel-button flex h-11 w-11 items-center justify-center border-2 border-neon bg-[#2a182a] sm:h-12 sm:w-12"
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
                className="pixel-button flex h-12 w-12 items-center justify-center border-2 border-neon bg-[#2a182a] sm:h-14 sm:w-14"
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
                className="pixel-button flex h-11 w-11 items-center justify-center border-2 border-neon bg-[#2a182a] sm:h-12 sm:w-12"
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
              <div className="pixel-button flex h-11 items-center gap-2 border-2 border-neon bg-[#2a182a] px-3 text-[8px] text-neon sm:h-12 sm:px-4 sm:text-[10px]">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-neon-bright" />
                  LIVE STREAM
                </span>
              </div>
            </div>

            {trackTitle && (
              <div className="mt-4 w-full max-w-2xl">
                <div className={shouldTrackMarquee ? "marquee" : ""}>
                  <p
                    className={`text-[9px] uppercase tracking-[0.3em] text-neon-bright ${
                      shouldTrackMarquee ? "marquee-track" : ""
                    }`}
                    style={
                      shouldTrackMarquee
                        ? ({ ["--marquee-duration" as string]: `${trackMarqueeDuration}s` } as React.CSSProperties)
                        : undefined
                    }
                  >
                    {trackLine}
                    {shouldTrackMarquee ? ` • ${trackLine}` : ""}
                  </p>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={onStop}
              className="pixel-button mt-4 w-full max-w-[180px] border-2 border-neon bg-[#2a182a] px-4 py-3 text-[10px] uppercase tracking-[0.35em] text-neon transition hover:bg-neon hover:text-[#2d1b2e] sm:px-6 sm:py-4 sm:text-xs"
            >
              STOP
            </button>

            {statusText && (
              <p className="text-[8px] uppercase tracking-[0.25em] text-neon/70 sm:text-[10px]">
                {statusText}
              </p>
            )}
            {statusDetail && (
              <p className="text-[7px] uppercase tracking-[0.25em] text-neon/50 sm:text-[9px]">
                {statusDetail}
              </p>
            )}
          </div>

          {isPlaying && (
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <span className="pixel-note note-left-1" />
              <span className="pixel-note note-left-2" />
              <span className="pixel-note note-left-3" />
              <span className="pixel-note note-right-1" />
              <span className="pixel-note note-right-2" />
              <span className="pixel-note note-right-3" />
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

