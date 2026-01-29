import { NextRequest, NextResponse } from "next/server";

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

let cachedToken: {
  accessToken: string;
  expiresAt: number; // ms timestamp
} | null = null;

// Диапазоны длительности для разных шагов поиска
const ELITE_MIN_DURATION_MS = 20 * 60 * 1000; // 20 минут
const ELITE_MAX_DURATION_MS = 30 * 60 * 1000; // 30 минут
const FALLBACK_MIN_DURATION_MS = 5 * 60 * 1000; // 5 минут
const FALLBACK_MAX_DURATION_MS = 60 * 60 * 1000; // 60 минут
// Короткие треки (не миксы) — чтобы выдавать их наравне с миксами
const SHORT_TRACK_MIN_MS = 1 * 60 * 1000; // 1 минута
const SHORT_TRACK_MAX_MS = 10 * 60 * 1000; // 10 минут

// Исключаем арабские/ближневосточные треки по скрипту и ключевым словам
const ARABIC_SCRIPT_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;
const ARABIC_KEYWORDS = [
  "arabic", "arab", "middle east", "turkish", "egyptian", "moroccan",
  "lebanese", "syrian", "iraqi", "saudi", "uae", "dubai", "oriental",
  "عربي", "موسيقى", "تركي", "مصري", "لبناني", "سوري",
];

function isLikelyArabic(track: SoundCloudTrack): boolean {
  const title = (track.title ?? "").toLowerCase();
  const username = (track.user?.username ?? "").toLowerCase();
  const text = `${title} ${username}`;
  if (ARABIC_SCRIPT_REGEX.test(text)) return true;
  return ARABIC_KEYWORDS.some((kw) => text.includes(kw.toLowerCase()));
}

async function getAccessToken(): Promise<string> {
  const clientId = process.env.NEXT_PUBLIC_SOUNDCLOUD_CLIENT_ID;
  const clientSecret = process.env.SOUNDCLOUD_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("SoundCloud credentials are not configured");
  }

  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt - 60_000 > now) {
    // Есть ещё минимум минута до истечения токена — используем кэш
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

async function fetchTracks(params: URLSearchParams): Promise<SoundCloudTrack[]> {
  const accessToken = await getAccessToken();

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

  const data = (await response.json()) as unknown;

  if (
    data &&
    typeof data === "object" &&
    ( // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (data as any).errors ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (data as any).error ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (data as any).status === "error")
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = data as any;
    const message =
      (Array.isArray(payload.errors) && payload.errors[0]?.error_message) ||
      payload.error ||
      "Unknown SoundCloud error";
    throw new Error(`SoundCloud API error: ${message}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const collection = (data as any)?.collection ?? [];
  if (!Array.isArray(collection)) {
    console.warn("Unexpected SoundCloud tracks payload shape:", data);
    return [];
  }

  return collection as SoundCloudTrack[];
}

async function searchMixesByGenre(genre: string): Promise<MixResponseItem[]> {
  // ШАГ 1. Попытка найти "элитные" миксы: 20–30 минут и playback_count >= 3000.
  const eliteParams = new URLSearchParams({
    q: genre,
    genres: genre,
    "duration[from]": String(ELITE_MIN_DURATION_MS),
    "duration[to]": String(ELITE_MAX_DURATION_MS),
    limit: "50",
    linked_partitioning: "1",
  });

  const eliteTracksRaw = await fetchTracks(eliteParams);

  const eliteTracks = eliteTracksRaw
    .filter((track) => !isLikelyArabic(track))
    .filter(
      (track) =>
        typeof track.duration === "number" &&
        track.duration >= ELITE_MIN_DURATION_MS &&
        track.duration <= ELITE_MAX_DURATION_MS &&
        typeof track.playback_count === "number" &&
        track.playback_count >= 3000
    );

  if (eliteTracks.length) {
    const eliteMixes: MixResponseItem[] = eliteTracks.map((track) => ({
      id: track.id,
      title: track.title,
      user: {
        username: track.user?.username ?? "Unknown DJ",
      },
      artwork_url: track.artwork_url ?? null,
      duration: track.duration,
      permalink_url: track.permalink_url,
    }));

    // Короткие треки (1–10 мин) — миксы и треки одинаково по рандому
    const shortParams = new URLSearchParams({
      q: genre,
      genres: genre,
      "duration[from]": String(SHORT_TRACK_MIN_MS),
      "duration[to]": String(SHORT_TRACK_MAX_MS),
      limit: "30",
      linked_partitioning: "1",
    });
    const shortTracksRaw = await fetchTracks(shortParams);
    const shortTracks = shortTracksRaw
      .filter((track) => !isLikelyArabic(track))
      .filter(
        (track) =>
          typeof track.duration === "number" &&
          track.duration >= SHORT_TRACK_MIN_MS &&
          track.duration <= SHORT_TRACK_MAX_MS
      );
    const shortItems: MixResponseItem[] = shortTracks.map((track) => ({
      id: track.id,
      title: track.title,
      user: { username: track.user?.username ?? "Unknown DJ" },
      artwork_url: track.artwork_url ?? null,
      duration: track.duration,
      permalink_url: track.permalink_url,
    }));

    const combined = [...eliteMixes, ...shortItems];
    for (let i = combined.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [combined[i], combined[j]] = [combined[j], combined[i]];
    }
    return combined;
  }

  // ШАГ 2. Фоллбек: поиск 5–60 минут без ограничений по прослушиваниям.
  const fallbackParams = new URLSearchParams({
    q: genre,
    genres: genre,
    limit: "50",
    linked_partitioning: "1",
  });

  const tracks = await fetchTracks(fallbackParams);

  const longMixes = tracks
    .filter((track) => !isLikelyArabic(track))
    .filter(
      (track) =>
        typeof track.duration === "number" &&
        track.duration >= FALLBACK_MIN_DURATION_MS &&
        track.duration <= FALLBACK_MAX_DURATION_MS
    );

  const mixes: MixResponseItem[] = longMixes.map((track) => ({
    id: track.id,
    title: track.title,
    user: {
      username: track.user?.username ?? "Unknown DJ",
    },
    artwork_url: track.artwork_url ?? null,
    duration: track.duration,
    permalink_url: track.permalink_url,
  }));

  // Короткие треки (1–10 мин) — чтобы миксы и треки были одинаково по рандому
  const shortParams = new URLSearchParams({
    q: genre,
    genres: genre,
    "duration[from]": String(SHORT_TRACK_MIN_MS),
    "duration[to]": String(SHORT_TRACK_MAX_MS),
    limit: "30",
    linked_partitioning: "1",
  });
  const shortTracksRaw = await fetchTracks(shortParams);
  const shortTracks = shortTracksRaw
    .filter((track) => !isLikelyArabic(track))
    .filter(
      (track) =>
        typeof track.duration === "number" &&
        track.duration >= SHORT_TRACK_MIN_MS &&
        track.duration <= SHORT_TRACK_MAX_MS
    );
  const shortItems: MixResponseItem[] = shortTracks.map((track) => ({
    id: track.id,
    title: track.title,
    user: { username: track.user?.username ?? "Unknown DJ" },
    artwork_url: track.artwork_url ?? null,
    duration: track.duration,
    permalink_url: track.permalink_url,
  }));

  const combined = [...mixes, ...shortItems];
  if (combined.length === 0) return mixes;

  // Перемешиваем: миксы и треки с равной вероятностью
  for (let i = combined.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [combined[i], combined[j]] = [combined[j], combined[i]];
  }
  return combined;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const genre = searchParams.get("genre")?.trim();

    if (!genre) {
      return NextResponse.json(
        { error: "Missing required parameter: genre" },
        { status: 400 }
      );
    }

    const mixes = await searchMixesByGenre(genre);

    return NextResponse.json(mixes, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (error) {
    console.error("SoundCloud mixes API error:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch mixes from SoundCloud",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

