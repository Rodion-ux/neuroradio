import { RadioBrowserApi } from "radio-browser-api";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type Station = {
  id: string;
  name: string;
  urlResolved: string;
  tags: string[];
  favicon?: string;
  country?: string;
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

const normalizeStations = (stations: Station[]) =>
  stations
    .filter((station) => isHttpsUrl(station.urlResolved))
    .map((station) => ({
      id: station.id,
      name: station.name,
      urlResolved: station.urlResolved,
      tags: station.tags,
      favicon: station.favicon,
      country: station.country,
    }));

class NoStationsError extends Error {}

export async function POST(request: NextRequest) {
  let body: { tag?: string } = {};

  try {
    body = await request.json();
  } catch {
    // Allow empty body.
  }

  try {
    await ensureBaseUrl();

    const rawTag = typeof body.tag === "string" ? body.tag.trim() : "";
    const tag = rawTag.length ? rawTag.toLowerCase() : "lofi";
    console.info("Radio stations requested for tag:", tag);

    await ensureBaseUrl();
    const stations = await fetchSecureStationsForTag(tag);
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

const fetchSecureStationsForTag = async (tag: string) => {
  const MAX_ATTEMPTS = 3;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const stations = await withRetry(() => {
      const query = {
        tag,
        limit: 20,
        order: "clickCount" as const,
        reverse: true,
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

  const fallbackStations = await withRetry(() =>
    radioBrowser.getStationsByVotes(20)
  );
  const secureFallback = normalizeStations(fallbackStations);
  if (secureFallback.length) {
    console.info(
      `Fallback returned ${secureFallback.length} HTTPS stations for tag ${tag}`
    );
    return secureFallback;
  }

  throw new NoStationsError(`No HTTPS stations available for tag "${tag}"`);
};
