"use client";

import { useEffect, useRef, useState } from "react";
import { IdleScreen } from "../components/IdleScreen";
import { LoadingScreen } from "../components/LoadingScreen";
import { PlayerScreen } from "../components/PlayerScreen";
import { getStationByVibe } from "../lib/radio-engine";

type ScreenState = "idle" | "loading" | "playing";
type PlaybackState = "idle" | "playing" | "paused" | "blocked";

type Station = {
  id: string;
  name: string;
  urlResolved: string;
  tags: string[];
  favicon?: string;
  country?: string;
};

export default function Home() {
  const [screen, setScreen] = useState<ScreenState>("idle");
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionProgress, setConnectionProgress] = useState(0);
  const [stations, setStations] = useState<Station[]>([]);
  const [stationIndex, setStationIndex] = useState(0);
  const [stationTag, setStationTag] = useState("LOFI");
  const [activeTag, setActiveTag] = useState("lofi");
  const [stationName, setStationName] = useState("");
  const [trackTitle, setTrackTitle] = useState<string | null>(null);
  const [playbackState, setPlaybackState] = useState<PlaybackState>("idle");
  const [statusText, setStatusText] = useState<string | undefined>(undefined);
  const [statusDetail, setStatusDetail] = useState<string | undefined>(undefined);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioReadyRef = useRef(false);
  const sessionRef = useRef(0);
  const stationsRef = useRef<Station[]>([]);
  const stationIndexRef = useRef(0);
  const failedCountRef = useRef(0);
  const activeTagRef = useRef("lofi");
  const isSwitchingRef = useRef(false);
  const activeStationUrlRef = useRef<string | null>(null);

  useEffect(() => {
    stationsRef.current = stations;
  }, [stations]);

  useEffect(() => {
    activeTagRef.current = activeTag;
  }, [activeTag]);

  useEffect(() => {
    if (!isConnecting) return;

    setConnectionProgress(0);
    const startedAt = Date.now();
    const durationMs = 7000;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const nextProgress = Math.min(100, Math.floor((elapsed / durationMs) * 100));
      setConnectionProgress((prev) => (nextProgress > prev ? nextProgress : prev));
    }, 350);

    return () => clearInterval(interval);
  }, [isConnecting]);

  const handleStreamError = async (reason?: string) => {
    if (isSwitchingRef.current) return;
    const list = stationsRef.current;
    if (!list.length) return;
    isSwitchingRef.current = true;
    failedCountRef.current += 1;
    setStatusText("SIGNAL LOST - RETRYING...");
    if (reason) {
      setStatusDetail(reason);
    }

    if (failedCountRef.current >= list.length) {
      try {
        const { stations: refreshed } = await fetchStations(
          activeTagRef.current ?? "lofi"
        );
        if (!refreshed.length) {
          setStatusText("NO LIVE STATIONS RESPONDING");
          setPlaybackState("blocked");
          isSwitchingRef.current = false;
          return;
        }
        setStations(refreshed);
        stationsRef.current = refreshed;
        failedCountRef.current = 0;
        const randomIndex = Math.floor(Math.random() * refreshed.length);
        await startStationPlayback(randomIndex);
        isSwitchingRef.current = false;
        return;
      } catch {
        setStatusText("NO LIVE STATIONS RESPONDING");
        setPlaybackState("blocked");
        isSwitchingRef.current = false;
        return;
      }
    }

    const nextIndex = (stationIndexRef.current + 1) % list.length;
    await startStationPlayback(nextIndex);
    isSwitchingRef.current = false;
  };

  const setupAudio = (audio: HTMLAudioElement) => {
    if (audioReadyRef.current) return;
    audioReadyRef.current = true;

    const handlePlay = () => {
      setPlaybackState("playing");
      setStatusText("PLAYING");
      setStatusDetail(undefined);
    };
    const handlePause = () => setPlaybackState("paused");
    const handleError = () => {
      void handleStreamError("audio.onerror");
    };

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("error", handleError);
    audio.addEventListener("stalled", () => {
      void handleStreamError("audio stalled");
    });
    audio.addEventListener("ended", () => {
      void handleStreamError("stream ended");
    });
  };

  const startStationPlayback = async (index: number) => {
    const list = stationsRef.current;
    if (!list.length) return;

    const safeIndex = (index + list.length) % list.length;
    const station = list[safeIndex];
    stationIndexRef.current = safeIndex;
    setStationIndex(safeIndex);
    setStationName(station.name || "Unknown Station");
    setTrackTitle(null);
    setStatusText(undefined);
    activeStationUrlRef.current = station.urlResolved;

    const audio = audioRef.current ?? new Audio();
    audioRef.current = audio;
    setupAudio(audio);
    audio.src = station.urlResolved;
    audio.loop = false;
    audio.volume = 0.75;
    audio.preload = "none";
    audio.crossOrigin = "anonymous";
    const timeoutId = window.setTimeout(() => {
      if (audio.readyState < 2) {
        void handleStreamError("stream timeout");
      }
    }, 5000);
    const clearTimeouts = () => window.clearTimeout(timeoutId);
    audio.addEventListener("playing", clearTimeouts, { once: true });
    audio.addEventListener("canplay", clearTimeouts, { once: true });

    console.log("Попытка воспроизведения URL:", station.urlResolved);

    try {
      await audio.play();
      failedCountRef.current = 0;
      setStatusText("PLAYING");
    } catch {
      if (audio.error) {
        void handleStreamError("playback error");
      } else {
        setPlaybackState("blocked");
      }
    }
  };

  const fetchStations = async (tag: string) => {
    const requestTag = tag.trim().toLowerCase();
    const response = await fetch("/api/generate", {
      method: "POST",
      body: JSON.stringify({ tag: requestTag }),
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.error ?? "Failed to fetch stations");
    }

    const data = await response.json();
    return {
      tag: (data.tag as string) ?? tag,
      stations: (data.stations as Station[]) ?? [],
    };
  };

  const handleStart = async (userActivity: string, tagOverride?: string) => {
    const sessionId = sessionRef.current + 1;
    sessionRef.current = sessionId;
    const initialTag = tagOverride ? tagOverride : getStationByVibe(userActivity);
    setStationTag(initialTag.toUpperCase());
    setActiveTag(initialTag);
    setScreen("loading");
    setIsConnecting(true);
    setConnectionProgress(0);
    setStations([]);
    setStationName("");
    setTrackTitle(null);
    setPlaybackState("idle");
    setStatusText("TUNING...");
    setStatusDetail(`Searching for ${initialTag}...`);
    failedCountRef.current = 0;
    activeStationUrlRef.current = null;

    try {
      let resolvedTag = initialTag;
      let stationList: Station[] = [];
      let secureIndex = -1;

      for (let attempt = 0; attempt < 3 && secureIndex === -1; attempt += 1) {
        const result = await fetchStations(resolvedTag);
        if (sessionId !== sessionRef.current) return;
        stationList = result.stations;
        resolvedTag = result.tag;
        setStationTag(resolvedTag.toUpperCase());
        setActiveTag(resolvedTag);

        if (!stationList.length) {
          throw new Error("No stations found");
        }

        secureIndex = stationList.findIndex((station) =>
          station.urlResolved.toLowerCase().startsWith("https://")
        );
      }

      if (secureIndex === -1) {
        throw new Error("No secure streams available for this tag");
      }

      setStations(stationList);
      stationsRef.current = stationList;
      await startStationPlayback(secureIndex);
      if (sessionId === sessionRef.current) {
        setStatusDetail("Signal Locked!");
        setScreen("playing");
      }
    } catch (error) {
      console.error("Station fetch error:", error);
      setStatusText(
        error instanceof Error ? error.message : "Unable to find live stations"
      );
      setScreen("idle");
    } finally {
      if (sessionId === sessionRef.current) {
        setIsConnecting(false);
        setConnectionProgress(100);
      }
    }
  };

  const handleStop = () => {
    sessionRef.current += 1;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    setScreen("idle");
    setStations([]);
    setStationName("");
    setTrackTitle(null);
    setPlaybackState("idle");
    setStatusText(undefined);
    setStatusDetail(undefined);
    setConnectionProgress(0);
    setIsConnecting(false);
    activeStationUrlRef.current = null;
  };

  const handleTogglePlay = async () => {
    if (!audioRef.current) return;
    if (playbackState === "playing") {
      audioRef.current.pause();
      setPlaybackState("paused");
      return;
    }
    try {
      await audioRef.current.play();
      setPlaybackState("playing");
    } catch {
      setPlaybackState("blocked");
    }
  };

  const handleNextStation = () => {
    const list = stationsRef.current;
    if (!list.length) return;
    failedCountRef.current = 0;
    const nextIndex = (stationIndexRef.current + 1) % list.length;
    void startStationPlayback(nextIndex);
  };

  const handlePrevStation = () => {
    const list = stationsRef.current;
    if (!list.length) return;
    failedCountRef.current = 0;
    const prevIndex = (stationIndexRef.current - 1 + list.length) % list.length;
    void startStationPlayback(prevIndex);
  };

  useEffect(() => {
    if (screen !== "playing") return;
    const url = activeStationUrlRef.current;
    if (!url) return;

    let cancelled = false;
    const fetchMetadata = async () => {
      try {
        const response = await fetch(
          `/api/stream-meta?url=${encodeURIComponent(url)}`
        );
        if (!response.ok) return;
        const payload = await response.json();
        const title = typeof payload.title === "string" ? payload.title.trim() : "";
        if (!cancelled) {
          setTrackTitle(title.length ? title : null);
        }
      } catch {
        if (!cancelled) {
          setTrackTitle(null);
        }
      }
    };

    void fetchMetadata();
    const interval = setInterval(fetchMetadata, 15000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [screen, stationIndex]);

  if (screen === "loading") {
    return (
      <LoadingScreen
        progress={connectionProgress}
        title={`SCANNING AIRWAVES: ${stationTag}....`}
      />
    );
  }

  if (screen === "playing") {
    return (
      <PlayerScreen
        stationName={stationName || "SEARCHING..."}
        currentTag={stationTag}
        trackTitle={trackTitle ?? undefined}
        onStop={handleStop}
        onTogglePlay={handleTogglePlay}
        onNextStation={handleNextStation}
        onPrevStation={handlePrevStation}
        isPlaying={playbackState === "playing"}
        statusText={
          playbackState === "blocked" ? "AUDIO BLOCKED — PRESS PLAY" : statusText
        }
        statusDetail={statusDetail}
      />
    );
  }

  return <IdleScreen onStart={handleStart} />;
}
