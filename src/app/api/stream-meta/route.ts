import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const DEFAULT_TIMEOUT_MS = 7000;

const createStreamReader = (reader: ReadableStreamDefaultReader<Uint8Array>) => {
  let pending = new Uint8Array(0);

  const read = async (length: number) => {
    const output = new Uint8Array(length);
    let offset = 0;

    while (offset < length) {
      if (pending.length === 0) {
        const { done, value } = await reader.read();
        if (done || !value) {
          break;
        }
        const normalized = Buffer.from(value);
        pending = new Uint8Array(
          normalized.buffer as ArrayBuffer,
          normalized.byteOffset,
          normalized.byteLength
        );
      }

      const take = Math.min(pending.length, length - offset);
      output.set(pending.subarray(0, take), offset);
      pending = pending.subarray(take);
      offset += take;
    }

    return output.subarray(0, offset);
  };

  return { read };
};

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        "Icy-MetaData": "1",
        "User-Agent": "Neuro Radio",
      },
      signal: controller.signal,
    });

    const metaIntHeader = response.headers.get("icy-metaint");
    if (!metaIntHeader || !response.body) {
      return NextResponse.json({ title: null });
    }

    const metaInt = Number.parseInt(metaIntHeader, 10);
    if (!Number.isFinite(metaInt) || metaInt <= 0) {
      return NextResponse.json({ title: null });
    }

    const reader = response.body.getReader();
    const streamReader = createStreamReader(reader);

    const skipped = await streamReader.read(metaInt);
    if (skipped.length < metaInt) {
      await reader.cancel();
      return NextResponse.json({ title: null });
    }

    const lengthByte = await streamReader.read(1);
    if (lengthByte.length < 1) {
      await reader.cancel();
      return NextResponse.json({ title: null });
    }

    const metaLength = lengthByte[0] * 16;
    if (metaLength === 0) {
      await reader.cancel();
      return NextResponse.json({ title: null });
    }

    const metaBytes = await streamReader.read(metaLength);
    await reader.cancel();

    const metadata = new TextDecoder("utf-8").decode(metaBytes);
    const match = /StreamTitle='([^']*)'/.exec(metadata);
    const title = match?.[1]?.trim() ?? "";

    return NextResponse.json({ title: title.length ? title : null });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return NextResponse.json({ title: null });
    }
    console.error("STREAM META ERROR:", error);
    return NextResponse.json({ title: null });
  } finally {
    clearTimeout(timeout);
  }
}
