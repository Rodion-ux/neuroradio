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

// Минимальная длительность микса: 3 минуты
const MIN_MIX_DURATION_MS = 3 * 60 * 1000;

async function getAccessToken(): Promise<string> {
  const clientId = process.env.SOUNDCLOUD_CLIENT_ID;
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

async function searchMixesByGenre(genre: string): Promise<MixResponseItem[]> {
  const accessToken = await getAccessToken();

  const params = new URLSearchParams({
    q: genre,
    // Используем genres вместо tags для более точного попадания
    genres: genre,
    limit: "50",
    linked_partitioning: "1",
  });

  const response = await fetch(`${SOUNDCLOUD_API_BASE}/tracks?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
    // Без кеша, но токен кешируется отдельно
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `SoundCloud tracks request failed: ${response.status} ${response.statusText} ${text}`
    );
  }

  const data = (await response.json()) as any;

  // Если SoundCloud вернул структуру ошибки, не пытаемся трактовать её как треки.
  if (data && (data.errors || data.error || data.status === "error")) {
    const message =
      (Array.isArray(data.errors) && data.errors[0]?.error_message) ||
      data.error ||
      "Unknown SoundCloud error";
    throw new Error(`SoundCloud API error: ${message}`);
  }

  // При linked_partitioning=1 треки находятся в поле collection.
  const rawTracks = data?.collection ?? [];
  if (!Array.isArray(rawTracks)) {
    console.warn("Unexpected SoundCloud tracks payload shape:", data);
    return [];
  }

  const tracks = rawTracks as SoundCloudTrack[];

  // Фильтруем только достаточно длинные миксы (>= 3 минут)
  const longMixes = tracks.filter(
    (track) =>
      typeof track.duration === "number" && track.duration >= MIN_MIX_DURATION_MS
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

  // Лёгкая рандомизация: перемещаем случайный микс из первых 10 в начало массива,
  // чтобы при каждом запросе первым был новый трек.
  if (mixes.length > 1) {
    const limit = Math.min(mixes.length, 10);
    const randomIndex = Math.floor(Math.random() * limit);
    if (randomIndex > 0) {
      const [randomTrack] = mixes.splice(randomIndex, 1);
      mixes.unshift(randomTrack);
    }
  }

  return mixes;
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

