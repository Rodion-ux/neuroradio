"use client";

type LoadingScreenProps = {
  progress: number; // 0 - 100
  title?: string;
  statusLine?: string;
};

export function LoadingScreen({
  progress,
  title = "ANALYZING VIBE...",
  statusLine,
}: LoadingScreenProps) {
  const totalBlocks = 20;
  const activeBlocks = Math.round((progress / 100) * totalBlocks);

  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <div className="crt relative flex w-full max-w-xl flex-col items-center gap-10 px-6 py-10 text-center text-neon sm:px-10">
        <div className="pointer-events-none absolute left-4 top-4 text-[10px] text-neon/70 sm:text-xs">
          NEURO RADIO
        </div>

        <div className="mt-6 flex w-full max-w-md flex-col items-center gap-6">
          <p className="text-[10px] uppercase tracking-[0.25em] text-neon/80 sm:text-xs">
            {title}
          </p>

          <div className="w-full border-2 border-neon bg-black p-2">
            <div className="grid grid-cols-20 gap-[2px]">
              {Array.from({ length: totalBlocks }).map((_, i) => (
                <div
                  key={i}
                  className={`h-4 sm:h-5 ${
                    i < activeBlocks ? "bg-neon" : "bg-black"
                  }`}
                />
              ))}
            </div>
          </div>

          {statusLine && (
            <p className="text-[8px] uppercase tracking-[0.25em] text-neon/60 sm:text-[10px]">
              {statusLine}
            </p>
          )}

          <p className="text-[8px] uppercase tracking-[0.25em] text-neon/60 sm:text-[10px]">
            {progress.toString().padStart(3, "0")}%
          </p>
        </div>

        <div className="pointer-events-none absolute bottom-4 right-4 text-[8px] text-neon/60 sm:text-[10px]">
          v0.1 BETA
        </div>
      </div>
    </div>
  );
}

