import { NextResponse } from 'next/server';
import Replicate from 'replicate';

export const runtime = "nodejs";

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

export async function POST(req: Request) {
  let lang = 'en'; // Default language
  try {
    const body = await req.json();
    const { text, lang: requestLang = 'en' } = body;
    lang = requestLang;
    console.log("Sending to AI:", text, "lang:", lang);

    const isRussian = lang === 'ru';
    const languageInstruction = isRussian 
      ? "Если lang === 'ru', пиши пояснение на русском."
      : "If lang === 'en', write the explanation in English.";

    // Настройка строго по документации модели openai/gpt-4.1-mini
    const input = {
      // Роль и правила задаем в system_prompt
      system_prompt: `Ты — AI DJ. Проанализируй ввод пользователя. Верни ТОЛЬКО JSON объект: { "genre": "string", "reasoning": "string" }.

Поле reasoning — это очень короткое (до 10 слов) и стильное пояснение, почему выбран этот жанр.

ВАЖНО: ${languageInstruction}

Выбери жанр из списка: [lofi, deep house, phonk, techno, drum and bass, jazz, rock, ambient, synthwave, hip hop, disco, classical, metal, soul, pop].

Правила:
- Anger -> 'hardstyle'
- Focus -> 'lofi'
- Sleep -> 'ambient'
- Gym -> 'phonk'
- Nonsense -> 'random'`,
      
      // Сам запрос пользователя
      prompt: `User input: "${text}". Return JSON:`
    };

    // Используем run (чтобы получить ответ целиком, а не стримом)
    const output = await replicate.run("openai/gpt-4.1-mini", { input });

    // Собираем ответ (обычно приходит массив строк или строка)
    let rawResponse = '';
    if (Array.isArray(output)) {
      rawResponse = output.join('').trim();
    } else {
      rawResponse = String(output).trim();
    }

    console.log("AI Raw Response:", rawResponse);

    // Пытаемся распарсить JSON
    let result: { genre: string; reasoning: string } = { genre: "lofi", reasoning: "" };
    
    try {
      // Ищем JSON в ответе (модель может добавить текст до/после JSON)
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        // Если JSON не найден, пытаемся извлечь жанр из текста
        const genreMatch = rawResponse.match(/"genre"\s*:\s*"([^"]+)"/i) || 
                          rawResponse.match(/genre["\s:]+([a-z\s]+)/i);
        if (genreMatch) {
          result.genre = genreMatch[1].trim().toLowerCase();
        }
      }
    } catch (parseError) {
      console.error("JSON parse error, trying to extract genre:", parseError);
      // Fallback: пытаемся извлечь жанр из текста
      const genreMatch = rawResponse.match(/"genre"\s*:\s*"([^"]+)"/i) || 
                        rawResponse.match(/genre["\s:]+([a-z\s]+)/i);
      if (genreMatch) {
        result.genre = genreMatch[1].trim().toLowerCase();
      }
    }

    // Чистка genre (одно слово, без точек и лишних символов)
    result.genre = result.genre
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .toLowerCase()
      .split(' ')[0] // Берем только первое слово
      .trim() || "lofi";

    // Если reasoning пустое, генерируем дефолтное
    if (!result.reasoning || result.reasoning.trim().length === 0) {
      result.reasoning = isRussian 
        ? "Подобрано под настроение"
        : "Matched to your vibe";
    }

    console.log("AI Parsed Result:", result);

    return NextResponse.json({ 
      genre: result.genre,
      reasoning: result.reasoning.trim()
    });
  } catch (error) {
    console.error("AI API Error:", error);
    const isRussian = lang === 'ru';
    return NextResponse.json({ 
      genre: "lofi",
      reasoning: isRussian ? "Подобрано под настроение" : "Matched to your vibe"
    }, { status: 500 });
  }
}
