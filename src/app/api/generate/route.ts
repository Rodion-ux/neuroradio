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

const isPlaylistUrl = (url: string): boolean => {
  const lower = url.toLowerCase();
  return lower.endsWith(".m3u") || lower.endsWith(".m3u8") || lower.endsWith(".pls") || lower.includes(".m3u?") || lower.includes(".pls?");
};

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
    if (isPlaylistUrl(url)) return false;
    return true;
  });

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

    const rawTag = typeof body.tag === "string" ? body.tag.trim() : "";
    const tag = rawTag.length ? rawTag.toLowerCase() : "lofi";
    const useRandomOrder = body.useRandomOrder === true;
    console.info("Radio stations requested for tag:", tag, "| randomOrder:", useRandomOrder);

    await ensureBaseUrl();
    const stations = await fetchSecureStationsForTag(tag, useRandomOrder);
    return NextResponse.json({ tag, stations });
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

const fetchSecureStationsForTag = async (tag: string, useRandomOrder = false) => {
  const MAX_ATTEMPTS = 3;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const stations = await withRetry(() => {
      const query = {
        tag,
        limit: 20,
        order: (useRandomOrder ? "random" : "clickCount") as const,
        reverse: !useRandomOrder,
        hideBroken: false,
        lastcheckok: 1,
      };
      return radioBrowser.searchStations(query as any);
    });
    const secure = normalizeStations(stations);
    if (secure.length) {
      console.info(
        `Found ${secure.length} HTTPS stations for tag ${tag} (attempt ${attempt})`
      );
      return secure;
    }
    console.warn(`No HTTPS streams found for tag ${tag} (attempt ${attempt})`);
  }

  const fallbackStations = await withRetry(() => {
    const query = {
      limit: 20,
      order: "votes" as const,
      reverse: true,
      hideBroken: false,
      lastcheckok: 1,
    };
    return radioBrowser.searchStations(query as any);
  });
  const secureFallback = normalizeStations(fallbackStations);
  if (secureFallback.length) {
    console.info(
      `Fallback returned ${secureFallback.length} HTTPS stations for tag ${tag}`
    );
    return secureFallback;
  }

  throw new NoStationsError(`No HTTPS stations available for tag "${tag}"`);
};
