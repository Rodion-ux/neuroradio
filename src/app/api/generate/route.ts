import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

export const runtime = "nodejs";

const RADIO_MIRRORS = [
  // Локальное зеркало (Амстердам) — приоритет по пингу
  "https://nl1.api.radio-browser.info",
  "https://de1.api.radio-browser.info",
  "https://fr1.api.radio-browser.info",
  "https://at1.api.radio-browser.info",
] as const;

// Статический denylist станций, которые стабильно не поддерживаются браузерами
// (определено по runtime-логам NotSupportedError).
const BACKEND_BLOCKED_STATIONS = new Set<string>([
  // Rinse UK
  "9c100db7-ba97-4e6f-821f-dba1ed08ad52",
  // DnBRadio.com - Darkstep Channel (DE Mirror)
  "bc195601-561a-473a-b3b4-7b80e540811c",
  // Eruption Radio
  "2c3eac2c-4588-42d3-9c2e-0c6e99afaf6e",
  // DnBRadio Main channel 192k
  "edaa4ad7-bdf3-11e8-aaf2-52543be04c81",
  // Sunshine Live - Drum 'N' Bass
  "962c0432-0601-11e8-ae97-52543be04c81",
  // Radio Caprice - Minimal Techno
  "19c57c60-bf6f-481b-9197-cb7e4f58c589",
]);

type RawStation = {
  stationuuid: string;
  name: string;
  url: string;
  url_resolved: string;
  tags: string;
  favicon?: string;
  country?: string;
  codec?: string;
};

type Station = {
  id: string; // stationuuid, используется как ключ
  stationuuid: string;
  name: string;
  urlResolved: string;
  tags: string[];
  favicon?: string;
  country?: string;
  codec?: string;
};

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

/**
 * Federated Radio-Browser API fetch с ротацией зеркал.
 * Пробует каждый URL по очереди, при 5xx или таймауте — переключается.
 */
const fetchWithFallback = async (
  path: string,
  params: URLSearchParams,
  init?: RequestInit
): Promise<Response> => {
  let lastError: unknown;

  for (const base of RADIO_MIRRORS) {
    const url = `${base}${path}?${params.toString()}`;
    try {
      const response = await fetch(url, {
        ...init,
        // Быстрый таймаут на зеркало, чтобы успеть переключиться
        signal: init?.signal ?? AbortSignal.timeout(2000),
        headers: {
          "User-Agent": "Neuro Radio",
          ...(init?.headers ?? {}),
        },
      });

      // Если зеркало отвечает 5xx — считаем его временно мёртвым и идём дальше
      if (!response.ok && response.status >= 500) {
        lastError = new Error(`Mirror ${base} returned ${response.status}`);
        continue;
      }

      return response;
    } catch (error) {
      lastError = error;
      // Переходим к следующему зеркалу
      continue;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("All Radio-Browser mirrors failed");
};

const isHttpsUrl = (value?: string) =>
  typeof value === "string" && value.trim().toLowerCase().startsWith("https://");

const getStreamFormat = (url: string): "mp3" | "aac" | "ogg" | "other" => {
  const lower = url.toLowerCase();
  if (lower.includes("mp3") || lower.endsWith(".mp3")) return "mp3";
  if (lower.includes("aac") || lower.endsWith(".aac")) return "aac";
  if (lower.includes("ogg") || lower.endsWith(".ogg")) return "ogg";
  return "other";
};

/**
 * Строгий HTTPS:
 * - используем только url_resolved (если есть) либо url
 * - если http:// — пробуем заменить на https://
 * - если после этого не https:// — отбрасываем станцию
 */
const normalizeStreamUrl = (value?: string): string | null => {
  if (typeof value !== "string") return null;
  let url = value.trim();

  if (!/^https?:\/\//i.test(url)) {
    return null;
  }

  if (url.toLowerCase().startsWith("http://")) {
    url = "https://" + url.slice("http://".length);
  }

  if (!url.toLowerCase().startsWith("https://")) {
    return null;
  }

  return url;
};

// Проверка соответствия станции запрошенному жанру
const isStationRelevant = (station: Station, requestedTag: string): boolean => {
  const mapping = getTagMapping(requestedTag);
  if (!mapping) return true; // Если маппинга нет, пропускаем все станции
  
  const stationTags = (station.tags || []).map(t => t.toLowerCase());
  const stationName = (station.name || "").toLowerCase();
  const allText = [...stationTags, stationName].join(" ");
  
  // Проверка стоп-слов: если найдено стоп-слово, станция исключается
  for (const stopWord of mapping.stopWords) {
    if (allText.includes(stopWord.toLowerCase())) {
      return false;
    }
  }
  
  // Проверка обязательных тегов: хотя бы один должен присутствовать
  if (mapping.requiredTags && mapping.requiredTags.length > 0) {
    const hasRequiredTag = mapping.requiredTags.some(requiredTag => 
      allText.includes(requiredTag.toLowerCase())
    );
    if (!hasRequiredTag) {
      return false;
    }
  }
  
  return true;
};

const normalizeStations = (stations: RawStation[], requestedTag?: string): Station[] => {
  const filtered: Station[] = [];

  for (const station of stations) {
    // Отбрасываем станции из статического denylist по stationuuid
    if (BACKEND_BLOCKED_STATIONS.has(station.stationuuid)) {
      continue;
    }

    const rawUrl = station.url_resolved || station.url;
    const normalizedUrl = normalizeStreamUrl(rawUrl);
    if (!normalizedUrl) continue;

    const tagsArray =
      typeof station.tags === "string" && station.tags.length
        ? station.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [];

    const normalized: Station = {
      id: station.stationuuid,
      stationuuid: station.stationuuid,
      name: station.name,
      urlResolved: normalizedUrl,
      tags: tagsArray,
      favicon: station.favicon,
      country: station.country,
      codec: station.codec,
    };

    // Проверка релевантности жанру (если передан requestedTag)
    if (requestedTag && !isStationRelevant(normalized, requestedTag)) {
      continue;
    }

    filtered.push(normalized);
  }

  console.log(
    `Found ${filtered.length} stations after strict HTTPS and relevance filter (requested: ${
      requestedTag || "any"
    })`
  );

  const withFormat = filtered.map((station) => ({
    station,
    format: getStreamFormat(station.urlResolved),
    isMp3: getStreamFormat(station.urlResolved) === "mp3",
  }));

  const sorted = withFormat.sort((a, b) => {
    if (a.isMp3 && !b.isMp3) return -1;
    if (!a.isMp3 && b.isMp3) return 1;
    return 0;
  });

  return sorted.map(({ station }) => station);
};

const AI_STOP_TAGS = ["talk", "news", "pop"];

const hasBlockedTags = (station: ReturnType<typeof normalizeStations>[number]) => {
  const tagText = [...(station.tags || []), station.name || ""].join(" ").toLowerCase();
  return AI_STOP_TAGS.some((stopTag) => tagText.includes(stopTag));
};

const collectAiCandidates = async (
  tag: string,
  useRandomOrder = false,
  limit = 30
): Promise<ReturnType<typeof normalizeStations>> => {
  const normalizedTag = normalizeTagForSearch(tag);
  const tagVariants = normalizedTag.split(",").map(t => t.trim()).filter(Boolean);
  const collected: ReturnType<typeof normalizeStations> = [];
  const seen = new Set<string>();
  const orderType: "random" | "votes" = useRandomOrder ? "random" : "votes";

  for (const searchTag of tagVariants) {
    if (collected.length >= limit) break;
    const normalized = await searchStationsByTagOnce(
      searchTag,
      limit,
      orderType
    );
    for (const station of normalized) {
      if (collected.length >= limit) break;
      if (!station.id || seen.has(station.id)) continue;
      if (hasBlockedTags(station)) continue;
      seen.add(station.id);
      collected.push(station);
    }
  }

  const result = collected.slice(0, limit);
  return result;
};

const getAiPreferredIds = async (
  stations: ReturnType<typeof normalizeStations>,
  selectedGenre: string
): Promise<{ ids: string[]; usedAi: boolean }> => {
  const fallbackIds = stations
    .map((station) => station.id)
    .filter(Boolean)
    .slice(0, 5);

  if (!process.env.REPLICATE_API_TOKEN) {
    console.warn("REPLICATE_API_TOKEN not configured, skipping AI validation");
    return { ids: fallbackIds, usedAi: false };
  }

  const stationList = stations
    .map((station) => `- id: ${station.id} | name: ${station.name} | tags: ${(station.tags || []).join(", ") || "none"}`)
    .join("\n");

  const prompt = `Отбери только те станции, которые строго соответствуют жанру "${selectedGenre}". Игнорируй станции с тегами "talk", "news", "pop". Верни JSON с 5 лучшими ID.\n\nФормат ответа: { "ids": ["id1", "id2", "id3", "id4", "id5"] }\n\nСтанции:\n${stationList}\n\nВерни только JSON, без дополнительного текста.`;

  try {
    // Используем Replicate с моделью openai/gpt-4.1-mini
    const input = {
      system_prompt:
        "Return JSON only. Select 5 station IDs that best match the genre. Ignore stations with tags 'talk', 'news', 'pop'.",
      prompt: prompt,
    };

    const output = await replicate.run("openai/gpt-4.1-mini", { input });

    // Собираем ответ (обычно приходит массив строк или строка)
    let rawResponse = "";
    if (Array.isArray(output)) {
      rawResponse = output.join("").trim();
    } else {
      rawResponse = String(output).trim();
    }

    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { ids: fallbackIds, usedAi: false };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed.ids)) {
      return { ids: fallbackIds, usedAi: false };
    }

    const ids = parsed.ids.map((id: string) => String(id)).filter(Boolean);

    return ids.length
      ? { ids: ids.slice(0, 5), usedAi: true }
      : { ids: fallbackIds, usedAi: false };
  } catch (error) {
    console.warn("AI validation failed, using fallback IDs:", error);
    return { ids: fallbackIds, usedAi: false };
  }
};

// (старое определение getAiPreferredIds было заменено новой версией выше)

const headLatency = async (url: string, timeoutMs = 400): Promise<number | null> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const start = Date.now();

  try {
    const response = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; NeuroRadio/1.0)",
      },
    });

    clearTimeout(timeoutId);
    const ok =
      response.ok ||
      response.status === 206 ||
      response.status === 301 ||
      response.status === 302;

    return ok ? Date.now() - start : null;
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
};

const pickFastestStation = async (
  stations: ReturnType<typeof normalizeStations>,
  timeoutMs = 1000
): Promise<ReturnType<typeof normalizeStations>[number] | null> => {
  if (!stations.length) return null;

  const results = await Promise.all(
    stations.map(async (station) => {
      const latency = await headLatency(station.urlResolved, timeoutMs);
      return latency !== null ? { station, latency } : null;
    })
  );

  const valid = results.filter(Boolean) as Array<{ station: ReturnType<typeof normalizeStations>[number]; latency: number }>;
  if (!valid.length) return null;

  valid.sort((a, b) => a.latency - b.latency);
  return valid[0].station;
};

/**
 * Check if a radio station URL is accessible
 * Uses HEAD request with timeout to quickly verify availability
 */
const checkStationAvailability = async (url: string, timeoutMs = 800): Promise<boolean> => {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NeuroRadio/1.0)',
      },
      // Быстрая проверка доступности с помощью AbortSignal.timeout
      signal: AbortSignal.timeout(timeoutMs),
    });

    // Явно отбрасываем станции с 403/451 (требуется VPN / блокировка)
    if (response.status === 403 || response.status === 451) {
      return false;
    }

    // Остальные статусы: считаем доступными, если ok либо редиректы/частичный контент
    const isOk =
      response.ok ||
      response.status === 206 ||
      response.status === 301 ||
      response.status === 302;

    return isOk;
  } catch (error) {
    // Любая ошибка (включая таймаут) — считаем поток недоступным
    return false;
  }
};

/**
 * Filter stations by availability, checking multiple in parallel
 * Returns only stations that are confirmed accessible
 */
const filterAvailableStations = async (
  stations: ReturnType<typeof normalizeStations>
): Promise<ReturnType<typeof normalizeStations>> => {
  if (!stations.length) return [];

  const startedAt = Date.now();

  const availabilityChecks = await Promise.allSettled(
    stations.map((station) =>
      checkStationAvailability(station.urlResolved).then((available) => ({
        station,
        available,
      }))
    )
  );

  const availableStations: ReturnType<typeof normalizeStations> = [];

  for (const result of availabilityChecks) {
    if (result.status === "fulfilled" && result.value.available) {
      availableStations.push(result.value.station);
    }
  }

  const durationMs = Date.now() - startedAt;

  console.info(
    `Checked ${stations.length} stations, found ${availableStations.length} available in ${durationMs}ms`
  );

  // Return only available stations
  return availableStations;
};

/**
 * Один HTTP-вызов /json/stations/search с заданным тегом и параметрами.
 * Всегда проставляет:
 * - hidebroken=true
 * - https=true
 * - order=votes|random
 * - reverse=true (сначала самые популярные/проверенные)
 */
const searchStationsByTagOnce = async (
  tag: string,
  limit: number,
  order: "votes" | "random"
): Promise<Station[]> => {
  const params = new URLSearchParams({
    tag,
    limit: String(limit),
    hidebroken: "true",
    https: "true",
    order,
    reverse: "true",
    lastcheckok: "1",
  });

  const response = await fetchWithFallback("/json/stations/search", params);
  if (!response.ok) {
    throw new Error(`Radio-Browser search failed with ${response.status}`);
  }

  const raw = (await response.json()) as RawStation[];

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/574a7f99-6c21-48ad-9731-30948465c78f',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      sessionId:'debug-session',
      runId:'run-backend',
      hypothesisId:'H3',
      location:'generate/route.ts:searchStationsByTagOnce',
      message:'Radio-Browser search result',
      data:{
        tag,
        limit,
        order,
        rawCount:Array.isArray(raw)?raw.length:null
      },
      timestamp:Date.now()
    })
  }).catch(()=>{});
  // #endregion

  return normalizeStations(raw, tag);
};

class NoStationsError extends Error {}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawTag = searchParams.get("tag")?.trim() ?? "";
    const displayTag = rawTag.length ? rawTag.toLowerCase() : "lofi";
    const useRandomOrder =
      searchParams.get("random") === "1" || searchParams.get("random") === "true";

    console.info("AI stations requested for tag:", displayTag, "| randomOrder:", useRandomOrder);

    const candidates = await collectAiCandidates(displayTag, useRandomOrder);
    if (!candidates.length) {
      throw new NoStationsError(`No HTTPS stations available for tag "${displayTag}"`);
    }

    const { ids: aiIds, usedAi } = await getAiPreferredIds(candidates, displayTag);
    const aiStations = aiIds
      .map((id) => candidates.find((station) => station.id === id))
      .filter(Boolean) as ReturnType<typeof normalizeStations>;

    const fastest = await pickFastestStation(aiStations, 1000);
    const selected = fastest ?? aiStations[0] ?? candidates[0];

    if (!selected) {
      throw new NoStationsError(`No AI-validated stations available for tag "${displayTag}"`);
    }

    return NextResponse.json(
      {
        tag: displayTag,
        stations: [selected],
        aiValidated: usedAi && aiStations.length > 0,
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      }
    );
  } catch (error) {
    console.error("AI RADIO API ERROR:", error);
    if (error instanceof NoStationsError) {
      return NextResponse.json(
        { error: error.message },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Failed to fetch AI-validated station" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  let body: { tag?: string; useRandomOrder?: boolean } = {};

  try {
    body = await request.json();
  } catch {
    // Allow empty body.
  }

  try {
    // Простой поиск по тегу
    const rawTag = typeof body.tag === "string" ? body.tag.trim() : "";
    const displayTag = rawTag.length ? rawTag.toLowerCase() : "lofi";
    const useRandomOrder = body.useRandomOrder === true;
    console.info(
      "Radio stations requested for tag:",
      displayTag,
      "| randomOrder:",
      useRandomOrder
    );
    const stations = await fetchSecureStationsForTag(displayTag, useRandomOrder, {
      skipAvailability: true,
    });
    
    // Запрещаем кеширование
    return NextResponse.json(
      { tag: displayTag, stations },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error) {
    console.error("RADIO API ERROR:", error);
    if (error instanceof NoStationsError) {
      return NextResponse.json(
        { error: error.message, tag: body.tag ?? "lofi" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Failed to fetch radio stations" },
      { status: 500 }
    );
  }
}

// Маппинг тегов с расширенными поисковыми терминами и стоп-словами
type TagMapping = {
  searchTerms: string; // Термины для поиска (через запятую)
  stopWords: string[]; // Слова, которые должны исключать станцию
  requiredTags?: string[]; // Обязательные теги (хотя бы один должен быть)
};

const TAG_MAPPINGS: Record<string, TagMapping> = {
  "dnb": {
    searchTerms: "drum and bass, jungle, neurofunk, liquid dnb",
    stopWords: ["pop", "top40", "top 40", "talk", "news"],
    requiredTags: ["drum", "bass", "jungle", "dnb", "neurofunk", "liquid"],
  },
  "metal": {
    searchTerms: "metal, heavy metal, death metal, thrash metal, metalcore, doom metal, black metal",
    stopWords: ["pop", "talk", "news", "country", "folk"],
    requiredTags: ["metal", "heavy", "death", "thrash", "metalcore", "doom", "black"],
  },
  "phonk": {
    searchTerms: "phonk, drift phonk, memphis rap, memphis phonk",
    stopWords: ["pop", "talk", "news"],
    requiredTags: ["phonk", "drift", "memphis"],
  },
  "retro game": {
    searchTerms: "chiptune, 8-bit, video game music, vgm, game music",
    stopWords: ["pop", "talk", "news"],
    requiredTags: ["chiptune", "8-bit", "8bit", "vgm", "game", "video game"],
  },
  "lo-fi": {
    searchTerms: "lofi, lo fi, low fi, chillhop, chill beats",
    stopWords: ["talk", "news", "hardcore"],
    requiredTags: ["lofi", "lo fi", "low fi", "chill"],
  },
  "lofi": {
    searchTerms: "lofi, lo fi, low fi, chillhop, chill beats",
    stopWords: ["talk", "news", "hardcore"],
    requiredTags: ["lofi", "lo fi", "low fi", "chill"],
  },
  "chiptune": {
    searchTerms: "chiptune, 8-bit, vgm, video game music, game music",
    stopWords: ["pop", "talk", "news"],
    requiredTags: ["chiptune", "8-bit", "8bit", "vgm", "game"],
  },
  "synthwave": {
    searchTerms: "synthwave, retrowave, outrun, cyberpunk, 80s synth",
    stopWords: ["talk", "news"],
    requiredTags: ["synthwave", "retrowave", "outrun", "cyberpunk"],
  },
  "ambient": {
    searchTerms: "ambient, ambient music, chill ambient, dark ambient, space ambient",
    stopWords: ["talk", "news", "hardcore"],
    requiredTags: ["ambient"],
  },
  "techno": {
    searchTerms: "techno, techno music, electronic techno, minimal techno, dub techno",
    stopWords: ["pop", "talk", "news", "country"],
    requiredTags: ["techno"],
  },
  "jazz": {
    searchTerms: "jazz, smooth jazz, modern jazz, bebop, cool jazz",
    stopWords: ["talk", "news", "hardcore", "metal"],
    requiredTags: ["jazz"],
  },
  "soul": {
    searchTerms: "soul, soul music, classic soul, motown, r&b",
    stopWords: ["talk", "news", "hardcore", "metal"],
    requiredTags: ["soul", "motown"],
  },
  "piano": {
    searchTerms: "piano, piano music, classical piano, instrumental piano",
    stopWords: ["talk", "news", "hardcore", "metal"],
    requiredTags: ["piano"],
  },
  "hip-hop": {
    searchTerms: "hip hop, hiphop, rap, underground rap, boom bap",
    stopWords: ["talk", "news", "country"],
    requiredTags: ["hip", "hop", "rap", "hiphop"],
  },
  "hiphop": {
    searchTerms: "hip hop, hiphop, rap, underground rap, boom bap",
    stopWords: ["talk", "news", "country"],
    requiredTags: ["hip", "hop", "rap", "hiphop"],
  },
  "k-pop": {
    searchTerms: "kpop, korean pop, k-pop, korean music",
    stopWords: ["talk", "news"],
    requiredTags: ["kpop", "korean", "k-pop"],
  },
  "kpop": {
    searchTerms: "kpop, korean pop, k-pop, korean music",
    stopWords: ["talk", "news"],
    requiredTags: ["kpop", "korean", "k-pop"],
  },
  "j-pop": {
    searchTerms: "j-pop, j pop, jpop, japanese pop, japanese music",
    stopWords: ["talk", "news"],
    requiredTags: ["jpop", "japanese", "j-pop"],
  },
  "jpop": {
    searchTerms: "j-pop, j pop, jpop, japanese pop, japanese music",
    stopWords: ["talk", "news"],
    requiredTags: ["jpop", "japanese", "j-pop"],
  },
};

const normalizeTagForSearch = (tag: string): string => {
  const normalized = tag.toLowerCase().trim();
  return TAG_MAPPINGS[normalized]?.searchTerms || tag;
};

const getTagMapping = (tag: string): TagMapping | null => {
  const normalized = tag.toLowerCase().trim();
  return TAG_MAPPINGS[normalized] || null;
};

const getFallbackTag = (tag: string): string | null => {
  const fallbackMap: Record<string, string> = {
    "slowcore": "ambient",
    "sad lofi": "lofi",
    "sad piano": "piano",
    "indie folk": "indie",
    "lofi coding": "lofi",
    "gym phonk": "phonk",
    "liquid dnb": "drum and bass",
    "retro game": "chiptune",
    "video game music": "chiptune",
    "night drive": "synthwave",
    "road trip": "synthwave",
    "nature sounds": "ambient",
    "soft piano": "piano",
    "chill r&b": "rnb",
    "chill rnb": "rnb",
    "sexual vibe": "rnb",
    "lofi sex": "lofi",
    "phonk drift": "phonk",
    "doom metal": "metal",
    "metalcore": "metal",
    "post-rock": "rock",
    "indie pop": "indie",
    "retro pop": "pop",
    "classic rock": "rock",
    "rnb party": "rnb",
    "brain food": "ambient",
    "dub techno": "techno",
    "slow jam": "rnb",
    "slowjam": "rnb",
  };
  return fallbackMap[tag.toLowerCase()] || null;
};

const fetchSecureStationsForTag = async (
  tag: string,
  useRandomOrder = false,
  options?: { skipAvailability?: boolean }
) => {
  // Normalize tag for search (e.g., "dnb" -> "drum and bass, jungle, neurofunk")
  const normalizedTag = normalizeTagForSearch(tag);
  
  // Split multiple tags by comma and try each one, collecting all results
  const tagVariants = normalizedTag.split(',').map(t => t.trim()).filter(Boolean);
  const allSecureStations: ReturnType<typeof normalizeStations> = [];
  
  // Используем useRandomOrder для выбора порядка сортировки
  const orderType: "random" | "votes" = useRandomOrder ? "random" : "votes";

  for (const searchTag of tagVariants) {
    const secure = await searchStationsByTagOnce(
      searchTag,
      100,
      orderType
    );

    if (secure.length) {
      allSecureStations.push(...secure);
    }
  }

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/574a7f99-6c21-48ad-9731-30948465c78f',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      sessionId:'debug-session',
      runId:'run-backend',
      hypothesisId:'H4',
      location:'generate/route.ts:fetchSecureStationsForTag:after-search',
      message:'Collected stations for tag',
      data:{
        tag,
        useRandomOrder,
        totalSecure: allSecureStations.length,
        variants: tagVariants,
      },
      timestamp:Date.now()
    })
  }).catch(()=>{});
  // #endregion

  if (allSecureStations.length) {
    const skipAvailability = options?.skipAvailability === true;

    // Для быстрого пути (POST /api/generate) мы можем пропустить дорогую
    // проверку доступности и положиться на фронтендовый авто-скип и
    // черный список. Для других случаев оставляем полную проверку.
    const baseStations = skipAvailability
      ? allSecureStations
      : await filterAvailableStations(allSecureStations);
    
    if (!baseStations.length) {
      console.warn(`No available stations found for tag "${tag}"`);
      throw new NoStationsError(`No available stations for tag "${tag}"`);
    }
    
    // Shuffle array using Fisher-Yates algorithm
    const shuffled = [...baseStations];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    // Log the first station that will be selected
    if (shuffled.length > 0) {
      console.info(`Selected station: "${shuffled[0].name}" (${shuffled[0].urlResolved}) for tag "${tag}"`);
    }
    
    console.info(
      `Found ${baseStations.length} ${skipAvailability ? "raw" : "available"} stations (from ${allSecureStations.length} total), returning shuffled array (original: ${tag})`
    );
    return shuffled;
  }

  // Try fallback tag (use original tag for fallback lookup)
  const fallbackTag = getFallbackTag(tag);
  
  if (fallbackTag) {
    const normalizedFallback = normalizeTagForSearch(fallbackTag);
    const fallbackTagVariants = normalizedFallback.split(',').map(t => t.trim()).filter(Boolean);
    const allFallbackStations: ReturnType<typeof normalizeStations> = [];
    
    // Используем useRandomOrder для fallback тоже
    const fallbackOrderType: "random" | "votes" = useRandomOrder ? "random" : "votes";
    
    for (const searchTag of fallbackTagVariants) {
      const secureFallback = await searchStationsByTagOnce(
        searchTag,
        100,
        fallbackOrderType
      );
      if (secureFallback.length) {
        allFallbackStations.push(...secureFallback);
      }
    }
    
    if (allFallbackStations.length) {
      // Filter to only available stations
      const availableFallbackStations = await filterAvailableStations(allFallbackStations);
      
      if (availableFallbackStations.length === 0) {
        throw new NoStationsError(`No available stations for tag "${tag}" (fallback also failed)`);
      }
      
      // Shuffle array using Fisher-Yates algorithm
      const shuffled = [...availableFallbackStations];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      
      // Log the first station that will be selected
      if (shuffled.length > 0) {
        console.info(`Selected fallback station: "${shuffled[0].name}" (${shuffled[0].urlResolved}) for tag "${tag}"`);
      }
      
      console.info(`Found ${availableFallbackStations.length} available fallback stations (from ${allFallbackStations.length} total), returning shuffled array`);
      return shuffled;
    }
  }

  throw new NoStationsError(`No HTTPS stations available for tag "${tag}"`);
};
