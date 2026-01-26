type SemanticCategory = {
  pattern: RegExp;
  genres: string[];
};

const SEMANTIC_CATEGORIES: Record<string, SemanticCategory> = {
  HOUSEHOLD: {
    pattern:
      /(уборка|убираю|мою|посуда|готовлю|кухня|глажу|ремонт|быт|cleaning|cooking|chores|kitchen)/i,
    genres: ["disco", "funk", "pop", "house", "motown", "indie pop"],
  },
  STUDY_READ: {
    pattern:
      /(уроки|учусь|читаю|книга|экзамен|сессия|дз|study|reading|homework|book|library)/i,
    genres: ["classical", "baroque", "piano", "soundtrack", "ambient", "light jazz"],
  },
  COMMUTE: {
    pattern:
      /(еду|метро|автобус|пробка|маршрутка|пешком|иду|гуляю|дорога|commute|traffic|bus|walk|subway)/i,
    genres: ["lofi", "indie", "alternative", "shoegaze", "synthwave"],
  },
  PARTY_SOCIAL: {
    pattern:
      /(туса|вечеринка|гости|бухаю|пью|танцы|пятница|др|party|drink|dance|club|friends)/i,
    genres: ["house", "techno", "hip hop", "rnb", "dance", "edm"],
  },
  ROMANCE: {
    pattern:
      /(свидание|любовь|секс|ужин|романтика|date|love|romantic|dinner|candle)/i,
    genres: ["rnb", "soul", "smooth jazz", "bossa nova", "blues"],
  },
  MOOD_SAD: {
    pattern:
      /(грустно|плохо|депрессия|дождь|одиноко|sad|cry|lonely|rain|blue)/i,
    genres: ["indie folk", "sad piano", "acoustic", "slowcore", "post-rock"],
  },
  WORK_OFFICE: {
    pattern: /(офис|работа|отчет|эксель|письма|клиенты|office|work|excel|mail)/i,
    genres: ["lounge", "chillout", "soft house", "deep house"],
  },
};

const GENRE_ALIASES: Array<{ tag: string; aliases: string[] }> = [
  { tag: "phonk", aliases: ["phonk", "фонк"] },
  { tag: "hardstyle", aliases: ["hardstyle", "хардстайл"] },
  { tag: "metal", aliases: ["metal", "метал", "металл"] },
  { tag: "psytrance", aliases: ["psytrance", "псайтранс", "психотренс"] },
  { tag: "dubstep", aliases: ["dubstep", "дабстеп", "дубстеп"] },
  { tag: "liquid dnb", aliases: ["liquid dnb", "liquid drum and bass"] },
  { tag: "post-rock", aliases: ["post-rock", "post rock", "построк"] },
  { tag: "deep house", aliases: ["deep house", "deep-house"] },
  { tag: "progressive", aliases: ["progressive", "прогрессив"] },
  { tag: "vaporwave", aliases: ["vaporwave", "вейпорвейв"] },
  { tag: "city pop", aliases: ["city pop", "citypop", "сити поп"] },
  { tag: "dark ambient", aliases: ["dark ambient", "darkambient", "дарк эмбиент"] },
  { tag: "k-pop", aliases: ["k-pop", "k pop", "kpop", "кей поп", "кейпоп"] },
  { tag: "j-pop", aliases: ["j-pop", "j pop", "jpop", "джей поп", "джейпоп"] },
  { tag: "indie", aliases: ["indie", "инди"] },
  { tag: "reggae", aliases: ["reggae", "регги"] },
  { tag: "blues", aliases: ["blues", "блюз"] },
  { tag: "soul", aliases: ["soul", "соул"] },
  { tag: "funk", aliases: ["funk", "фанк"] },
  { tag: "classical", aliases: ["classical", "классика"] },
  { tag: "bossa nova", aliases: ["bossa nova", "bossanova", "босса нова"] },
];

const normalizeInput = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, " ")
    .trim();

const pickRandom = (items: string[]) =>
  items[Math.floor(Math.random() * items.length)];

export const processTextInput = (input: string) => {
  const original = input;
  const normalized = normalizeInput(input);
  const words = normalized.split(" ").filter(Boolean);

  // 1. Direct genre match (user explicitly typed a genre name)
  const directGenre = GENRE_ALIASES.find(({ aliases }) =>
    aliases.some((alias) => {
      if (alias.includes(" ") || alias.includes("-")) {
        return normalized.includes(alias);
      }
      return words.includes(alias);
    })
  );

  if (directGenre) {
    console.log(
      `[Radio Engine] Original: "${original}" | Category: DIRECT | Genre: ${directGenre.tag}`
    );
    return {
      category: "DIRECT",
      genre: directGenre.tag,
      tag: directGenre.tag,
      useRandomOrder: false,
    };
  }

  // 2. Semantic category match via regex patterns
  for (const [category, config] of Object.entries(SEMANTIC_CATEGORIES)) {
    if (config.pattern.test(normalized)) {
      const genre = pickRandom(config.genres);
      console.log(
        `[Radio Engine] Original: "${original}" | Category: ${category} | Genre: ${genre}`
      );
      return {
        category,
        genre,
        tag: genre,
        useRandomOrder: true,
      };
    }
  }

  // 3. Fallback: use the longest word as a direct tag
  const fallback = words.reduce(
    (longest, word) => (word.length > longest.length ? word : longest),
    ""
  );

  const finalTag = fallback || "lofi";
  console.log(
    `[Radio Engine] Original: "${original}" | Category: FALLBACK | Genre: ${finalTag}`
  );

  return {
    category: "FALLBACK",
    genre: finalTag,
    tag: finalTag,
    useRandomOrder: false,
  };
};
