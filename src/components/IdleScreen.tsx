"use client";

import { useState, FormEvent } from "react";

type IdleScreenProps = {
  onStart: (activity: string) => void;
};

export function IdleScreen({ onStart }: IdleScreenProps) {
  const [activity, setActivity] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = activity.trim();
    onStart(trimmed.length > 0 ? trimmed : "IDLE");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-black">
      <div className="crt relative flex w-full max-w-xl flex-col items-center gap-10 px-6 py-10 text-center text-neon sm:px-10">
        <div className="pointer-events-none absolute left-4 top-4 text-[10px] text-neon/70 sm:text-xs">
          NEURO RADIO
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-6 flex w-full max-w-md flex-col items-center gap-6"
        >
          <label
            htmlFor="activity"
            className="text-[10px] uppercase tracking-[0.25em] text-neon/80 sm:text-xs"
          >
            WHAT ARE YOU DOING?
          </label>

          <input
            id="activity"
            type="text"
            value={activity}
            onChange={(e) => setActivity(e.target.value)}
            className="w-full rounded-none border-2 border-neon bg-black px-3 py-3 text-[10px] uppercase tracking-[0.2em] text-neon outline-none ring-2 ring-transparent transition focus:border-neon-bright focus:ring-neon-bright sm:px-4 sm:py-4 sm:text-xs"
            autoComplete="off"
          />

          <button
            type="submit"
            className="pixel-button mt-4 w-full max-w-[220px] border-2 border-neon bg-black px-4 py-3 text-[10px] uppercase tracking-[0.25em] text-neon transition hover:bg-neon hover:text-black sm:px-6 sm:py-4 sm:text-xs"
          >
            START STATION
          </button>
        </form>

        <div className="pointer-events-none absolute bottom-4 right-4 text-[8px] text-neon/60 sm:text-[10px]">
          v0.1 BETA
        </div>
      </div>
    </div>
  );
}

