import Replicate from "replicate";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN ?? "",
  useFileOutput: false,
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function createPrompt(userAction: string) {
  const trimmed = userAction.trim() || "IDLE";
  return `${trimmed}. Instrumental, high quality, 8-bit textures, retro-game vibe, seamless background music.`;
}

export async function POST(request: NextRequest) {
  if (!process.env.REPLICATE_API_TOKEN) {
    return NextResponse.json(
      { error: "Missing Replicate token in environment" },
      { status: 500 }
    );
  }

  let body: { userAction?: string } = {};

  try {
    body = await request.json();
  } catch {
    // Allow empty body.
  }

  const prompt = await createPrompt(body.userAction ?? "IDLE");

  try {
    const prediction = await replicate.predictions.create({
      model: "minimax/music-1.5",
      input: {
        prompt,
        lyrics: "[Instrumental]",
      },
      wait: false,
    });

    let current = prediction;
    const startedAt = Date.now();
    const timeoutMs = 180000;

    while (
      current.status !== "succeeded" &&
      current.status !== "failed" &&
      current.status !== "canceled"
    ) {
      if (Date.now() - startedAt > timeoutMs) {
        return NextResponse.json(
          { error: "Generation timed out" },
          { status: 504 }
        );
      }
      await sleep(2000);
      current = await replicate.predictions.get(current.id);
    }

    if (current.status !== "succeeded") {
      return NextResponse.json(
        { error: current.error ?? "Generation failed" },
        { status: 502 }
      );
    }

    const normalizeUrl = (value: unknown): string | null => {
      if (!value) return null;
      if (typeof value === "string") return value;
      if (typeof value === "object") {
        if ("url" in value && typeof (value as { url?: unknown }).url === "string") {
          return (value as { url: string }).url;
        }
        if (
          "toString" in value &&
          typeof (value as { toString?: unknown }).toString === "function"
        ) {
          const asString = String(value);
          return asString.startsWith("http") ? asString : null;
        }
      }
      return null;
    };

    let url: string | null = null;
    if (Array.isArray(current.output)) {
      url = normalizeUrl(current.output[0]);
    } else {
      url = normalizeUrl(current.output);
    }

    if (!url) {
      return NextResponse.json(
        { error: "Model did not return any audio" },
        { status: 502 }
      );
    }

    return NextResponse.json({ url });
  } catch (error) {
    console.error("SERVER SIDE ERROR:", error);
    return NextResponse.json(
      { error: "Failed to generate music" },
      { status: 500 }
    );
  }
}
