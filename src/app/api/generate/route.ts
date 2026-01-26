import { RadioBrowserApi } from "radio-browser-api";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type Station = {
  id: string;
  name: string;
  url?: string;
  urlResolved: string;
  tags: string[];
  favicon?: string;
  country?: string;
  codec?: string;
};

const radioBrowser = new RadioBrowserApi("Neuro Radio", true);

const ensureBaseUrl = async () => {
  if (!radioBrowser.getBaseUrl()) {
    await radioBrowser.resolveBaseUrl();
  }
};

const withRetry = async <T>(operation: () => Promise<T>): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    console.warn("RadioBrowser call failed, refreshing server.", error);
    await radioBrowser.resolveBaseUrl();
    return await operation();
  }
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

const normalizeStations = (stations: Station[]) => {
  const filtered = stations.filter((station) => {
    const url = station.urlResolved || station.url;
    if (!url) return false;
    if (!isHttpsUrl(url)) return false;
    return true;
  });

  console.log("Found stations after HTTPS filter:", filtered.length);

  const withFormat = filtered.map((station) => ({
    station,
    format: getStreamFormat(station.urlResolved || station.url || ""),
    isMp3: getStreamFormat(station.urlResolved || station.url || "") === "mp3",
  }));

  const sorted = withFormat.sort((a, b) => {
    if (a.isMp3 && !b.isMp3) return -1;
    if (!a.isMp3 && b.isMp3) return 1;
    return 0;
  });

  return sorted.map(({ station }) => ({
    id: station.id,
    name: station.name,
    urlResolved: station.urlResolved || station.url || "",
    tags: station.tags,
    favicon: station.favicon,
    country: station.country,
  }));
};

class NoStationsError extends Error {}

export async function POST(request: NextRequest) {
  let body: { tag?: string; useRandomOrder?: boolean } = {};

  try {
    body = await request.json();
  } catch {
    // Allow empty body.
  }

  try {
    await ensureBaseUrl();

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
    const stations = await fetchSecureStationsForTag(displayTag, useRandomOrder);
    
    // Запрещаем кеширование
    return NextResponse.json(
      { tag: displayTag, stations },
      {
        headers: {
          'Cache-Control': 'no-store',
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

const normalizeTagForSearch = (tag: string): string => {
  const tagMap: Record<string, string> = {
    "dnb": "drum and bass",
    "lo-fi": "lofi",
    "lofi": "lofi",
    "hip-hop": "hip hop",
    "hiphop": "hip hop",
    "k-pop": "k-pop",
    "kpop": "k-pop",
    "j-pop": "j-pop",
    "jpop": "j-pop",
    "retro game": "chiptune",
  };
  return tagMap[tag.toLowerCase()] || tag;
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
  };
  return fallbackMap[tag.toLowerCase()] || null;
};

const fetchSecureStationsForTag = async (tag: string, useRandomOrder = false) => {
  // Normalize tag for search (e.g., "dnb" -> "drum and bass")
  const normalizedTag = normalizeTagForSearch(tag);
  
  const stations = await withRetry(() => {
    const query = {
      tag: normalizedTag,
      limit: 30,
      order: (useRandomOrder ? "random" : "clickCount") as any,
      reverse: !useRandomOrder,
      hideBroken: false,
      lastcheckok: 1,
    };
    return radioBrowser.searchStations(query as any);
  });
  
  const secure = normalizeStations(stations as Station[]);
  
  if (secure.length) {
    console.info(`Found ${secure.length} HTTPS stations for tag ${normalizedTag} (original: ${tag})`);
    return secure;
  }

  // Try fallback tag (use original tag for fallback lookup)
  const fallbackTag = getFallbackTag(tag);
  if (fallbackTag) {
    const normalizedFallback = normalizeTagForSearch(fallbackTag);
    console.info(`Trying fallback tag "${normalizedFallback}" for "${tag}"`);
    const fallbackStations = await withRetry(() => {
      const query = {
        tag: normalizedFallback,
        limit: 30,
        order: (useRandomOrder ? "random" : "clickCount") as any,
        reverse: !useRandomOrder,
        hideBroken: false,
        lastcheckok: 1,
      };
      return radioBrowser.searchStations(query as any);
    });
    const secureFallback = normalizeStations(fallbackStations as Station[]);
    if (secureFallback.length) {
      console.info(`Found ${secureFallback.length} HTTPS stations for fallback tag ${normalizedFallback}`);
      return secureFallback;
    }
  }

  throw new NoStationsError(`No HTTPS stations available for tag "${tag}"`);
};
