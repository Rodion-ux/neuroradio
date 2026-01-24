"use client";

import { useEffect, useRef, useState } from "react";
import { IdleScreen } from "../components/IdleScreen";
import { LoadingScreen } from "../components/LoadingScreen";
import { PlayerScreen } from "../components/PlayerScreen";

type ScreenState = "idle" | "loading" | "playing";
type PlaybackState = "idle" | "playing" | "paused" | "blocked";

export default function Home() {
  const [screen, setScreen] = useState<ScreenState>("idle");
  const [activity, setActivity] = useState<string>("IDLE");
  const [userAction, setUserAction] = useState("IDLE");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [statusIndex, setStatusIndex] = useState(0);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [nextUrl, setNextUrl] = useState<string | null>(null);
  const [isPrefetchingNext, setIsPrefetchingNext] = useState(false);
  const [playbackState, setPlaybackState] = useState<PlaybackState>("idle");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(60);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pendingSwapRef = useRef(false);
  const sessionRef = useRef(0);

  useEffect(() => {
    if (!isGenerating) return;

    setGenerationProgress(0);
    setStatusIndex(0);
    const startedAt = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const nextProgress = Math.min(100, Math.floor((elapsed / 30000) * 100));
      setGenerationProgress((prev) => (nextProgress > prev ? nextProgress : prev));
      if (nextProgress < 34) setStatusIndex(0);
      else if (nextProgress < 67) setStatusIndex(1);
      else setStatusIndex(2);
    }, 400);

    return () => clearInterval(interval);
  }, [isGenerating]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTime = () => setCurrentTime(Math.floor(audio.currentTime));
    const handleLoaded = () => {
      if (Number.isFinite(audio.duration)) {
        setDuration(Math.max(1, Math.round(audio.duration)));
      }
    };
    const handlePlay = () => setPlaybackState("playing");
    const handlePause = () => setPlaybackState("paused");
    const handleEnded = async () => {
      if (nextUrl) {
        const url = nextUrl;
        setNextUrl(null);
        await startPlayback(url);
        return;
      }
      pendingSwapRef.current = true;
      audio.currentTime = 0;
      try {
        await audio.play();
        setPlaybackState("playing");
      } catch {
        setPlaybackState("blocked");
      }
    };

    audio.addEventListener("timeupdate", handleTime);
    audio.addEventListener("loadedmetadata", handleLoaded);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.removeEventListener("timeupdate", handleTime);
      audio.removeEventListener("loadedmetadata", handleLoaded);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [generatedUrl, nextUrl]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  useEffect(() => {
    if (pendingSwapRef.current && nextUrl) {
      pendingSwapRef.current = false;
      const url = nextUrl;
      setNextUrl(null);
      void startPlayback(url);
    }
  }, [nextUrl]);

  useEffect(() => {
    if (screen !== "playing" || !generatedUrl) return;
    if (nextUrl || isPrefetchingNext) return;
    void prefetchNext(userAction);
  }, [screen, generatedUrl, nextUrl, isPrefetchingNext, userAction]);

  const generateTrack = async (action: string) => {
    const response = await fetch("/api/generate", {
      method: "POST",
      body: JSON.stringify({ userAction: action }),
      headers: { "Content-Type": "application/json" },
    });

    console.log("API Response status:", response.status);

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.error ?? "Failed to generate music");
    }

    const data = await response.json();
    if (!data.url) {
      throw new Error("No audio returned from model");
    }

    return data.url as string;
  };

  const startPlayback = async (url: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    const audio = new Audio(url);
    audio.loop = false;
    audio.volume = 0.75;
    audioRef.current = audio;
    setGeneratedUrl(url);
    setScreen("playing");
    setCurrentTime(0);
    setDuration(60);
    try {
      await audio.play();
      setPlaybackState("playing");
    } catch {
      setPlaybackState("blocked");
    }
  };

  const prefetchNext = async (action: string) => {
    if (isPrefetchingNext || nextUrl) return;
    setIsPrefetchingNext(true);
    const sessionId = sessionRef.current;
    try {
      const url = await generateTrack(action);
      if (sessionId !== sessionRef.current) return;
      setNextUrl(url);
    } catch (error) {
      console.error("Prefetch error:", error);
    } finally {
      if (sessionId === sessionRef.current) {
        setIsPrefetchingNext(false);
      }
    }
  };

  const handleStart = async (userActivity: string) => {
    const trimmedAction = userActivity.trim();
    const actionRaw = trimmedAction.length ? trimmedAction : "IDLE";
    const actionLabel = actionRaw.toUpperCase();
    sessionRef.current += 1;
    setActivity(actionLabel);
    setUserAction(actionRaw);
    setScreen("loading");
    setGeneratedUrl(null);
    setNextUrl(null);
    setIsGenerating(true);
    setGenerationProgress(0);
    setPlaybackState("idle");
    setCurrentTime(0);
    setDuration(60);
    pendingSwapRef.current = false;

    try {
      const url = await generateTrack(actionRaw);
      await startPlayback(url);
      void prefetchNext(actionRaw);
    } catch (error) {
      console.error("Generate error:", error);
      setScreen("idle");
    } finally {
      setIsGenerating(false);
      setGenerationProgress(100);
    }
  };

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    setGeneratedUrl(null);
    setNextUrl(null);
    setScreen("idle");
    setIsGenerating(false);
    setGenerationProgress(0);
    setPlaybackState("idle");
    setCurrentTime(0);
    setIsPrefetchingNext(false);
    pendingSwapRef.current = false;
    sessionRef.current += 1;
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

  const handleSeek = (nextTime: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  if (screen === "loading") {
    const statusSteps = [
      "COLLECTING PIXELS...",
      "WARMING UP NEURONS...",
      "TUNING FREQUENCIES...",
    ];
    return (
      <LoadingScreen
        progress={generationProgress}
        title={statusSteps[statusIndex]}
        statusLine={`GENRE: ${activity}`}
      />
    );
  }

  if (screen === "playing" && generatedUrl) {
    return (
      <PlayerScreen
        activity={activity}
        onStop={handleStop}
        onTogglePlay={handleTogglePlay}
        onSeek={handleSeek}
        isPlaying={playbackState === "playing"}
        currentTime={currentTime}
        duration={duration}
        statusText={
          playbackState === "blocked" ? "AUDIO BLOCKED — PRESS PLAY" : undefined
        }
      />
    );
  }

  return <IdleScreen onStart={handleStart} />;
}
