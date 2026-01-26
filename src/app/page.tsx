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

type FavoriteStation = {
  changeuuid: string;
  name: string;
  url_resolved: string;
  tags: string[];
  favicon?: string;
};

const FAVORITES_KEY = "neuroradio_favorites";
const VOLUME_KEY = "neuroradio_volume";

const readFavorites = (): FavoriteStation[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(FAVORITES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => {
      if (!item || typeof item !== "object") return false;
      return (
        typeof item.changeuuid === "string" &&
        typeof item.name === "string" &&
        typeof item.url_resolved === "string"
      );
    });
  } catch {
    return [];
  }
};

const writeFavorites = (favorites: FavoriteStation[]) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  } catch {
    // Ignore storage failures.
  }
};

const favoriteToStation = (favorite: FavoriteStation): Station => ({
  id: favorite.changeuuid,
  name: favorite.name,
  urlResolved: favorite.url_resolved,
  tags: Array.isArray(favorite.tags) ? favorite.tags : [],
  favicon: favorite.favicon,
});

const resolveAccentColor = (tag: string) => {
  const value = tag.toLowerCase();
  if (value.includes("synth") || value.includes("retro") || value.includes("wave")) {
    return "#6bf3ff";
  }
  if (value.includes("ambient") || value.includes("zen") || value.includes("sleep")) {
    return "#7aa8ff";
  }
  if (value.includes("techno") || value.includes("dnb") || value.includes("drum")) {
    return "#b67bff";
  }
  if (value.includes("phonk") || value.includes("hardstyle")) {
    return "#5bff87";
  }
  if (value.includes("jazz") || value.includes("piano") || value.includes("soul")) {
    return "#ffc774";
  }
  return "#ff77a8";
};

const translations = {
  placeholder: {
    RU: "Опиши занятие или настроение...",
    EN: "Describe your activity or mood...",
  },
  inputLabel: {
    RU: "Опиши занятие или настроение...",
    EN: "Describe your activity or mood...",
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
  statusStationUnstable: {
    RU: "СТАНЦИЯ НЕСТАБИЛЬНА — ПЕРЕКЛЮЧЕНИЕ...",
    EN: "STATION UNSTABLE — SKIPPING...",
  },
  aiThinking: {
    RU: "AI ДУМАЕТ...",
    EN: "AI THINKING...",
  },
  aiAnalyzing: {
    RU: "[ СКАНИРУЮ КОНТЕКСТ... ]",
    EN: "[ ANALYZING VIBE... ]",
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
    RU: "VIBE MATCHED: {genre}",
    EN: "VIBE MATCHED: {genre}",
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
    RU: "АДАПТИВНОЕ НЕЙРО-РАДИО",
    EN: "ADAPTIVE NEURO RADIO",
  },
  title: {
    RU: "NEURO RADIO",
    EN: "NEURO RADIO",
  },
  subtitle: {
    RU: "Саундтрек твоего момента",
    EN: "Soundtrack for your reality",
  },
  startButton: {
    RU: "ПОЙМАТЬ ВОЛНУ",
    EN: "TUNE IN",
  },
  quickVibes: {
    RU: "БЫСТРЫЙ ВЫБОР:",
    EN: "INSTANT MOODS:",
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
  trackFallback: {
    RU: "ПОДКЛЮЧАЙСЯ...",
    EN: "TUNE IN...",
  },
  copied: {
    RU: "[ СКОПИРОВАНО! ]",
    EN: "[ COPIED! ]",
  },
  favoritesTitle: {
    RU: "МОЯ КОЛЛЕКЦИЯ:",
    EN: "MY COLLECTION:",
  },
  addFavorite: {
    RU: "В ИЗБРАННОЕ",
    EN: "ADD TO FAVORITES",
  },
  removeFavorite: {
    RU: "УБРАТЬ ИЗ ИЗБРАННОГО",
    EN: "REMOVE FROM FAVORITES",
  },
  favoriteAdded: {
    RU: "ДОБАВЛЕНО В ИЗБРАННОЕ",
    EN: "ADDED TO FAVORITES",
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
  const [aiReasoning, setAiReasoning] = useState("");
  const [favorites, setFavorites] = useState<FavoriteStation[]>([]);
  const [volume, setVolume] = useState(0.7);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioReadyRef = useRef(false);
  const sessionRef = useRef(0);
  const stationsRef = useRef<Station[]>([]);
  const stationIndexRef = useRef(0);
  const failedCountRef = useRef(0);
  const activeTagRef = useRef("lofi");
  const activeStationUrlRef = useRef<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioLevelRef = useRef(0.25);
  const volumeFadeRef = useRef<number | null>(null);
  const lastAudibleVolumeRef = useRef(0.7);
  const streamTimeoutRef = useRef<number | null>(null);

  const isMuted = volume === 0;

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
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(VOLUME_KEY);
    if (raw === null) return;
    const parsed = Number.parseFloat(raw);
    if (!Number.isFinite(parsed)) return;
    const clamped = Math.min(1, Math.max(0, parsed));
    setVolume(clamped);
    if (clamped > 0) {
      lastAudibleVolumeRef.current = clamped;
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(VOLUME_KEY, volume.toString());
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (volumeFadeRef.current) {
      cancelAnimationFrame(volumeFadeRef.current);
      volumeFadeRef.current = null;
    }
    audio.volume = volume;
  }, [volume]);

  useEffect(() => {
    activeTagRef.current = activeTag;
  }, [activeTag]);

  const fadeToVolume = (target: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (volumeFadeRef.current) {
      cancelAnimationFrame(volumeFadeRef.current);
      volumeFadeRef.current = null;
    }
    const startVolume = audio.volume;
    const duration = 700;
    const startTime = performance.now();

    const step = (timestamp: number) => {
      const progress = Math.min(1, (timestamp - startTime) / duration);
      const eased = progress * progress * (3 - 2 * progress);
      audio.volume = startVolume + (target - startVolume) * eased;
      if (progress < 1) {
        volumeFadeRef.current = requestAnimationFrame(step);
      } else {
        volumeFadeRef.current = null;
      }
    };

    volumeFadeRef.current = requestAnimationFrame(step);
  };

  useEffect(() => {
    setFavorites(readFavorites());
  }, []);

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
    const list = stationsRef.current;
    if (!list.length) return;
    failedCountRef.current += 1;
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    
    if (reason === "stream timeout") {
      setStatusText(t("statusStationUnstable"));
      setStatusDetail("Timeout: Station not responding");
    } else {
      setStatusText(t("statusSignalLost"));
      if (reason) {
        setStatusDetail(reason);
      }
    }

    if (failedCountRef.current >= list.length) {
      try {
        const { stations: refreshed } = await fetchStations(
          activeTagRef.current ?? "lofi"
        );
        if (!refreshed.length) {
          setStatusText(t("statusNoStations"));
          setPlaybackState("blocked");
          return;
        }
        setStations(refreshed);
        stationsRef.current = refreshed;
        failedCountRef.current = 0;
        const randomIndex = Math.floor(Math.random() * refreshed.length);
        await startStationPlayback(randomIndex);
        return;
      } catch {
        setStatusText(t("statusNoStations"));
        setPlaybackState("blocked");
        return;
      }
    }

    const nextIndex = (stationIndexRef.current + 1) % list.length;
    await startStationPlayback(nextIndex);
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
      setStatusText(undefined);
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

    if (streamTimeoutRef.current) {
      window.clearTimeout(streamTimeoutRef.current);
      streamTimeoutRef.current = null;
    }

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
    audio.volume = 0;
    audio.preload = "none";
    audio.crossOrigin = "anonymous";
    
    let hasPlaybackSignal = false;
    let timeoutCleared = false;
    
    const timeoutId = window.setTimeout(() => {
      if (!hasPlaybackSignal && !timeoutCleared) {
        setStatusText(t("statusStationUnstable"));
        setStatusDetail("Timeout: Station not responding");
        streamTimeoutRef.current = null;
        void handleStreamError("stream timeout");
      }
    }, 5000);
    
    streamTimeoutRef.current = timeoutId;
    
    const clearTimeouts = () => {
      hasPlaybackSignal = true;
      if (!timeoutCleared) {
        timeoutCleared = true;
        window.clearTimeout(timeoutId);
        streamTimeoutRef.current = null;
      }
    };
    
    audio.addEventListener("playing", clearTimeouts, { once: true });
    audio.addEventListener("canplay", clearTimeouts, { once: true });
    audio.addEventListener("loadstart", () => {
      setStatusText(t("statusTuning"));
    }, { once: true });

    console.log("Попытка воспроизведения URL:", station.urlResolved);

    try {
      await audio.play();
      failedCountRef.current = 0;
      if (hasPlaybackSignal) {
        setStatusText(undefined);
      }
      if (volume > 0) {
        fadeToVolume(volume);
      }
    } catch {
      if (!timeoutCleared) {
        timeoutCleared = true;
        window.clearTimeout(timeoutId);
        streamTimeoutRef.current = null;
      }
      if (audio.error) {
        void handleStreamError("playback error");
      } else {
        setPlaybackState("blocked");
      }
    }
  };

  const fetchStations = async (tag: string, useRandomOrder = false) => {
    const requestTag = tag.trim().toLowerCase();
    // Добавляем timestamp для обхода кеша браузера
    const cacheBuster = Date.now();
    const response = await fetch(`/api/generate?t=${cacheBuster}`, {
      method: "POST",
      body: JSON.stringify({ tag: requestTag, useRandomOrder }),
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
    
    // Initialize UI
    setScreen("loading");
    setIsConnecting(true);
    setConnectionProgress(0);
    setStations([]);
    setStationName("");
    setTrackTitle(null);
    setPlaybackState("idle");
    setStatusText(t("statusTuning"));
    setAiReasoning("");
    failedCountRef.current = 0;
    activeStationUrlRef.current = null;

    const processed = isQuickTag ? null : processTextInput(userActivity);
    let initialTag = isQuickTag
      ? (tagOverride ?? "lofi").toLowerCase().trim()
      : (processed?.tag ?? "lofi");
    let useRandomOrder = isQuickTag ? true : (processed?.useRandomOrder ?? false);
    let selectedGenre = isQuickTag ? initialTag : (processed?.genre ?? initialTag);

    const isFallback =
      !isQuickTag &&
      (processed?.category === "FALLBACK" || selectedGenre === "lofi");

    if (isFallback && userActivity.trim().length > 3) {
      setStatusDetail(t("aiAnalyzing"));
      console.log("DEBUG: Calling AI with text:", userActivity);
      try {
        const response = await fetch("/api/dj", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: userActivity,
            lang: lang === "RU" ? "ru" : "en",
          }),
        });
        if (response.ok) {
          const data = await response.json();
          if (data?.genre && data.genre !== "random") {
            selectedGenre = String(data.genre).toLowerCase().trim();
            initialTag = selectedGenre;
            useRandomOrder = true;
          }
          if (data?.reasoning) {
            setAiReasoning(String(data.reasoning));
          }
        }
      } catch (error) {
        console.error("AI request failed, staying with lofi:", error);
      } finally {
        // no-op
      }
    }

    setStationTag(selectedGenre.toUpperCase());
    setActiveTag(initialTag);

    if (isQuickTag) {
      setStatusDetail(format("statusSearchingFor", { tag: initialTag }));
    } else {
      setStatusDetail(
        format("vibeDetail", {
          genre: selectedGenre.toUpperCase(),
        })
      );
    }

    try {
      let resolvedTag = initialTag;
      let stationList: Station[] = [];
      let secureIndex = -1;

      for (let attempt = 0; attempt < 3 && secureIndex === -1; attempt += 1) {
        const result = await fetchStations(resolvedTag, useRandomOrder);
        if (sessionId !== sessionRef.current) return;
        stationList = result.stations;
        if (!isQuickTag) {
          resolvedTag = result.tag;
        }
        setStationTag(selectedGenre.toUpperCase());
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

  const handlePlayFavorite = async (favorite: FavoriteStation) => {
    const sessionId = sessionRef.current + 1;
    sessionRef.current = sessionId;
    const station = favoriteToStation(favorite);
    const tagLabel = station.tags[0] ?? "favorite";

    setStationTag(tagLabel.toUpperCase());
    setActiveTag(tagLabel.toLowerCase());
    setScreen("loading");
    setIsConnecting(true);
    setConnectionProgress(0);
    setStations([station]);
    stationsRef.current = [station];
    setStationIndex(0);
    setStationName("");
    setTrackTitle(null);
    setPlaybackState("idle");
    setStatusText(t("statusTuning"));
    setStatusDetail(format("statusSearchingFor", { tag: tagLabel }));
    failedCountRef.current = 0;
    activeStationUrlRef.current = null;

    try {
      await startStationPlayback(0);
      if (sessionId === sessionRef.current) {
        setScreen("playing");
      }
    } finally {
      if (sessionId === sessionRef.current) {
        setIsConnecting(false);
        setConnectionProgress(100);
      }
    }
  };

  const currentStation = stations[stationIndex] ?? stationsRef.current[stationIndexRef.current];
  const isFavorite = currentStation
    ? favorites.some((item) => item.changeuuid === currentStation.id)
    : false;

  const handleToggleFavorite = () => {
    if (!currentStation) return;
    const entry: FavoriteStation = {
      changeuuid: currentStation.id,
      name: currentStation.name,
      url_resolved: currentStation.urlResolved,
      tags: currentStation.tags ?? [],
      favicon: currentStation.favicon,
    };
    setFavorites((prev) => {
      const exists = prev.some((item) => item.changeuuid === entry.changeuuid);
      const next = exists
        ? prev.filter((item) => item.changeuuid !== entry.changeuuid)
        : [entry, ...prev];
      writeFavorites(next);
      return next;
    });
  };

  const handleStop = () => {
    sessionRef.current += 1;
    if (volumeFadeRef.current) {
      cancelAnimationFrame(volumeFadeRef.current);
      volumeFadeRef.current = null;
    }
    if (streamTimeoutRef.current) {
      window.clearTimeout(streamTimeoutRef.current);
      streamTimeoutRef.current = null;
    }
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
    setAiReasoning("");
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
      if (volumeFadeRef.current) {
        cancelAnimationFrame(volumeFadeRef.current);
        volumeFadeRef.current = null;
      }
      audioRef.current.volume = volume;
      await audioRef.current.play();
      setPlaybackState("playing");
    } catch {
      setPlaybackState("blocked");
    }
  };

  const handleVolumeChange = (nextVolume: number) => {
    const clamped = Math.min(1, Math.max(0, nextVolume));
    setVolume(clamped);
    if (clamped > 0) {
      lastAudibleVolumeRef.current = clamped;
    }
  };

  const handleToggleMute = () => {
    if (volume > 0) {
      lastAudibleVolumeRef.current = volume;
      setVolume(0);
      return;
    }
    const restored =
      lastAudibleVolumeRef.current > 0 ? lastAudibleVolumeRef.current : 0.7;
    setVolume(Math.min(1, Math.max(0, restored)));
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
        statusLine={statusDetail}
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
        aiReasoning={aiReasoning}
        labels={{
          nowPlaying: t("nowPlaying"),
          genre: t("genre"),
          liveStream: t("liveStream"),
          stop: t("stopButton"),
          trackFallback: t("trackFallback"),
          copied: t("copied"),
          addFavorite: t("addFavorite"),
          removeFavorite: t("removeFavorite"),
          favoriteAdded: t("favoriteAdded"),
        }}
        lang={lang}
        onSetLang={setLangValue}
        audioLevelRef={audioLevelRef}
        accentColor={resolveAccentColor(activeTag)}
        isFavorite={isFavorite}
        onToggleFavorite={handleToggleFavorite}
        volume={volume}
        isMuted={isMuted}
        onVolumeChange={handleVolumeChange}
        onToggleMute={handleToggleMute}
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
        favoritesTitle: t("favoritesTitle"),
        removeFavorite: t("removeFavorite"),
      }}
      lang={lang}
      onSetLang={setLangValue}
      favorites={favorites}
      onPlayFavorite={handlePlayFavorite}
      onRemoveFavorite={(id) => {
        setFavorites((prev) => {
          const next = prev.filter((item) => item.changeuuid !== id);
          writeFavorites(next);
          return next;
        });
      }}
    />
  );
}
