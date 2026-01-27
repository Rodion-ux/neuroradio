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
  statusAiValidating: {
    RU: "НЕЙРОСЕТЬ ПРОВЕРЯЕТ ЭФИР...",
    EN: "AI VALIDATING AIRWAVES...",
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
  instantConnection: {
    RU: "МГНОВЕННОЕ ПОДКЛЮЧЕНИЕ",
    EN: "INSTANT CONNECTION",
  },
  searching: {
    RU: "ПОИСК...",
    EN: "SEARCHING...",
  },
  unknownStation: {
    RU: "НЕИЗВЕСТНАЯ СТАНЦИЯ",
    EN: "UNKNOWN STATION",
  },
  stationAddedToCollection: {
    RU: "СТАНЦИЯ ДОБАВЛЕНА В ВАШУ КОЛЛЕКЦИЮ",
    EN: "STATION ADDED TO YOUR COLLECTION",
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
  const isSwitchingRef = useRef(false);
  const stalledTimeoutRef = useRef<number | null>(null);
  const preloadedStationsRef = useRef<Station[]>([]);
  const preloadInProgressRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isLoadingRef = useRef(false);
  const audioEventHandlersRef = useRef<{
    handlePlay?: () => void;
    handlePause?: () => void;
    handleError?: () => void;
    handleStalled?: () => void;
    handlePlaying?: () => void;
    handleCanplay?: () => void;
    handleLoadstart?: () => void;
  }>({});

  const isMuted = volume === 0;

  // Функции для работы с кэшем станций в localStorage
  const CACHE_KEY_PREFIX = "neuro_radio_cache_";
  const MAX_CACHED_STATIONS = 5; // Максимум 5 станций на жанр

  const getCachedStations = (genre: string): Station[] => {
    try {
      const key = `${CACHE_KEY_PREFIX}${genre.toLowerCase()}`;
      const cached = localStorage.getItem(key);
      if (!cached) return [];
      const stations = JSON.parse(cached) as Station[];
      return Array.isArray(stations) ? stations : [];
    } catch (error) {
      console.warn("Failed to read cached stations:", error);
      return [];
    }
  };

  const saveStationToCache = (station: Station, genre: string) => {
    try {
      const key = `${CACHE_KEY_PREFIX}${genre.toLowerCase()}`;
      const cached = getCachedStations(genre);
      
      // Удаляем станцию, если она уже есть в кэше (чтобы переместить её в начало)
      const filtered = cached.filter(s => s.urlResolved !== station.urlResolved);
      
      // Добавляем новую станцию в начало
      const updated = [station, ...filtered].slice(0, MAX_CACHED_STATIONS);
      
      localStorage.setItem(key, JSON.stringify(updated));
      console.log(`Cached station "${station.name}" for genre "${genre}"`);
    } catch (error) {
      console.warn("Failed to save station to cache:", error);
    }
  };

  const removeStationFromCache = (url: string, genre: string) => {
    try {
      const key = `${CACHE_KEY_PREFIX}${genre.toLowerCase()}`;
      const cached = getCachedStations(genre);
      const filtered = cached.filter(s => s.urlResolved !== url);
      localStorage.setItem(key, JSON.stringify(filtered));
      console.log(`Removed station from cache for genre "${genre}"`);
    } catch (error) {
      console.warn("Failed to remove station from cache:", error);
    }
  };

  // Функции для работы с verifiedStations (проверенные станции, проигранные >40 сек)
  const VERIFIED_STATIONS_KEY = "neuro_radio_verified_stations";
  const playedInSessionRef = useRef<Set<string>>(new Set()); // URL станций, проигранных в текущей сессии

  const getVerifiedStations = (genre: string): Station[] => {
    try {
      const cached = localStorage.getItem(VERIFIED_STATIONS_KEY);
      if (!cached) return [];
      const allVerified = JSON.parse(cached) as Record<string, Station[]>;
      const genreKey = genre.toLowerCase();
      return Array.isArray(allVerified[genreKey]) ? allVerified[genreKey] : [];
    } catch (error) {
      console.warn("Failed to read verified stations:", error);
      return [];
    }
  };

  const saveVerifiedStation = (
    station: Station,
    genre: string,
    options?: { showFeedback?: boolean }
  ) => {
    try {
      const showFeedback = options?.showFeedback !== false;
      const cached = localStorage.getItem(VERIFIED_STATIONS_KEY);
      const allVerified: Record<string, Station[]> = cached ? JSON.parse(cached) : {};
      const genreKey = genre.toLowerCase();
      
      if (!Array.isArray(allVerified[genreKey])) {
        allVerified[genreKey] = [];
      }
      
      // Удаляем дубликаты по URL
      const filtered = allVerified[genreKey].filter(s => s.urlResolved !== station.urlResolved);
      
      // Добавляем новую станцию в начало
      allVerified[genreKey] = [station, ...filtered];
      
      localStorage.setItem(VERIFIED_STATIONS_KEY, JSON.stringify(allVerified));
      console.log(`Verified station "${station.name}" saved for genre "${genre}"`);
      if (showFeedback) {
        // Показываем визуальный фидбек
        setStatusText(t("stationAddedToCollection"));
        // Очищаем сообщение через 3 секунды
        setTimeout(() => {
          setStatusText((prev) => {
            // Очищаем только если это все еще наше сообщение
            if (prev === t("stationAddedToCollection")) {
              return undefined;
            }
            return prev;
          });
        }, 3000);
      }
    } catch (error) {
      console.warn("Failed to save verified station:", error);
    }
  };

  const removeVerifiedStation = (url: string, genre: string) => {
    try {
      const cached = localStorage.getItem(VERIFIED_STATIONS_KEY);
      if (!cached) return;
      const allVerified = JSON.parse(cached) as Record<string, Station[]>;
      const genreKey = genre.toLowerCase();
      
      if (Array.isArray(allVerified[genreKey])) {
        allVerified[genreKey] = allVerified[genreKey].filter(s => s.urlResolved !== url);
        localStorage.setItem(VERIFIED_STATIONS_KEY, JSON.stringify(allVerified));
        console.log(`Removed verified station for genre "${genre}"`);
      }
    } catch (error) {
      console.warn("Failed to remove verified station:", error);
    }
  };

  const getUnplayedVerifiedStations = (genre: string): Station[] => {
    const verified = getVerifiedStations(genre);
    // Фильтруем станции, которые еще не были проиграны в текущей сессии
    return verified.filter(s => !playedInSessionRef.current.has(s.urlResolved));
  };

  // Функции для работы с черным списком станций
  const BLACKLIST_KEY = "neuro_radio_blacklist";
  const stationPlayStartTimeRef = useRef<number | null>(null); // Время начала воспроизведения текущей станции
  const blacklistAdditionsRef = useRef<Array<{ name: string; tags: string[]; genre: string }>>([]); // Для AI-анализа

  const getBlacklist = (): Set<string> => {
    try {
      const cached = localStorage.getItem(BLACKLIST_KEY);
      if (!cached) return new Set();
      const ids = JSON.parse(cached) as string[];
      return new Set(Array.isArray(ids) ? ids : []);
    } catch (error) {
      console.warn("Failed to read blacklist:", error);
      return new Set();
    }
  };

  const addToBlacklist = (station: Station, genre: string) => {
    try {
      const blacklist = getBlacklist();
      if (station.id && !blacklist.has(station.id)) {
        blacklist.add(station.id);
        localStorage.setItem(BLACKLIST_KEY, JSON.stringify(Array.from(blacklist)));
        console.log(`Station "${station.name}" added to blacklist`);
        
        // Сохраняем данные для AI-анализа (раз в 10 добавлений)
        blacklistAdditionsRef.current.push({
          name: station.name,
          tags: station.tags || [],
          genre: genre,
        });
        
        // Если накопилось 10 добавлений, отправляем на AI-анализ
        if (blacklistAdditionsRef.current.length >= 10) {
          void analyzeBlacklistWithAI(blacklistAdditionsRef.current, genre);
          blacklistAdditionsRef.current = []; // Очищаем после отправки
        }
      }
    } catch (error) {
      console.warn("Failed to add station to blacklist:", error);
    }
  };

  const filterBlacklistedStations = (stations: Station[]): Station[] => {
    const blacklist = getBlacklist();
    return stations.filter(s => !blacklist.has(s.id));
  };

  // AI-анализ черного списка через OpenAI
  const analyzeBlacklistWithAI = async (blacklistedStations: Array<{ name: string; tags: string[]; genre: string }>, genre: string) => {
    try {
      const response = await fetch("/api/analyze-blacklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stations: blacklistedStations,
          genre: genre,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.stopWords && Array.isArray(data.stopWords)) {
          console.log(`AI suggested stop words for genre "${genre}":`, data.stopWords);
          // Сохраняем стоп-слова для использования в будущих запросах
          // Это можно использовать для обновления TAG_MAPPINGS на бэкенде
        }
      }
    } catch (error) {
      console.warn("Failed to analyze blacklist with AI:", error);
    }
  };

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

  // Таймер для сохранения станции в verifiedStations после 40 секунд воспроизведения
  const verificationTimerRef = useRef<number | null>(null);
  const currentStationUrlRef = useRef<string | null>(null);
  
  useEffect(() => {
    // Очищаем предыдущий таймер при смене станции или остановке
    if (verificationTimerRef.current) {
      window.clearTimeout(verificationTimerRef.current);
      verificationTimerRef.current = null;
    }
    
    // Запускаем таймер только если станция играет
    if (playbackState === "playing" && activeStationUrlRef.current && activeTagRef.current) {
      const currentStation = stationsRef.current[stationIndexRef.current];
      
      if (currentStation && currentStation.urlResolved === activeStationUrlRef.current) {
        // Сохраняем URL текущей станции для проверки в таймере
        currentStationUrlRef.current = currentStation.urlResolved;
        
        // Запускаем таймер на 40 секунд
        verificationTimerRef.current = window.setTimeout(() => {
          // Проверяем, что станция все еще играет и это та же станция
          if (
            playbackState === "playing" &&
            activeStationUrlRef.current === currentStationUrlRef.current &&
            activeTagRef.current
          ) {
            // Сохраняем станцию в verifiedStations
            saveVerifiedStation(currentStation, activeTagRef.current);
          }
          verificationTimerRef.current = null;
        }, 40000); // 40 секунд
      } else {
        currentStationUrlRef.current = null;
      }
    } else {
      currentStationUrlRef.current = null;
    }
    
    return () => {
      if (verificationTimerRef.current) {
        window.clearTimeout(verificationTimerRef.current);
        verificationTimerRef.current = null;
      }
    };
  }, [playbackState, stationIndex, activeTag, stations]);

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
    // НЕ блокируем если уже идет переключение - это нормально при автоматическом skip
    // Блокируем только если это повторный вызов для той же ошибки
    if (isSwitchingRef.current && failedCountRef.current > 0) {
      return;
    }
    
    // Защита от бесконечного цикла: если слишком много ошибок подряд, останавливаемся
    if (failedCountRef.current >= 10) {
      console.error("Too many consecutive errors, stopping recovery attempts");
      setStatusText(t("statusNoStations"));
      setPlaybackState("blocked");
      isSwitchingRef.current = false;
      return;
    }
    
    isSwitchingRef.current = true;
    failedCountRef.current += 1;
    
    // АВТО-БАН: Добавляем нерабочую станцию в черный список
    const currentStation = stationsRef.current[stationIndexRef.current];
    if (currentStation && activeTagRef.current) {
      addToBlacklist(currentStation, activeTagRef.current);
      removeStationFromCache(currentStation.urlResolved, activeTagRef.current);
      removeVerifiedStation(currentStation.urlResolved, activeTagRef.current);
    }
    
    // Clear all timeouts
    if (stalledTimeoutRef.current) {
      window.clearTimeout(stalledTimeoutRef.current);
      stalledTimeoutRef.current = null;
    }
    
    if (audioRef.current) {
      // НЕ очищаем src сразу - даем браузеру время обработать ошибку
      // Очистка произойдет при создании нового элемента в startStationPlayback
      audioRef.current.pause();
      // Не очищаем src здесь, чтобы не мешать обработке ошибок
    }
    
    if (reason === "stream timeout") {
      setStatusText(t("statusStationUnstable"));
      setStatusDetail(undefined); // Не показываем технические детали пользователю
    } else {
      setStatusText(t("statusSignalLost"));
      setStatusDetail(undefined); // Не показываем технические детали пользователю
    }

    try {
      // Always fetch new stations when current one fails
      // This guarantees a fresh random station on each error
      const { stations: refreshed } = await fetchStations(
        activeTagRef.current ?? "lofi",
        true,
        { showStatus: true }
      );
      
      if (!refreshed.length) {
        // If fetch failed, try fallback to next in existing list
        const list = stationsRef.current;
        if (list.length > 0 && failedCountRef.current < list.length * 2) {
          const nextIndex = (stationIndexRef.current + 1) % list.length;
          await startStationPlayback(nextIndex);
          isSwitchingRef.current = false;
          return;
        }
        setStatusText(t("statusNoStations"));
        setPlaybackState("blocked");
        isSwitchingRef.current = false;
        return;
      }
      
      // Update stations list and play random new station
      setStations(refreshed);
      stationsRef.current = refreshed;
      failedCountRef.current = 0; // Сбрасываем счетчик при успешном переключении
      const randomIndex = Math.floor(Math.random() * refreshed.length);
      await startStationPlayback(randomIndex);
    } catch (error) {
      // Игнорируем ошибки отмены запроса
      if (error instanceof Error && error.name === 'AbortError') {
        console.log("Request was aborted during stream error recovery");
        isSwitchingRef.current = false;
        return;
      }
      console.error("Failed to fetch new stations on error:", error);
      // Fallback to next in existing list if fetch fails
      const list = stationsRef.current;
      if (list.length > 0 && failedCountRef.current < list.length * 2) {
        const nextIndex = (stationIndexRef.current + 1) % list.length;
        await startStationPlayback(nextIndex);
      } else {
        setStatusText(t("statusNoStations"));
        setPlaybackState("blocked");
      }
    } finally {
      isSwitchingRef.current = false;
    }
  };

  const setupAudio = (audio: HTMLAudioElement) => {
    // Если уже настроено для этого аудио элемента, нужно перерегистрировать обработчики
    // createMediaElementSource можно вызвать только один раз для каждого элемента
    if (audioReadyRef.current) {
      // Удаляем старые обработчики перед регистрацией новых
      const oldHandlers = audioEventHandlersRef.current;
      if (oldHandlers.handlePlay) {
        audio.removeEventListener("play", oldHandlers.handlePlay);
      }
      if (oldHandlers.handlePause) {
        audio.removeEventListener("pause", oldHandlers.handlePause);
      }
      if (oldHandlers.handleError) {
        audio.removeEventListener("error", oldHandlers.handleError);
      }
      if (oldHandlers.handleStalled) {
        audio.removeEventListener("stalled", oldHandlers.handleStalled);
      }
      
      // Продолжаем регистрацию новых обработчиков ниже
    } else {
      audioReadyRef.current = true;
    }

    try {
      // Закрываем старый AudioContext если он существует и закрыт
      if (audioContextRef.current && audioContextRef.current.state === "closed") {
        audioContextRef.current = null;
        analyserRef.current = null;
        sourceRef.current = null;
      }
      
      // Создаем новый AudioContext если его нет
      if (!audioContextRef.current) {
        const context = new AudioContext();
        const analyser = context.createAnalyser();
        analyser.fftSize = 128;
        analyser.smoothingTimeConstant = 0.85;
        
        // createMediaElementSource можно вызвать только один раз для каждого audio элемента
        // Если source уже существует для этого элемента, это вызовет ошибку
        const source = context.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(context.destination);
        
        audioContextRef.current = context;
        analyserRef.current = analyser;
        sourceRef.current = source;
      }
    } catch (error) {
      console.warn("AudioContext init failed:", error);
      // Если ошибка из-за того, что source уже создан для этого элемента,
      // просто используем существующий контекст
      if (!audioContextRef.current) {
        try {
          audioContextRef.current = new AudioContext();
        } catch (e) {
          console.warn("Failed to create AudioContext:", e);
        }
      }
    }

    const handlePlay = () => {
      setPlaybackState("playing");
      setStatusText(undefined);
      setStatusDetail(undefined);
      // Clear any stalled timeout when playback resumes
      if (stalledTimeoutRef.current) {
        window.clearTimeout(stalledTimeoutRef.current);
        stalledTimeoutRef.current = null;
      }
      if (audioContextRef.current?.state === "suspended") {
        void audioContextRef.current.resume();
      }
    };

    // Обработчик playing будет определен в startStationPlayback, где есть доступ к clearTimeouts
    const handlePause = () => setPlaybackState("paused");
    const handleError = () => {
      // Only switch on actual errors
      // error.code: 0 = no error, 1 = aborted, 2 = network, 3 = decode, 4 = not supported
      if (audio.error && audio.error.code > 1) {
        console.warn("Audio error event fired:", audio.error.code, audio.error.message);
        console.log("Audio state at error:", {
          networkState: audio.networkState,
          readyState: audio.readyState,
          src: audio.src,
        });
        
        // АВТО-БАН: Добавляем станцию в черный список при ошибке
        const currentStation = stationsRef.current[stationIndexRef.current];
        if (currentStation && activeTagRef.current) {
          addToBlacklist(currentStation, activeTagRef.current);
          removeVerifiedStation(currentStation.urlResolved, activeTagRef.current);
        }
        
        // Расширенная проверка на "no supported source" с учетом NotSupportedError
        const errorMessage = (audio.error.message || "").toLowerCase();
        const isNoSupportedSource = 
          audio.error.code === 4 || // MEDIA_ERR_SRC_NOT_SUPPORTED
          errorMessage.includes("no supported source") ||
          errorMessage.includes("failed to load") ||
          errorMessage.includes("notsupportederror") ||
          errorMessage.includes("notsupported") ||
          (audio.networkState === 3 && audio.readyState === 0); // networkState === 3 и readyState === 0
        
        if (isNoSupportedSource) {
          console.log("No supported source detected in error handler (code: " + audio.error.code + "), automatically switching to next station");
          // Автоматически переключаемся на следующую станцию через handleNextStation
          // без участия пользователя
          void handleNextStation();
        } else {
          // Для других ошибок также автоматически переключаемся
          console.log("Audio error detected (code: " + audio.error.code + "), automatically switching to next station");
          void handleNextStation();
        }
      } else if (audio.networkState === 3) {
        // Если нет ошибки в audio.error, но networkState === 3, это тоже проблема
        console.log("networkState === 3 detected in error handler without audio.error");
        // АВТО-БАН: Добавляем станцию в черный список
        const currentStation = stationsRef.current[stationIndexRef.current];
        if (currentStation && activeTagRef.current) {
          addToBlacklist(currentStation, activeTagRef.current);
          removeVerifiedStation(currentStation.urlResolved, activeTagRef.current);
        }
        // Дополнительная проверка readyState
        if (audio.readyState === 0) {
          console.log("networkState === 3 and readyState === 0 confirmed, switching station");
          void handleNextStation();
        } else {
          // Даем немного времени, возможно это временное состояние
          setTimeout(() => {
            if (audio.networkState === 3 && audio.readyState === 0) {
              console.log("networkState === 3 persists after delay, switching station");
              void handleNextStation();
            }
          }, 500);
        }
      }
    };

    // Handle stalled event more intelligently
    // Radio streams can stall temporarily during buffering, so wait before switching
    const handleStalled = () => {
      // Clear any existing stalled timeout
      if (stalledTimeoutRef.current) {
        window.clearTimeout(stalledTimeoutRef.current);
      }
      
      // Wait 10 seconds before considering it a real problem
      // If playback resumes before timeout, it will be cleared in handlePlay
      stalledTimeoutRef.current = window.setTimeout(() => {
        // Check if audio is still stalled and not playing
        if (audio.readyState < 2 && audio.paused) {
          console.warn("Stream stalled for too long, switching station");
          void handleStreamError("audio stalled");
        }
        stalledTimeoutRef.current = null;
      }, 10000);
    };

    // Сохраняем обработчики для последующего удаления
    audioEventHandlersRef.current = {
      handlePlay,
      handlePause,
      handleError,
      handleStalled,
    };

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("error", handleError);
    audio.addEventListener("stalled", handleStalled);
    // Don't listen to "ended" - radio streams are infinite and shouldn't end
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
    
    // Добавляем станцию в список проигранных в текущей сессии
    playedInSessionRef.current.add(station.urlResolved);
    
    // Запоминаем время начала воспроизведения для отслеживания быстрого переключения
    stationPlayStartTimeRef.current = Date.now();

    // ПРИНУДИТЕЛЬНАЯ ОЧИСТКА: Очищаем старый audio элемент ПЕРЕД установкой нового URL
    if (audioRef.current) {
      // Удаляем все обработчики со старого элемента
      const oldHandlers = audioEventHandlersRef.current;
      if (oldHandlers.handlePlay) {
        audioRef.current.removeEventListener("play", oldHandlers.handlePlay);
      }
      if (oldHandlers.handlePause) {
        audioRef.current.removeEventListener("pause", oldHandlers.handlePause);
      }
      if (oldHandlers.handleError) {
        audioRef.current.removeEventListener("error", oldHandlers.handleError);
      }
      if (oldHandlers.handleStalled) {
        audioRef.current.removeEventListener("stalled", oldHandlers.handleStalled);
      }
      if (oldHandlers.handlePlaying) {
        audioRef.current.removeEventListener("playing", oldHandlers.handlePlaying);
      }
      if (oldHandlers.handleCanplay) {
        audioRef.current.removeEventListener("canplay", oldHandlers.handleCanplay);
      }
      if (oldHandlers.handleLoadstart) {
        audioRef.current.removeEventListener("loadstart", oldHandlers.handleLoadstart);
      }
      
      // ПРИНУДИТЕЛЬНАЯ ОЧИСТКА СТЕЙТА: Останавливаем, очищаем src и загружаем ПЕРЕД новым URL
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current.load();
      
      // Отключаем старый source от AudioContext если он существует
      if (sourceRef.current) {
        try {
          sourceRef.current.disconnect();
        } catch (e) {
          // Игнорируем ошибки отключения
        }
        sourceRef.current = null;
      }
    }
    
    // Всегда создаем новый audio элемент для каждой станции
    // Это гарантирует, что обработчики регистрируются корректно
    const audio = new Audio();
    audioRef.current = audio;
    audioReadyRef.current = false; // Сбрасываем флаг для нового элемента
    
    // Clear any stalled timeout from previous station
    if (stalledTimeoutRef.current) {
      window.clearTimeout(stalledTimeoutRef.current);
      stalledTimeoutRef.current = null;
    }
    
    // Small delay to ensure cleanup
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Настраиваем аудио только если это новый элемент или еще не настроено
    setupAudio(audio);
    
    // Устанавливаем источник ПОСЛЕ полной очистки и настройки
    audio.src = station.urlResolved;
    audio.loop = false;
    audio.volume = 0;
    audio.preload = "auto"; // Изменено с "none" на "auto" для лучшей совместимости
    audio.crossOrigin = "anonymous";
    
    // Немедленная проверка после установки src: если сразу возникает ошибка или networkState === 3
    // даем браузеру немного времени (100ms) для инициализации, затем проверяем
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Ранняя проверка на ошибку "no supported source"
    if (audio.error && audio.error.code > 1) {
      const errorMessage = (audio.error.message || "").toLowerCase();
      const isNoSupportedSource = 
        audio.error.code === 4 || 
        errorMessage.includes("no supported source") ||
        errorMessage.includes("failed to load") ||
        errorMessage.includes("notsupportederror");
      if (isNoSupportedSource) {
        console.log("Early detection: No supported source immediately after setting src");
        void handleStreamError("no supported source");
        return;
      }
    }
    
    // Ранняя проверка networkState === 3 (NO_SOURCE) с более агрессивной проверкой
    if (audio.networkState === 3) {
      // Даем еще немного времени, так как networkState может быть временным
      await new Promise(resolve => setTimeout(resolve, 200));
      if (audio.networkState === 3) {
        // Дополнительная проверка: если readyState также 0, это точно проблема
        if (audio.readyState === 0) {
          console.log("Early detection: networkState === 3 and readyState === 0 (NO_SOURCE confirmed)");
          void handleStreamError("no supported source");
          return;
        }
        // Если networkState === 3 сохраняется, но readyState > 0, даем еще немного времени
        await new Promise(resolve => setTimeout(resolve, 300));
        if (audio.networkState === 3) {
          console.log("Early detection: networkState === 3 (NO_SOURCE) persists after delay");
          void handleStreamError("no supported source");
          return;
        }
      }
    }
    
    let hasPlaybackSignal = false;
    let timeoutCleared = false;
    
    // ТАЙМАУТ ПОДКЛЮЧЕНИЯ: 3 секунды на ожидание ответа от потока
    const timeoutId = window.setTimeout(() => {
      if (!hasPlaybackSignal && !timeoutCleared) {
        // АВТО-БАН: Если станция не начала играть за 3 секунды, баним её
        const currentStation = stationsRef.current[stationIndexRef.current];
        if (currentStation && activeTagRef.current) {
          addToBlacklist(currentStation, activeTagRef.current);
        }
        setStatusText(t("statusStationUnstable"));
        setStatusDetail(undefined);
        streamTimeoutRef.current = null;
        void handleStreamError("stream timeout");
      }
    }, 3000); // Таймаут подключения: 3 секунды
    
    streamTimeoutRef.current = timeoutId;
    
    const clearTimeouts = () => {
      hasPlaybackSignal = true;
      if (!timeoutCleared) {
        timeoutCleared = true;
        window.clearTimeout(timeoutId);
        streamTimeoutRef.current = null;
      }
    };
    
    const handleCanplay = clearTimeouts;
    
    // Обработчик playing для кэширования и очистки таймаутов
    const handlePlayingForCache = () => {
      const currentStation = stationsRef.current[stationIndexRef.current];
      if (currentStation && activeTagRef.current) {
        saveStationToCache(currentStation, activeTagRef.current);
      }
      clearTimeouts();
    };
    const handleLoadstart = () => {
      setStatusText(t("statusTuning"));
    };
    
    const handleLoadedMetadata = () => {
      // Metadata loaded
    };
    
    const handleCanPlayThrough = () => {
      // Can play through
    };
    
    // Сохраняем обработчики для последующего удаления
    audioEventHandlersRef.current.handlePlaying = handlePlayingForCache;
    audioEventHandlersRef.current.handleCanplay = handleCanplay;
    audioEventHandlersRef.current.handleLoadstart = handleLoadstart;
    
    audio.addEventListener("playing", handlePlayingForCache, { once: true });
    audio.addEventListener("canplay", handleCanplay, { once: true });
    audio.addEventListener("loadstart", handleLoadstart, { once: true });
    audio.addEventListener("loadedmetadata", handleLoadedMetadata, { once: true });
    audio.addEventListener("canplaythrough", handleCanPlayThrough, { once: true });

    console.log("Попытка воспроизведения URL:", station.urlResolved);
    console.log("Audio element state:", {
      paused: audio.paused,
      readyState: audio.readyState,
      src: audio.src,
      error: audio.error?.code,
    });
    console.log("AudioContext state:", audioContextRef.current?.state);

    // Ждем, пока браузер начнет загрузку потока перед попыткой play()
    // Это дает браузеру время определить формат потока
    // networkState может быть 3 сразу после установки src, но затем меняется на 2
    let loadStarted = false;
    let finalNetworkState = audio.networkState;
    const loadStartPromise = new Promise<void>((resolve) => {
      const checkLoadStart = () => {
        finalNetworkState = audio.networkState;
        // networkState: 0=EMPTY, 1=IDLE, 2=LOADING, 3=NO_SOURCE
        // Ждем пока начнется загрузка (networkState = 2) или произойдет ошибка
        // НЕ проверяем networkState === 3 сразу, так как он может быть временным
        if (audio.networkState === 2 || audio.error || loadStarted) {
          loadStarted = true;
          resolve();
        } else {
          setTimeout(checkLoadStart, 100);
        }
      };
      // ТАЙМАУТ ПОДКЛЮЧЕНИЯ: Даем максимум 3 секунды на начало загрузки
      setTimeout(() => {
        if (!loadStarted) {
          loadStarted = true;
          finalNetworkState = audio.networkState;
          resolve();
        }
      }, 3000);
      checkLoadStart();
    });
    
    await loadStartPromise;
    
    // Проверяем, не произошла ли ошибка во время ожидания
    if (audio.error && audio.error.code > 1) {
      if (!timeoutCleared) {
        timeoutCleared = true;
        window.clearTimeout(timeoutId);
        streamTimeoutRef.current = null;
      }
      const isNoSupportedSource = 
        audio.error.code === 4 || 
        (audio.error.message && audio.error.message.toLowerCase().includes("no supported source"));
      void handleStreamError(isNoSupportedSource ? "no supported source" : `audio error during load: ${audio.error.code} - ${audio.error.message}`);
      return;
    }
    
    // ТАЙМАУТ ПОДКЛЮЧЕНИЯ: Если после ожидания networkState все еще 3 (NO_SOURCE), это означает, что формат не поддерживается
    if (audio.networkState === 3 && finalNetworkState === 3) {
      if (!timeoutCleared) {
        timeoutCleared = true;
        window.clearTimeout(timeoutId);
        streamTimeoutRef.current = null;
      }
      // АВТО-БАН: Добавляем станцию в черный список
      const currentStation = stationsRef.current[stationIndexRef.current];
      if (currentStation && activeTagRef.current) {
        addToBlacklist(currentStation, activeTagRef.current);
      }
      void handleStreamError("no supported source");
      return;
    }

    // Дополнительная проверка: если есть ошибка или networkState === 3 перед play()
    if (audio.error && audio.error.code > 1) {
      if (!timeoutCleared) {
        timeoutCleared = true;
        window.clearTimeout(timeoutId);
        streamTimeoutRef.current = null;
      }
      // АВТО-БАН: Добавляем станцию в черный список
      const currentStation = stationsRef.current[stationIndexRef.current];
      if (currentStation && activeTagRef.current) {
        addToBlacklist(currentStation, activeTagRef.current);
      }
      const isNoSupportedSource = 
        audio.error.code === 4 || 
        (audio.error.message && audio.error.message.toLowerCase().includes("no supported source"));
      void handleStreamError(isNoSupportedSource ? "no supported source" : `audio error before play: ${audio.error.code}`);
      return;
    }

    // Еще одна проверка networkState перед play()
    if (audio.networkState === 3) {
      if (!timeoutCleared) {
        timeoutCleared = true;
        window.clearTimeout(timeoutId);
        streamTimeoutRef.current = null;
      }
      // АВТО-БАН: Добавляем станцию в черный список
      const currentStation = stationsRef.current[stationIndexRef.current];
      if (currentStation && activeTagRef.current) {
        addToBlacklist(currentStation, activeTagRef.current);
      }
      void handleStreamError("no supported source");
      return;
    }

    try {
      // Убеждаемся, что AudioContext активен
      if (audioContextRef.current?.state === "suspended") {
        await audioContextRef.current.resume();
      }
      
      await audio.play();
      console.log("Audio playback started successfully");
      failedCountRef.current = 0;
      if (hasPlaybackSignal) {
        setStatusText(undefined);
      }
      if (volume > 0) {
        fadeToVolume(volume);
      }
      
      // Периодическая проверка состояния аудио после play() для обнаружения ошибок
      // Это помогает поймать ошибки, которые возникают асинхронно
      const healthCheckInterval = window.setInterval(() => {
        // Проверяем состояние каждые 500ms в течение первых 3 секунд
        if (audio.error && audio.error.code > 1) {
          const isNoSupportedSource = 
            audio.error.code === 4 || 
            (audio.error.message && audio.error.message.toLowerCase().includes("no supported source")) ||
            (audio.error.message && audio.error.message.toLowerCase().includes("failed to load"));
          
          if (isNoSupportedSource) {
            console.log("Health check: No supported source detected after play(), switching station");
            window.clearInterval(healthCheckInterval);
            void handleNextStation();
          }
        } else if (audio.networkState === 3 && audio.readyState === 0) {
          // networkState === 3 и readyState === 0 означает, что источник не поддерживается
          console.log("Health check: networkState === 3 and readyState === 0, switching station");
          window.clearInterval(healthCheckInterval);
          void handleNextStation();
        }
      }, 500);
      
      // Останавливаем проверку через 3 секунды или когда начинается воспроизведение
      const stopHealthCheck = () => {
        window.clearInterval(healthCheckInterval);
        audio.removeEventListener("playing", stopHealthCheck);
        audio.removeEventListener("error", stopHealthCheck);
      };
      
      audio.addEventListener("playing", stopHealthCheck, { once: true });
      audio.addEventListener("error", stopHealthCheck, { once: true });
      
      // Автоматически останавливаем проверку через 3 секунды
      setTimeout(() => {
        window.clearInterval(healthCheckInterval);
        audio.removeEventListener("playing", stopHealthCheck);
        audio.removeEventListener("error", stopHealthCheck);
      }, 3000);
      
      // Start preloading next stations in background after successful playback
      void preloadNextStations();
    } catch (error) {
      // Специальная обработка AbortError: это нормальная ситуация,
      // когда мы быстро переключаем станцию и вызываем pause() до завершения play().
      const isAbortError =
        error instanceof Error &&
        (error.name === "AbortError" ||
          error.message.toLowerCase().includes("the play() request was interrupted"));

      if (isAbortError) {
        // Не считаем это ошибкой потока, просто выходим без логики skip/бана
        console.log("Audio play aborted due to quick pause/switch (AbortError)");
        return;
      }

      // Для остальных ошибок логируем в консоль в мягком режиме
      console.warn("Audio play failed:", error);
      console.log("Audio error details:", {
        error: audio.error?.code,
        message: audio.error?.message,
        paused: audio.paused,
        readyState: audio.readyState,
        networkState: audio.networkState,
        src: audio.src,
      });
      
      if (!timeoutCleared) {
        timeoutCleared = true;
        window.clearTimeout(timeoutId);
        streamTimeoutRef.current = null;
      }
      
      // Проверяем ошибку после play() - более агрессивная проверка
      const errorMessage = audio.error?.message?.toLowerCase() || "";
      const exceptionMessage = error instanceof Error ? error.message.toLowerCase() : "";
      const isNoSupportedSource = 
        audio.error?.code === 4 || 
        errorMessage.includes("no supported source") ||
        errorMessage.includes("failed to load") ||
        errorMessage.includes("notsupportederror") ||
        exceptionMessage.includes("no supported source") ||
        exceptionMessage.includes("failed to load") ||
        exceptionMessage.includes("notsupportederror") ||
        (audio.networkState === 3 && audio.readyState === 0);
      
      // АВТО-БАН: Добавляем станцию в черный список при любой ошибке после play()
      const currentStation = stationsRef.current[stationIndexRef.current];
      if (currentStation && activeTagRef.current) {
        addToBlacklist(currentStation, activeTagRef.current);
      }

      // Логика skip для \"нет поддерживаемого источника\" и других реальных ошибок
      if (audio.error && audio.error.code > 1) {
        if (isNoSupportedSource) {
          console.log("No supported source detected after play(), switching station");
          void handleNextStation(); // Используем handleNextStation для немедленного переключения
        } else {
          console.log("Audio error detected after play(), switching station");
          void handleNextStation();
        }
      } else if (isNoSupportedSource || (error instanceof Error && exceptionMessage.includes("no supported"))) {
        // Ошибка в исключении, но не в audio.error
        console.log("No supported source detected in exception, switching station");
        void handleNextStation();
      } else if (error) {
        // Для любых других ошибок также переключаемся автоматически
        console.log("Playback error detected, switching station");
        void handleNextStation();
      } else {
        setPlaybackState("blocked");
      }
    }
  };

  const fetchStations = async (
    tag: string,
    useRandomOrder = false,
    options?: { showStatus?: boolean; storeAiVerified?: boolean }
  ) => {
    // Отменяем предыдущий запрос, если он еще выполняется
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Создаем новый AbortController
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    const requestTag = tag.trim().toLowerCase();
    // Добавляем timestamp для обхода кеша браузера
    const cacheBuster = Date.now() + Math.random();
    
    if (options?.showStatus) {
      setStatusText(t("statusAiValidating"));
      setStatusDetail(undefined);
    }

    const useAi = options?.showStatus === true;

    let response: Response;

    if (useAi) {
      // AI-валидатор + выбор самой быстрой станции
      response = await fetch(
        `/api/generate?tag=${encodeURIComponent(requestTag)}&t=${cacheBuster}&random=${useRandomOrder ? "1" : "0"}`,
        {
          method: "GET",
          headers: {
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
          },
          cache: "no-store",
          signal: controller.signal,
        }
      );
    } else {
      // Быстрый путь без AI: используем уже существующую POST-логику
      response = await fetch(
        `/api/generate?tag=${encodeURIComponent(requestTag)}&t=${cacheBuster}`,
        {
          method: "POST",
          body: JSON.stringify({ tag: requestTag, useRandomOrder }),
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
            "Pragma": "no-cache",
          },
          cache: "no-store",
          signal: controller.signal,
        }
      );
    }

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.error ?? "Failed to fetch stations");
    }

    const data = await response.json();
    const stations = (data.stations as Station[]) ?? [];
    
    // ФИЛЬТРАЦИЯ: Исключаем станции из черного списка
    const filteredStations = filterBlacklistedStations(stations);
    
    if (filteredStations.length < stations.length) {
      console.log(`Filtered out ${stations.length - filteredStations.length} blacklisted stations`);
    }
    
    // Если после применения черного списка не осталось станций, но исходный
    // список не пустой — не считаем это фатальной ошибкой, а временно
    // ослабляем фильтрацию и используем оригинальный список, чтобы плеер
    // не ломался полностью.
    const effectiveStations =
      filteredStations.length > 0 ? filteredStations : stations;

    const shouldStoreAiVerified =
      options?.storeAiVerified ?? options?.showStatus ?? false;
    if (
      data.aiValidated === true &&
      filteredStations[0] &&
      shouldStoreAiVerified
    ) {
      // В "Золотой фонд" добавляем только те станции, которые прошли и AI-валидацию,
      // и не попали под черный список.
      saveVerifiedStation(filteredStations[0], (data.tag as string) ?? tag, {
        showFeedback: false,
      });
    }

    return {
      tag: (data.tag as string) ?? tag,
      stations: effectiveStations,
    };
  };

  const preloadNextStations = async () => {
    // Prevent multiple simultaneous preloads
    if (preloadInProgressRef.current) return;
    preloadInProgressRef.current = true;

    try {
      // Preload next stations in background
      const { stations: newStations } = await fetchStations(
        activeTagRef.current ?? "lofi",
        true // useRandomOrder = true
      );
      
      if (newStations.length > 0) {
        preloadedStationsRef.current = newStations;
        console.log(`Preloaded ${newStations.length} stations for next switch`);
      }
    } catch (error) {
      // Игнорируем ошибки отмены запроса (не критично для фонового процесса)
      if (error instanceof Error && error.name === 'AbortError') {
        console.log("Preload was aborted (non-critical)");
      } else {
        console.warn("Preload failed (non-critical):", error);
      }
      preloadedStationsRef.current = [];
    } finally {
      preloadInProgressRef.current = false;
    }
  };

  const handleStart = async (userActivity: string, tagOverride?: string) => {
    // Блокировка: если уже идет загрузка, не запускаем новую
    if (isLoadingRef.current || isConnecting) {
      console.log("Already loading, ignoring duplicate request");
      return;
    }
    
    // Отменяем предыдущий запрос при быстром переключении жанров через AbortController
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    isLoadingRef.current = true;
    const sessionId = sessionRef.current + 1;
    sessionRef.current = sessionId;
    const isQuickTag = Boolean(tagOverride);
    
    // Полный сброс аудио перед началом поиска
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current.load();
    }
    
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

    // Синхронно обновляем жанр ДО начала запроса, чтобы UI не отставал
    setStationTag(selectedGenre.toUpperCase());
    setActiveTag(initialTag);
    activeTagRef.current = initialTag;

    // ПРИОРИТЕТ 1: Проверяем "Золотой Фонд" (verifiedStations) перед запросом к API
    const unplayedVerified = getUnplayedVerifiedStations(initialTag);
    // Фильтруем verified станции через черный список
    const verifiedFiltered = filterBlacklistedStations(unplayedVerified);
    if (verifiedFiltered.length > 0) {
      console.log(`Found ${verifiedFiltered.length} unplayed verified stations in "Golden Fund" for genre "${initialTag}" (${unplayedVerified.length - verifiedFiltered.length} filtered by blacklist)`);
      
      // Выбираем случайную станцию из "Золотого Фонда"
      const randomVerified = verifiedFiltered[Math.floor(Math.random() * verifiedFiltered.length)];
      
      // Создаем временный список станций с verified станцией
      const tempStationList = [randomVerified];
      stationsRef.current = tempStationList;
      setStations(tempStationList);
      stationIndexRef.current = 0;
      setStationIndex(0);
      
      // Устанавливаем статус "МГНОВЕННОЕ ПОДКЛЮЧЕНИЕ"
      setStatusText(t("instantConnection"));
      setStatusDetail(undefined);
      
      // Немедленно запускаем воспроизведение из "Золотого Фонда"
      try {
        await startStationPlayback(0);
        setScreen("playing");
        setIsConnecting(false);
        isLoadingRef.current = false;
        
        // Запускаем фоновый запрос к API для обновления списка (не блокируем UI)
        void (async () => {
          try {
            const { stations: freshStations } = await fetchStations(initialTag, useRandomOrder);
            if (freshStations.length > 0 && sessionId === sessionRef.current) {
              // Обновляем список станций, но не прерываем текущее воспроизведение
              stationsRef.current = freshStations;
              setStations(freshStations);
              console.log(`Updated station list with ${freshStations.length} fresh stations from API`);
            }
          } catch (error) {
            // Игнорируем ошибки фонового запроса - у нас уже есть рабочая станция из "Золотого Фонда"
            console.warn("Background station fetch failed (non-critical):", error);
          }
        })();
        
        return; // Выходим, так как уже запустили станцию из "Золотого Фонда"
      } catch (error) {
        // Если verified станция не загрузилась, удаляем её и продолжаем стандартный поиск
        console.warn("Verified station from Golden Fund failed to load, removing from cache:", error);
        removeVerifiedStation(randomVerified.urlResolved, initialTag);
        // Продолжаем стандартный поиск ниже
      }
    }

    // ПРИОРИТЕТ 2: Проверяем обычный кэш перед запросом к API
    const cachedStations = getCachedStations(initialTag);
    // Фильтруем кэшированные станции через черный список
    const cachedFiltered = filterBlacklistedStations(cachedStations);
    if (cachedFiltered.length > 0) {
      console.log(`Found ${cachedFiltered.length} cached stations for genre "${initialTag}" (${cachedStations.length - cachedFiltered.length} filtered by blacklist)`);
      
      // Выбираем случайную станцию из отфильтрованного кэша
      const randomCachedStation = cachedFiltered[Math.floor(Math.random() * cachedFiltered.length)];
      
      // Создаем временный список станций с кэшированной станцией
      const tempStationList = [randomCachedStation];
      stationsRef.current = tempStationList;
      setStations(tempStationList);
      stationIndexRef.current = 0;
      setStationIndex(0);
      
      // Устанавливаем статус "МГНОВЕННОЕ ПОДКЛЮЧЕНИЕ"
      setStatusText(t("instantConnection"));
      setStatusDetail(undefined);
      
      // Немедленно запускаем воспроизведение из кэша
      try {
        await startStationPlayback(0);
        setScreen("playing");
        setIsConnecting(false);
        isLoadingRef.current = false;
        
        // Запускаем фоновый запрос к API для обновления списка (не блокируем UI)
        void (async () => {
          try {
            const { stations: freshStations } = await fetchStations(initialTag, useRandomOrder);
            if (freshStations.length > 0 && sessionId === sessionRef.current) {
              // Обновляем список станций, но не прерываем текущее воспроизведение
              stationsRef.current = freshStations;
              setStations(freshStations);
              console.log(`Updated station list with ${freshStations.length} fresh stations`);
            }
          } catch (error) {
            // Игнорируем ошибки фонового запроса - у нас уже есть рабочая станция из кэша
            console.warn("Background station fetch failed (non-critical):", error);
          }
        })();
        
        return; // Выходим, так как уже запустили станцию из кэша
      } catch (error) {
        // Если кэшированная станция не загрузилась, удаляем её из кэша и продолжаем стандартный поиск
        console.warn("Cached station failed to load, removing from cache:", error);
        removeStationFromCache(randomCachedStation.urlResolved, initialTag);
        // Продолжаем стандартный поиск ниже
      }
    }

    // Стандартный поиск через API (если кэш пуст или кэшированная станция не загрузилась)
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
        let result: { tag: string; stations: Station[] } | null = null;
        try {
          // Для быстрых жанров (кнопки) используем максимально быстрый путь без AI.
          // Для свободного текста и fallback-сценариев — включаем AI-валидатор.
          const useAiForThisSearch = !isQuickTag;
          result = await fetchStations(
            resolvedTag,
            useRandomOrder,
            useAiForThisSearch ? { showStatus: true } : undefined
          );
          if (sessionId !== sessionRef.current) return;
          stationList = result.stations;
        } catch (error) {
          // Игнорируем ошибки отмены запроса
          if (error instanceof Error && error.name === 'AbortError') {
            console.log("Request was aborted during search");
            return;
          }
          throw error;
        }
        
        if (!result) {
          throw new Error("Failed to fetch stations");
        }
        
        if (!isQuickTag) {
          resolvedTag = result.tag;
        }
        setStationTag(selectedGenre.toUpperCase());
        setActiveTag(resolvedTag);

        if (!stationList.length) {
          console.warn(
            `No stations found for tag "${resolvedTag}" on attempt ${attempt + 1}`
          );
          // Пробуем еще раз (до 3 попыток), не ломая сразу UX.
          continue;
        }

        // Все станции уже прошли фильтрацию на бэкенде (HTTPS, lastcheckok: 1, релевантность)
        // Просто выбираем случайную станцию из списка (уже перемешанного на бэкенде)
        secureIndex = Math.floor(Math.random() * stationList.length);
      }

      // Если после всех попыток так и не нашли ни одной станции — показываем
      // понятное сообщение об ошибке.
      if (secureIndex < 0 || !stationList.length) {
        throw new Error("No stations found");
      }

      setStations(stationList);
      stationsRef.current = stationList;
      
      // Мгновенный запуск станции через startStationPlayback
      // Проходит через все фильтры качества (HTTPS, lastcheckok, релевантность жанру)
      await startStationPlayback(secureIndex);
      
      if (sessionId === sessionRef.current) {
        if (isQuickTag) {
          setStatusDetail(t("statusSignalLocked"));
        }
        setScreen("playing");
        setIsConnecting(false);
        isLoadingRef.current = false;
      }
    } catch (error) {
      // Игнорируем ошибки отмены запроса
      if (error instanceof Error && error.name === 'AbortError') {
        console.log("Request was aborted");
        return;
      }
      console.error("Station fetch error:", error);
      setStatusText(
        error instanceof Error ? error.message : "Unable to find live stations"
      );
      setScreen("idle");
    } finally {
      if (sessionId === sessionRef.current) {
        setIsConnecting(false);
        setConnectionProgress(100);
        isLoadingRef.current = false;
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
    
    // Отменяем все активные запросы
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    if (volumeFadeRef.current) {
      cancelAnimationFrame(volumeFadeRef.current);
      volumeFadeRef.current = null;
    }
    if (streamTimeoutRef.current) {
      window.clearTimeout(streamTimeoutRef.current);
      streamTimeoutRef.current = null;
    }
    if (stalledTimeoutRef.current) {
      window.clearTimeout(stalledTimeoutRef.current);
      stalledTimeoutRef.current = null;
    }
    // Полная остановка и очистка аудио
    if (audioRef.current) {
      audioRef.current.pause();
      
      // Удаляем все обработчики событий
      const handlers = audioEventHandlersRef.current;
      if (handlers.handlePlay) {
        audioRef.current.removeEventListener("play", handlers.handlePlay);
      }
      if (handlers.handlePause) {
        audioRef.current.removeEventListener("pause", handlers.handlePause);
      }
      if (handlers.handleError) {
        audioRef.current.removeEventListener("error", handlers.handleError);
      }
      if (handlers.handleStalled) {
        audioRef.current.removeEventListener("stalled", handlers.handleStalled);
      }
      if (handlers.handlePlaying) {
        audioRef.current.removeEventListener("playing", handlers.handlePlaying);
      }
      if (handlers.handleCanplay) {
        audioRef.current.removeEventListener("canplay", handlers.handleCanplay);
      }
      if (handlers.handleLoadstart) {
        audioRef.current.removeEventListener("loadstart", handlers.handleLoadstart);
      }
      
      audioEventHandlersRef.current = {};
      
      audioRef.current.src = "";
      audioRef.current.load();
      
      // Отключаем все обработчики через on* свойства
      audioRef.current.onplay = null;
      audioRef.current.onpause = null;
      audioRef.current.onerror = null;
      audioRef.current.onstalled = null;
      audioRef.current.onplaying = null;
      audioRef.current.oncanplay = null;
      audioRef.current.onloadstart = null;
    }
    
    // Полностью закрываем AudioContext
    if (audioContextRef.current) {
      if (sourceRef.current) {
        try {
          sourceRef.current.disconnect();
        } catch (e) {
          // Игнорируем ошибки
        }
        sourceRef.current = null;
      }
      
      if (analyserRef.current) {
        try {
          analyserRef.current.disconnect();
        } catch (e) {
          // Игнорируем ошибки
        }
        analyserRef.current = null;
      }
      
      if (audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
      }
      audioContextRef.current = null;
    }
    
    // Сбрасываем флаг готовности
    audioReadyRef.current = false;
    
    // Clear preloaded stations when stopping
    preloadedStationsRef.current = [];
    preloadInProgressRef.current = false;
    isLoadingRef.current = false;
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
    if (isConnecting || isSwitchingRef.current || !audioRef.current) return;
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

  const handleNextStation = async () => {
    if (isConnecting || isSwitchingRef.current || isLoadingRef.current) return;
    
    // АВТО-БАН (UX): Если пользователь нажал Next в первые 5 секунд, баним станцию
    if (stationPlayStartTimeRef.current) {
      const playDuration = Date.now() - stationPlayStartTimeRef.current;
      if (playDuration < 5000) {
        const currentStation = stationsRef.current[stationIndexRef.current];
        if (currentStation && activeTagRef.current) {
          console.log(`Station switched too quickly (${playDuration}ms), adding to blacklist`);
          addToBlacklist(currentStation, activeTagRef.current);
        }
      }
      stationPlayStartTimeRef.current = null;
    }
    
    // Полный сброс аудио перед переключением
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current.load();
    }

    const list = stationsRef.current;
    if (!list.length) return;
    failedCountRef.current = 0;
    
    const currentGenre = activeTagRef.current ?? "lofi";
    // ПРИОРИТЕТ 1: Проверяем verifiedStations для текущего жанра (непроигранные в сессии)
    const unplayedVerified = getUnplayedVerifiedStations(currentGenre);
    // Фильтруем verified станции через черный список
    const verifiedFiltered = filterBlacklistedStations(unplayedVerified);
    if (verifiedFiltered.length > 0) {
      console.log(`Found ${verifiedFiltered.length} unplayed verified stations for genre "${currentGenre}" (${unplayedVerified.length - verifiedFiltered.length} filtered by blacklist)`);
      // Выбираем случайную станцию из непроигранных verified
      const randomVerified = verifiedFiltered[Math.floor(Math.random() * verifiedFiltered.length)];
      
      // Создаем временный список с verified станцией
      stationsRef.current = [randomVerified];
      setStations([randomVerified]);
      await startStationPlayback(0);
      
      // Запускаем фоновый запрос для обновления списка (не блокируем)
      void preloadNextStations();
      return;
    }
    
    // ПРИОРИТЕТ 2: Используем preloaded stations для быстрого переключения
    if (preloadedStationsRef.current.length > 0) {
      const preloaded = preloadedStationsRef.current;
      preloadedStationsRef.current = []; // Clear used preload
      
      // Фильтруем preloaded станции через черный список
      const preloadedFiltered = filterBlacklistedStations(preloaded);
      if (preloadedFiltered.length > 0) {
        stationsRef.current = preloadedFiltered;
        setStations(preloadedFiltered);
        const randomIndex = Math.floor(Math.random() * preloadedFiltered.length);
        await startStationPlayback(randomIndex);
        
        // Start preloading next stations in background (non-blocking)
        void preloadNextStations();
        return;
      } else {
        // Если все preloaded станции в черном списке, продолжаем к следующему приоритету
        console.log("All preloaded stations are blacklisted, fetching new stations");
      }
    }
    
    // ПРИОРИТЕТ 3: Если verifiedStations закончились или пусты, делаем стандартный fetch
    isLoadingRef.current = true;
    try {
      const { stations: newStations } = await fetchStations(
        currentGenre,
        true,
        { showStatus: true }
      );
      if (newStations.length > 0) {
        stationsRef.current = newStations;
        setStations(newStations);
        // Select random station from new list
        const randomIndex = Math.floor(Math.random() * newStations.length);
        await startStationPlayback(randomIndex);
        
        // Start preloading next stations in background
        void preloadNextStations();
      } else {
        // Fallback to next in existing list if fetch fails
        const list = stationsRef.current;
        if (list.length > 0) {
          const nextIndex = (stationIndexRef.current + 1) % list.length;
          await startStationPlayback(nextIndex);
        }
      }
    } catch (error) {
      // Игнорируем ошибки отмены запроса
      if (error instanceof Error && error.name === 'AbortError') {
        console.log("Request was aborted during next station fetch");
        return;
      }
      console.error("Failed to fetch new stations, using existing list:", error);
      // Fallback to next in existing list
      const list = stationsRef.current;
      if (list.length > 0) {
        const nextIndex = (stationIndexRef.current + 1) % list.length;
        await startStationPlayback(nextIndex);
      }
    } finally {
      isLoadingRef.current = false;
    }
  };

  const handlePrevStation = () => {
    if (isConnecting || isSwitchingRef.current) return;
    const list = stationsRef.current;
    if (!list.length) return;
    failedCountRef.current = 0;
    const prevIndex = (stationIndexRef.current - 1 + list.length) % list.length;
    void startStationPlayback(prevIndex);
  };

  // Принудительная остановка аудио при переходе на главный экран
  useEffect(() => {
    if (screen === "idle") {
      // Полная остановка аудио при переходе на idle
      if (audioRef.current) {
        // Сначала останавливаем воспроизведение
        audioRef.current.pause();
        
        // Удаляем все обработчики событий через removeEventListener
        const handlers = audioEventHandlersRef.current;
        if (handlers.handlePlay) {
          audioRef.current.removeEventListener("play", handlers.handlePlay);
        }
        if (handlers.handlePause) {
          audioRef.current.removeEventListener("pause", handlers.handlePause);
        }
        if (handlers.handleError) {
          audioRef.current.removeEventListener("error", handlers.handleError);
        }
        if (handlers.handleStalled) {
          audioRef.current.removeEventListener("stalled", handlers.handleStalled);
        }
        if (handlers.handlePlaying) {
          audioRef.current.removeEventListener("playing", handlers.handlePlaying);
        }
        if (handlers.handleCanplay) {
          audioRef.current.removeEventListener("canplay", handlers.handleCanplay);
        }
        if (handlers.handleLoadstart) {
          audioRef.current.removeEventListener("loadstart", handlers.handleLoadstart);
        }
        
        // Очищаем обработчики
        audioEventHandlersRef.current = {};
        
        // Полностью очищаем источник
        audioRef.current.src = "";
        audioRef.current.load();
        
        // Отключаем все обработчики через on* свойства (на всякий случай)
        audioRef.current.onplay = null;
        audioRef.current.onpause = null;
        audioRef.current.onerror = null;
        audioRef.current.onstalled = null;
        audioRef.current.onplaying = null;
        audioRef.current.oncanplay = null;
        audioRef.current.onloadstart = null;
      }
      
      // НЕ закрываем AudioContext полностью при переходе на idle
      // Просто приостанавливаем его, чтобы можно было использовать снова
      if (audioContextRef.current) {
        // Отключаем source от analyser
        if (sourceRef.current) {
          try {
            sourceRef.current.disconnect();
          } catch (e) {
            // Игнорируем ошибки отключения
          }
          sourceRef.current = null;
        }
        
        // Приостанавливаем AudioContext вместо закрытия
        // Это позволит использовать его снова без пересоздания
        if (audioContextRef.current.state !== "closed" && audioContextRef.current.state !== "suspended") {
          audioContextRef.current.suspend().catch(() => {});
        }
        // НЕ обнуляем audioContextRef - оставляем его для повторного использования
      }
      
      // НЕ сбрасываем audioReadyRef - оставляем его, чтобы не пересоздавать source
      // createMediaElementSource можно вызвать только один раз для каждого элемента
      
      // Очищаем все таймауты
      if (streamTimeoutRef.current) {
        window.clearTimeout(streamTimeoutRef.current);
        streamTimeoutRef.current = null;
      }
      if (stalledTimeoutRef.current) {
        window.clearTimeout(stalledTimeoutRef.current);
        stalledTimeoutRef.current = null;
      }
      
      // Останавливаем анимации
      if (volumeFadeRef.current) {
        cancelAnimationFrame(volumeFadeRef.current);
        volumeFadeRef.current = null;
      }
      
      // Сбрасываем состояние
      activeStationUrlRef.current = null;
      setPlaybackState("idle");
    }
  }, [screen]);

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
        isConnecting={isConnecting}
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
