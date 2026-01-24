"use client";

import { useEffect, useRef, useState } from "react";
import { IdleScreen } from "../components/IdleScreen";
import { LoadingScreen } from "../components/LoadingScreen";
import { PlayerScreen } from "../components/PlayerScreen";
import { processTextInput } from "../lib/radio-engine";

type ScreenState = "idle" | "loading" | "playing";
type PlaybackState = "idle" | "playing" | "paused" | "blocked";
type Lang = "RU" | "EN";

type Station = {
  id: string;
  name: string;
  urlResolved: string;
  tags: string[];
  favicon?: string;
  country?: string;
};

const translations = {
  placeholder: {
    RU: "ЧТО ТЫ СЕЙЧАС ДЕЛАЕШЬ?",
    EN: "WHAT ARE YOU DOING?",
  },
  inputLabel: {
    RU: "ЧТО ТЫ СЕЙЧАС ДЕЛАЕШЬ?",
    EN: "WHAT ARE YOU DOING?",
  },
  statusIdle: {
    RU: "ОЖИДАНИЕ",
    EN: "IDLE",
  },
  statusTuning: {
    RU: "НАСТРОЙКА ВОЛНЫ...",
    EN: "TUNING FREQUENCY...",
  },
  statusPlaying: {
    RU: "ИГРАЕТ",
    EN: "PLAYING",
  },
  statusSignalLost: {
    RU: "СИГНАЛ ПОТЕРЯН — ПОВТОР...",
    EN: "SIGNAL LOST - RETRYING...",
  },
  statusNoStations: {
    RU: "НЕТ ДОСТУПНЫХ СТАНЦИЙ",
    EN: "NO LIVE STATIONS RESPONDING",
  },
  statusAudioBlocked: {
    RU: "АУДИО ЗАБЛОКИРОВАНО — НАЖМИ PLAY",
    EN: "AUDIO BLOCKED — PRESS PLAY",
  },
  statusSearchingFor: {
    RU: "ИЩУ: {tag}...",
    EN: "SEARCHING FOR {tag}...",
  },
  statusSignalLocked: {
    RU: "СИГНАЛ ЗАФИКСИРОВАН!",
    EN: "SIGNAL LOCKED!",
  },
  vibeDetail: {
    RU: "ВАЙБ: {category} | ЧАСТОТА: {genre}",
    EN: "VIBE: {category} | FREQUENCY: {genre}",
  },
  scanningAirwaves: {
    RU: "СКАНИРУЮ ЭФИР: {tag}....",
    EN: "SCANNING AIRWAVES: {tag}....",
  },
  searching: {
    RU: "ПОИСК...",
    EN: "SEARCHING...",
  },
  unknownStation: {
    RU: "НЕИЗВЕСТНАЯ СТАНЦИЯ",
    EN: "UNKNOWN STATION",
  },
  tagLine: {
    RU: "AI ГЕНЕРИРУЕТ ВАЙБЫ",
    EN: "AI GENERATED VIBES",
  },
  title: {
    RU: "NEURO RADIO",
    EN: "NEURO RADIO",
  },
  subtitle: {
    RU: "ТАКОЙ ВАЙБ",
    EN: "IT GOES LIKE",
  },
  startButton: {
    RU: "ЗАПУСТИТЬ СТАНЦИЮ",
    EN: "START STATION",
  },
  quickVibes: {
    RU: "БЫСТРЫЕ ВАЙБЫ:",
    EN: "QUICK VIBES:",
  },
  nowPlaying: {
    RU: "СЕЙЧАС ИГРАЕТ:",
    EN: "NOW PLAYING:",
  },
  genre: {
    RU: "ЖАНР",
    EN: "GENRE",
  },
  liveStream: {
    RU: "ПРЯМОЙ ЭФИР",
    EN: "LIVE STREAM",
  },
  stopButton: {
    RU: "СТОП",
    EN: "STOP",
  },
  cancel: {
    RU: "ОТМЕНА",
    EN: "CANCEL",
  },
} as const;

type TranslationKey = keyof typeof translations;

export default function Home() {
  const [lang, setLang] = useState<Lang>("RU");
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
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioLevelRef = useRef(0.25);

  const t = (key: TranslationKey) => translations[key][lang];
  const format = (key: TranslationKey, params: Record<string, string>) => {
    let text: string = t(key);
    Object.entries(params).forEach(([param, value]) => {
      text = text.replace(`{${param}}`, value);
    });
    return text;
  };

  const setLangValue = (value: Lang) => setLang(value);

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
    setStatusText(t("statusSignalLost"));
    if (reason) {
      setStatusDetail(reason);
    }

    if (failedCountRef.current >= list.length) {
      try {
        const { stations: refreshed } = await fetchStations(
          activeTagRef.current ?? "lofi"
        );
        if (!refreshed.length) {
          setStatusText(t("statusNoStations"));
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
        setStatusText(t("statusNoStations"));
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

    try {
      const context = new AudioContext();
      const analyser = context.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.85;
      const source = context.createMediaElementSource(audio);
      source.connect(analyser);
      analyser.connect(context.destination);
      audioContextRef.current = context;
      analyserRef.current = analyser;
      sourceRef.current = source;
    } catch (error) {
      console.warn("AudioContext init failed:", error);
    }

    const handlePlay = () => {
      setPlaybackState("playing");
      setStatusText(t("statusPlaying"));
      setStatusDetail(undefined);
      if (audioContextRef.current?.state === "suspended") {
        void audioContextRef.current.resume();
      }
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
    setStationName(station.name || t("unknownStation"));
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
      setStatusText(t("statusPlaying"));
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
    const isQuickTag = Boolean(tagOverride);
    const processed = isQuickTag ? null : processTextInput(userActivity);
    const initialTag = isQuickTag ? tagOverride : processed?.tag ?? "lofi";
    setStationTag(initialTag.toUpperCase());
    setActiveTag(initialTag);
    setScreen("loading");
    setIsConnecting(true);
    setConnectionProgress(0);
    setStations([]);
    setStationName("");
    setTrackTitle(null);
    setPlaybackState("idle");
    setStatusText(t("statusTuning"));
    if (isQuickTag) {
      setStatusDetail(format("statusSearchingFor", { tag: initialTag }));
    } else if (processed) {
      setStatusDetail(
        format("vibeDetail", {
          category: processed.category,
          genre: processed.genre,
        })
      );
      console.log(
        `User Input: ${userActivity}, Matched Vibe: ${processed.category}, Selected Genre: ${processed.genre}`
      );
    } else {
      setStatusDetail(
        format("vibeDetail", { category: "DIRECT", genre: "lofi" })
      );
    }
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
        if (isQuickTag) {
          setStatusDetail(t("statusSignalLocked"));
        }
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

  useEffect(() => {
    if (playbackState !== "playing") {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    const analyser = analyserRef.current;
    if (!analyser) return;

    const bufferLength = analyser.fftSize;
    const timeData = new Uint8Array(bufferLength);
    let fastEnergy = 0.2;
    let slowEnergy = 0.2;
    let beatPulse = 0;

    const tick = () => {
      analyser.getByteTimeDomainData(timeData);
      let sumSquares = 0;
      for (let i = 0; i < bufferLength; i += 1) {
        const centered = (timeData[i] - 128) / 128;
        sumSquares += centered * centered;
      }
      const rms = Math.sqrt(sumSquares / Math.max(1, bufferLength));
      const energy = Math.min(1, rms * 2.4);
      fastEnergy += (energy - fastEnergy) * 0.5;
      slowEnergy += (energy - slowEnergy) * 0.03;

      const isBeat = fastEnergy > slowEnergy * 1.12 && energy > 0.05;
      if (isBeat) {
        beatPulse = 1.2;
      } else {
        beatPulse *= 0.7;
      }

      const combined = Math.min(1.6, fastEnergy + beatPulse);
      audioLevelRef.current = Math.max(0.05, combined);
      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [playbackState]);

  if (screen === "loading") {
    return (
      <LoadingScreen
        progress={connectionProgress}
        title={format("scanningAirwaves", { tag: stationTag })}
        cancelLabel={t("cancel")}
        lang={lang}
        onSetLang={setLangValue}
      />
    );
  }

  if (screen === "playing") {
    return (
      <PlayerScreen
        stationName={stationName || t("searching")}
        currentTag={stationTag}
        trackTitle={trackTitle ?? undefined}
        onStop={handleStop}
        onTogglePlay={handleTogglePlay}
        onNextStation={handleNextStation}
        onPrevStation={handlePrevStation}
        isPlaying={playbackState === "playing"}
        statusText={
          playbackState === "blocked" ? t("statusAudioBlocked") : statusText
        }
        statusDetail={statusDetail}
        labels={{
          nowPlaying: t("nowPlaying"),
          genre: t("genre"),
          liveStream: t("liveStream"),
          stop: t("stopButton"),
        }}
        lang={lang}
        onSetLang={setLangValue}
        audioLevelRef={audioLevelRef}
      />
    );
  }

  return (
    <IdleScreen
      onStart={(activity, tagOverride) =>
        handleStart(activity.trim().length ? activity : t("statusIdle"), tagOverride)
      }
      labels={{
        tagLine: t("tagLine"),
        title: t("title"),
        subtitle: t("subtitle"),
        inputLabel: t("inputLabel"),
        placeholder: t("placeholder"),
        startButton: t("startButton"),
        quickVibes: t("quickVibes"),
      }}
      lang={lang}
      onSetLang={setLangValue}
    />
  );
}
