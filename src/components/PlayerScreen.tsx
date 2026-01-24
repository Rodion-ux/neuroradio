"use client";

import Image from "next/image";

type PlayerScreenProps = {
  activity: string;
  onStop: () => void;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  statusText?: string;
};

const bars = Array.from({ length: 16 });

export function PlayerScreen({
  activity,
  onStop,
  onTogglePlay,
  onSeek,
  isPlaying,
  currentTime,
  duration,
  statusText,
}: PlayerScreenProps) {
  const label = activity.trim().length ? activity.trim().toUpperCase() : "IDLE";
  const safeDuration = Math.max(1, duration);
  const progress = Math.min(100, (currentTime / safeDuration) * 100);

  const formatTime = (value: number) => {
    const minutes = Math.floor(value / 60)
      .toString()
      .padStart(2, "0");
    const seconds = Math.floor(value % 60)
      .toString()
      .padStart(2, "0");
    return `${minutes}:${seconds}`;
  };

  return (
    <div className={`flex min-h-screen items-center justify-center bg-black ${isPlaying ? "neon-breathe" : ""}`}>
      <div className="crt relative flex w-full max-w-xl flex-col items-center gap-10 px-6 py-10 text-center text-neon sm:px-10">
        <div
          className={`pointer-events-none absolute left-4 top-4 text-[10px] sm:text-xs ${
            isPlaying ? "neon-title" : "text-neon/70"
          }`}
        >
          NEURO RADIO
        </div>

        <div className="mt-6 flex w-full max-w-md flex-col items-center gap-8">
          <p className="text-[10px] uppercase tracking-[0.25em] text-neon/80 sm:text-xs">
            NOW PLAYING:
          </p>
          <p className="text-[10px] uppercase tracking-[0.25em] text-neon-bright sm:text-xs">
            {label} BEATS
          </p>

          <div className="mt-4 flex w-full items-center justify-center">
            <div
              className={`pixel-visualizer ${
                isPlaying ? "visualizer-active" : "visualizer-muted"
              } flex h-36 w-full max-w-sm items-end justify-between border-2 border-neon bg-black px-3 pb-3 pt-4 sm:h-44 sm:px-4 sm:pb-4`}
            >
              {bars.map((_, i) => (
                <div
                  key={i}
                  className={`h-full w-[6%] origin-bottom bg-neon-bright visualizer-bar visualizer-bar-${i}`}
                />
              ))}
            </div>
          </div>

          <div className="flex w-full flex-wrap items-center justify-center gap-3">
            <div className="pixel-button flex h-11 w-11 items-center justify-center border-2 border-neon bg-black sm:h-12 sm:w-12">
              <Image
                src="/icon-prev.svg"
                alt="Previous track"
                width={24}
                height={24}
                className="h-6 w-6 sm:h-7 sm:w-7"
                priority
              />
            </div>
            <button
              type="button"
              onClick={onTogglePlay}
              className="pixel-button flex h-12 w-12 items-center justify-center border-2 border-neon bg-black sm:h-14 sm:w-14"
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
            <div className="pixel-button flex h-11 w-11 items-center justify-center border-2 border-neon bg-black sm:h-12 sm:w-12">
              <Image
                src="/icon-next.svg"
                alt="Next track"
                width={24}
                height={24}
                className="h-6 w-6 sm:h-7 sm:w-7"
                priority
              />
            </div>
            <div className="pixel-button flex h-11 items-center gap-2 border-2 border-neon bg-black px-3 text-[8px] text-neon sm:h-12 sm:px-4 sm:text-[10px]">
              <Image
                src="/icon-clock.svg"
                alt="Timer"
                width={24}
                height={24}
                className="h-5 w-5 sm:h-6 sm:w-6"
                priority
              />
              <span>
                {formatTime(currentTime)} / {formatTime(safeDuration)}
              </span>
            </div>
          </div>

          <div className="flex w-full max-w-md flex-col gap-2">
            <div className="pixel-progress h-2 w-full border-2 border-neon bg-black">
              <div
                className="h-full bg-neon"
                style={{ width: `${progress}%` }}
              />
            </div>
            <input
              type="range"
              min={0}
              max={safeDuration}
              step={1}
              value={Math.floor(currentTime)}
              onChange={(event) => onSeek(Number(event.target.value))}
              className="pixel-slider w-full"
              aria-label="Track position"
            />
          </div>

          <button
            type="button"
            onClick={onStop}
            className="pixel-button mt-4 w-full max-w-[180px] border-2 border-neon bg-black px-4 py-3 text-[10px] uppercase tracking-[0.25em] text-neon transition hover:bg-neon hover:text-black sm:px-6 sm:py-4 sm:text-xs"
          >
            STOP
          </button>

          {statusText && (
            <p className="text-[8px] uppercase tracking-[0.25em] text-neon/70 sm:text-[10px]">
              {statusText}
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

        <div className="pointer-events-none absolute bottom-4 right-4 text-[8px] text-neon/60 sm:text-[10px]">
          v0.1 BETA
        </div>
      </div>
    </div>
  );
}

