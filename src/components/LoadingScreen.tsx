"use client";

type LoadingScreenProps = {
  progress: number; // 0 - 100
  title?: string;
  statusLine?: string;
  onCancel?: () => void;
};

export function LoadingScreen({
  progress,
  title = "ANALYZING VIBE...",
  statusLine,
  onCancel,
}: LoadingScreenProps) {
  const totalBlocks = 20;
  const activeBlocks = Math.round((progress / 100) * totalBlocks);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="crt-shell w-full max-w-4xl">
        <div className="crt-screen crt-text crt-life relative flex flex-col items-center gap-10 px-6 py-10 text-center text-neon sm:px-12">
          <div className="absolute left-6 top-6 h-3 w-16 bg-neon/40 shadow-[0_0_12px_rgba(255,119,168,0.7)]" />
          <div className="absolute right-6 top-6 h-3 w-10 bg-neon/40 shadow-[0_0_12px_rgba(255,119,168,0.7)]" />

          <div className="mt-6 flex w-full max-w-md flex-col items-center gap-6">
            <p className="text-[10px] uppercase tracking-[0.35em] text-neon-bright sm:text-xs">
              {title}
              <span className="blink-cursor">_</span>
            </p>

            <div className="w-full border-2 border-neon bg-[#2a182a] p-2">
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
                className="pixel-button mt-2 w-full max-w-[200px] border-2 border-neon bg-[#2a182a] px-4 py-3 text-[10px] uppercase tracking-[0.35em] text-neon transition hover:bg-neon hover:text-[#2d1b2e] sm:text-xs"
              >
                CANCEL
              </button>
            )}
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

