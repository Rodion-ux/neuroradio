import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";

export const runtime = "nodejs";

const SOUNDCLOUD_TOKEN_URL = "https://api.soundcloud.com/oauth2/token";
const SOUNDCLOUD_API_BASE = "https://api.soundcloud.com";

type SoundCloudTokenResponse = {
  access_token: string;
  expires_in: number; // seconds
  token_type: string;
};

type SoundCloudUser = {
  username: string;
};

type SoundCloudTrack = {
  id: number;
  title: string;
  duration: number;
  artwork_url?: string | null;
  permalink_url: string;
  user: SoundCloudUser;
  playback_count?: number;
};

type MixResponseItem = {
  id: number;
  title: string;
  user: {
    username: string;
  };
  artwork_url: string | null;
  duration: number;
  permalink_url: string;
};

type AiCuratorResponse = {
  search_term: string;
  min_duration: number;
  max_duration: number;
  /**
   * Дополнительные поля, которые отправляются на фронтенд
   * для удобства отображения.
   */
  min_duration_minutes?: number;
  mood_tag?: string;
};

type QueryGeneratorResponse = {
  queries: string[];
};

let cachedToken: {
  accessToken: string;
  expiresAt: number; // ms timestamp
} | null = null;

async function getAccessToken(): Promise<string> {
  const clientId = process.env.NEXT_PUBLIC_SOUNDCLOUD_CLIENT_ID;
  const clientSecret = process.env.SOUNDCLOUD_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("SoundCloud credentials are not configured");
  }

  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt - 60_000 > now) {
    return cachedToken.accessToken;
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });

  const response = await fetch(SOUNDCLOUD_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Failed to obtain SoundCloud token: ${response.status} ${response.statusText} ${text}`
    );
  }

  const data = (await response.json()) as SoundCloudTokenResponse;
  const expiresAt = now + data.expires_in * 1000;

  cachedToken = {
    accessToken: data.access_token,
    expiresAt,
  };

  return data.access_token;
}

async function searchCuratedMixes(
  searchTerm: string,
  minDurationMinutes: number,
  maxDurationMinutes: number,
  alternativeQueries?: string[]
): Promise<MixResponseItem[]> {
  const accessToken = await getAccessToken();

  const baseMinMinutes = Math.max(5, Math.min(60, Math.round(minDurationMinutes)));
  const baseMaxMinutes = Math.max(baseMinMinutes, Math.min(60, Math.round(maxDurationMinutes)));

  // ШАГ 1: приоритетный поиск 20–30 минут с playback_count >= 3000
  const eliteMinMinutes = Math.max(20, baseMinMinutes);
  const eliteMaxMinutes = Math.max(eliteMinMinutes, Math.min(30, baseMaxMinutes));

  const step1Params = new URLSearchParams({
    q: searchTerm,
    "duration[from]": String(eliteMinMinutes * 60_000),
    "duration[to]": String(eliteMaxMinutes * 60_000),
    limit: "50",
    linked_partitioning: "1",
  });

  const step1Response = await fetch(
    `${SOUNDCLOUD_API_BASE}/tracks?${step1Params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
      cache: "no-store",
    }
  );

  let allTracks: SoundCloudTrack[] = [];

  if (step1Response.ok) {
    const step1Data = (await step1Response.json()) as unknown;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawTracks = (step1Data as any)?.collection ?? [];
    if (Array.isArray(rawTracks)) {
      allTracks = rawTracks as SoundCloudTrack[];
    }
  }

  // Фильтр по длительности и популярности для Шага 1.
  const eliteTracks = allTracks.filter((track) => {
    const hasDuration =
      typeof track.duration === "number" &&
      track.duration >= eliteMinMinutes * 60_000 &&
      track.duration <= eliteMaxMinutes * 60_000;
    const plays =
      typeof track.playback_count === "number" ? track.playback_count : 0;
    return hasDuration && plays >= 3000;
  });

  let selectedTracks: SoundCloudTrack[] = [];

  if (eliteTracks.length) {
    selectedTracks = eliteTracks;
  } else {
    // ШАГ 2: запасной поиск 5–60 минут без ограничений по прослушиваниям.
    // Пробуем сначала основной searchTerm, затем альтернативные queries если они есть.
    const queriesToTry = [searchTerm, ...(alternativeQueries ?? [])];

    for (const query of queriesToTry) {
      const step2Params = new URLSearchParams({
        q: query,
        "duration[from]": String(baseMinMinutes * 60_000),
        "duration[to]": String(baseMaxMinutes * 60_000),
        limit: "50",
        linked_partitioning: "1",
      });

      const step2Response = await fetch(
        `${SOUNDCLOUD_API_BASE}/tracks?${step2Params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/json",
          },
          cache: "no-store",
        }
      );

      if (!step2Response.ok) {
        // Продолжаем пробовать следующий query, если текущий не сработал.
        continue;
      }

      const step2Data = (await step2Response.json()) as unknown;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawTracks = (step2Data as any)?.collection ?? [];
      if (!Array.isArray(rawTracks)) {
        continue;
      }

      const filtered = (rawTracks as SoundCloudTrack[]).filter((track) => {
        return (
          typeof track.duration === "number" &&
          track.duration >= baseMinMinutes * 60_000 &&
          track.duration <= baseMaxMinutes * 60_000
        );
      });

      if (filtered.length > 0) {
        selectedTracks = filtered;
        break; // Нашли результаты — прекращаем поиск.
      }
    }
  }

  if (!selectedTracks.length) {
    return [];
  }

  const mixes: MixResponseItem[] = selectedTracks.map((track) => ({
    id: track.id,
    title: track.title,
    user: {
      username: track.user?.username ?? "Unknown DJ",
    },
    artwork_url: track.artwork_url ?? null,
    duration: track.duration,
    permalink_url: track.permalink_url,
  }));

  // Рандомизация: случайный микс из первой десятки результатов.
  if (mixes.length > 1) {
    const topCount = Math.min(10, mixes.length);
    const randomIndex = Math.floor(Math.random() * topCount);
    if (randomIndex > 0) {
      const [picked] = mixes.splice(randomIndex, 1);
      mixes.unshift(picked);
    }
  }

  return mixes;
}

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

async function generateSearchQueries(
  moodInput: string,
  lang: "ru" | "en" = "en"
): Promise<string[]> {
  try {
    const input = {
      system_prompt: `You are a music expert. Generate 3-4 English search keywords for SoundCloud to find long music mixes. Output only keywords separated by commas, no JSON, no explanations.

Example: "aggressive workout phonk"

Requirements:
- Each keyword should be 2-4 words
- Focus on energetic, popular mixes
- Output format: keyword1, keyword2, keyword3, keyword4`,
      prompt: `User mood: ${moodInput}. Generate 3-4 English search keywords for SoundCloud to find long music mixes. Example: 'aggressive workout phonk'. Output only keywords.`,
    };

    const output = await replicate.run("openai/gpt-4.1-mini", { input });

    let rawResponse = "";
    if (Array.isArray(output)) {
      rawResponse = output.join("").trim();
    } else {
      rawResponse = String(output).trim();
    }

    // Парсим ответ: может быть JSON или просто ключевые слова через запятую
    let queries: string[] = [];
    
    // Пробуем найти JSON
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.queries && Array.isArray(parsed.queries)) {
          queries = parsed.queries;
        }
      } catch {
        // Игнорируем ошибку парсинга JSON
      }
    }
    
    // Если не нашли JSON, пробуем парсить как простой список через запятую
    if (queries.length === 0) {
      queries = rawResponse
        .split(",")
        .map((q) => q.trim())
        .filter((q) => q.length > 0);
    }

    // Нормализуем queries: обрезаем до 120 символов, фильтруем пустые
    queries = queries
      .filter((q) => typeof q === "string" && q.trim().length > 0)
      .map((q) => String(q).trim().slice(0, 120))
      .slice(0, 4); // Максимум 4 запроса

    if (queries.length === 0) {
      queries = ["lofi beats"];
    }

    return queries;
  } catch (error) {
    console.error("Replicate API error in generateSearchQueries:", error);
    // Fallback на дефолтный поиск при ошибке Replicate
    return ["lofi beats"];
  }
}

async function runAiCurator(
  text: string,
  lang: "ru" | "en" = "en"
): Promise<AiCuratorResponse> {
  try {
    const input = {
      system_prompt: `You are an AI curator for online radio mixes. Return STRICTLY one JSON object: {"search_term": "string", "min_duration": 5, "max_duration": 60}.

Requirements:
- "search_term": short, meaningful search query for SoundCloud in English (e.g., "hard techno gym mix")
- "min_duration": number of minutes, between 5 and 60
- "max_duration": number of minutes, between min_duration and 60

Your task is to find only highly-rated and popular mixes.
Prioritize queries in format:
- "<genre> popular essential mixes"
- "<genre> best live sets"
- "<genre> classic essential mix"
where <genre> is the mood/genre extracted from user text.

Add keywords that help find quality, frequently played sets:
e.g., "popular essential mix", "best live set", "all time best", "most played".

You must NEVER suggest mixes shorter than 5 minutes or longer than 60 minutes.

No text before or after JSON, only the object itself.`,
      prompt: `User mood input: "${text}". Return ONLY JSON:`,
    };

    const output = await replicate.run("openai/gpt-4.1-mini", { input });

    let rawResponse = "";
    if (Array.isArray(output)) {
      rawResponse = output.join("").trim();
    } else {
      rawResponse = String(output).trim();
    }

    let result: AiCuratorResponse = {
      search_term: "lofi beats",
      min_duration: 5,
      max_duration: 60,
    };

    try {
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error("Failed to parse AI curator JSON:", error, rawResponse);
    }

    if (!result.search_term || typeof result.search_term !== "string") {
      result.search_term = "lofi beats";
    } else {
      result.search_term = result.search_term.slice(0, 120);
    }

    if (typeof result.min_duration !== "number" || !Number.isFinite(result.min_duration)) {
      result.min_duration = 5;
    }
    if (typeof result.max_duration !== "number" || !Number.isFinite(result.max_duration)) {
      result.max_duration = 60;
    }

    result.min_duration = Math.max(5, Math.min(60, Math.round(result.min_duration)));
    result.max_duration = Math.max(
      result.min_duration,
      Math.min(60, Math.round(result.max_duration))
    );

    return result;
  } catch (error) {
    console.error("Replicate API error in runAiCurator:", error);
    // Fallback на дефолтные значения при ошибке Replicate
    return {
      search_term: "lofi beats",
      min_duration: 5,
      max_duration: 60,
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    // Поддержка как параметра 'text', так и 'mood' для обратной совместимости.
    const moodInput =
      typeof body.mood === "string" && body.mood.trim().length
        ? body.mood.trim()
        : typeof body.text === "string" && body.text.trim().length
          ? body.text.trim()
          : "";
    const langRaw = typeof body.lang === "string" ? body.lang.toLowerCase() : "en";
    const lang: "ru" | "en" = langRaw === "ru" ? "ru" : "en";

    if (!moodInput) {
      return NextResponse.json(
        { error: "Missing 'text' or 'mood' in request body" },
        { status: 400 }
      );
    }

    // ШАГ 1: Генерируем несколько поисковых тегов через Replicate.
    // Если Replicate выдает ошибку, используем дефолтный поиск по жанру.
    let searchQueries: string[];
    try {
      searchQueries = await generateSearchQueries(moodInput, lang);
    } catch (error) {
      console.error("Replicate error in generateSearchQueries, using default:", error);
      searchQueries = ["lofi beats"];
    }
    const primaryQuery = searchQueries[0] ?? "lofi beats";

    // ШАГ 2: Получаем параметры длительности от AI-куратора.
    // Если Replicate выдает ошибку, используем дефолтные значения.
    let ai: AiCuratorResponse;
    try {
      ai = await runAiCurator(moodInput, lang);
    } catch (error) {
      console.error("Replicate error in runAiCurator, using defaults:", error);
      ai = {
        search_term: "lofi beats",
        min_duration: 5,
        max_duration: 60,
      };
    }

    // ШАГ 3: Waterfall-поиск с использованием основного query и альтернативных.
    const alternativeQueries = searchQueries.slice(1);
    const mixes = await searchCuratedMixes(
      primaryQuery,
      ai.min_duration,
      ai.max_duration,
      alternativeQueries
    );

    if (!mixes.length) {
      return NextResponse.json(
        {
          error: "НИЧЕГО НЕ НАЙДЕНО, ПОПРОБУЙ ДРУГОЙ ВАЙБ",
          details: { ai, queries: searchQueries },
        },
        { status: 404 }
      );
    }

    const responseAi: AiCuratorResponse = {
      ...ai,
      // Для фронтенда удобнее отдельное поле в минутах.
      min_duration_minutes: ai.min_duration,
      // Тег для UI: либо исходный moodInput, либо search_term.
      mood_tag: moodInput || ai.search_term,
    };

    return NextResponse.json(
      {
        mixes,
        ai: responseAi,
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
    console.error("AI curated mixes API error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch AI-curated mixes",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

