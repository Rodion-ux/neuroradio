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
};

let cachedToken: {
  accessToken: string;
  expiresAt: number; // ms timestamp
} | null = null;

async function getAccessToken(): Promise<string> {
  const clientId = process.env.SOUNDCLOUD_CLIENT_ID;
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
  maxDurationMinutes: number
): Promise<MixResponseItem[]> {
  const accessToken = await getAccessToken();

  const minMinutes = Math.max(5, Math.min(60, Math.round(minDurationMinutes)));
  const maxMinutes = Math.max(minMinutes, Math.min(60, Math.round(maxDurationMinutes)));

  const minDurationMs = minMinutes * 60_000;
  const maxDurationMs = maxMinutes * 60_000;

  const params = new URLSearchParams({
    q: searchTerm,
    "duration[from]": String(minDurationMs),
    "duration[to]": String(maxDurationMs),
    limit: "30",
    linked_partitioning: "1",
  });

  const response = await fetch(`${SOUNDCLOUD_API_BASE}/tracks?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `SoundCloud tracks request failed: ${response.status} ${response.statusText} ${text}`
    );
  }

  const data = (await response.json()) as any;

  if (data && (data.errors || data.error || data.status === "error")) {
    const message =
      (Array.isArray(data.errors) && data.errors[0]?.error_message) ||
      data.error ||
      "Unknown SoundCloud error";
    throw new Error(`SoundCloud API error: ${message}`);
  }

  const rawTracks = data?.collection ?? [];
  if (!Array.isArray(rawTracks)) {
    console.warn("Unexpected SoundCloud curated tracks payload shape:", data);
    return [];
  }

  const tracks = rawTracks as SoundCloudTrack[];

  // Нормализуем счётчики прослушиваний и сортируем по популярности.
  const ratedTracks = [...tracks].sort((a, b) => {
    const aPlays = typeof a.playback_count === "number" ? a.playback_count : 0;
    const bPlays = typeof b.playback_count === "number" ? b.playback_count : 0;

    const aHigh = aPlays >= 5000 ? 1 : 0;
    const bHigh = bPlays >= 5000 ? 1 : 0;

    if (aHigh !== bHigh) {
      // Треки с >= 5000 прослушиваний имеют приоритет.
      return bHigh - aHigh;
    }

    // Внутри одной группы сортируем по количеству прослушиваний по убыванию.
    return bPlays - aPlays;
  });

  // Преобразуем в формат миксов.
  const mixes: MixResponseItem[] = ratedTracks.map((track) => ({
    id: track.id,
    title: track.title,
    user: {
      username: track.user?.username ?? "Unknown DJ",
    },
    artwork_url: track.artwork_url ?? null,
    duration: track.duration,
    permalink_url: track.permalink_url,
  }));

  if (!mixes.length) return [];

  // Выбираем случайный трек только из ТОП‑5 по популярности,
  // чтобы рандомизация не била по качеству.
  const top = mixes.slice(0, Math.min(5, mixes.length));
  const tail = mixes.slice(top.length);
  const randomIndex = Math.floor(Math.random() * top.length);
  const [picked] = top.splice(randomIndex, 1);

  return [picked, ...top, ...tail];
}

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

async function runAiCurator(
  text: string,
  lang: "ru" | "en" = "en"
): Promise<AiCuratorResponse> {
  const isRussian = lang === "ru";
  const languageInstruction = isRussian
    ? "Если lang === 'ru', пиши свои внутренние пояснения на русском, но JSON строго с английскими ключами."
    : "If lang === 'en', write any explanations in English, but JSON keys must stay in English.";

  const input = {
    system_prompt: `Ты — AI-куратор миксов для онлайн-радио.
Верни СТРОГО один JSON-объект: {"search_term": "string", "min_duration": 5, "max_duration": 60}.

Требования:
- "search_term": короткий, осмысленный запрос для SoundCloud, на английском (например: "hard techno gym mix").
- "min_duration": число минут, не меньше 5 и не больше 60.
- "max_duration": число минут, не меньше min_duration и не больше 60.

Ты НИКОГДА не должен предлагать миксы короче 5 минут и длиннее 60 минут.

Твоя задача — находить только высокорейтинговые и популярные миксы.
Подбирая "search_term", добавляй ключевые слова, которые помогают находить качественные и часто прослушиваемые сеты:
например, "best of", "top", "essential mix", "most played", "classic set", "all time best".

${languageInstruction}

Никакого текста до или после JSON, только сам объект.`,
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
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const text = typeof body.text === "string" ? body.text.trim() : "";
    const langRaw = typeof body.lang === "string" ? body.lang.toLowerCase() : "en";
    const lang: "ru" | "en" = langRaw === "ru" ? "ru" : "en";

    if (!text) {
      return NextResponse.json(
        { error: "Missing 'text' in request body" },
        { status: 400 }
      );
    }

    const ai = await runAiCurator(text, lang);
    const mixes = await searchCuratedMixes(
      ai.search_term,
      ai.min_duration,
      ai.max_duration
    );

    if (!mixes.length) {
      return NextResponse.json(
        {
          error: "No mixes found for curated search",
          details: { ai },
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        mixes,
        ai,
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

