import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type BlacklistedStation = {
  name: string;
  tags: string[];
  genre: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { stations, genre }: { stations: BlacklistedStation[]; genre: string } = body;

    if (!Array.isArray(stations) || stations.length === 0) {
      return NextResponse.json({ stopWords: [] }, { status: 200 });
    }

    if (!process.env.OPENAI_API_KEY) {
      console.warn("OPENAI_API_KEY not configured, skipping AI analysis");
      return NextResponse.json({ stopWords: [] }, { status: 200 });
    }

    // Формируем список забаненных станций для анализа
    const stationList = stations
      .map((s) => `- "${s.name}" (tags: ${(s.tags || []).join(", ") || "none"})`)
      .join("\n");

    const prompt = `Проанализируй список радиостанций, которые были заблокированы пользователем для жанра "${genre}".

Заблокированные станции:
${stationList}

Определи общие паттерны в названиях и тегах этих станций, которые делают их неподходящими для жанра "${genre}".

Верни ТОЛЬКО JSON объект с массивом стоп-слов (stop words), которые нужно исключать из поиска для этого жанра.
Формат: { "stopWords": ["word1", "word2", "word3"] }

Примеры стоп-слов: "talk", "news", "pop", "country" (если они не подходят для жанра).

Верни только JSON, без дополнительного текста.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a music genre analysis assistant. Analyze blacklisted radio stations and return stop words as JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 200,
    });

    const responseText = completion.choices[0]?.message?.content || "{}";
    
    // Парсим JSON из ответа
    let result: { stopWords: string[] } = { stopWords: [] };
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
    }

    // Убеждаемся, что stopWords - это массив
    if (!Array.isArray(result.stopWords)) {
      result.stopWords = [];
    }

    console.log(`AI suggested ${result.stopWords.length} stop words for genre "${genre}":`, result.stopWords);

    return NextResponse.json(result);
  } catch (error) {
    console.error("AI blacklist analysis error:", error);
    return NextResponse.json({ stopWords: [] }, { status: 200 });
  }
}
