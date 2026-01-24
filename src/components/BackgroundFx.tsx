"use client";

import { memo } from "react";

export const BackgroundFx = memo(function BackgroundFx() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="fx-stars" />
      <div className="fx-rain" />
      <div className="fx-scanlines" />
      <div className="fx-flicker" />
    </div>
  );
});
