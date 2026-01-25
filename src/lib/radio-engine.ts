type VibeCategory = {
  keywords: string[];
  genres: string[];
};

const VIBE_MAP: Record<string, VibeCategory> = {
  GRIND: {
    keywords: [
      "ебашу",
      "hard work",
      "дедлайн",
      "grind",
      "фигачу",
      "аврал",
      "скорость",
      "burnout",
    ],
    genres: ["techno", "phonk", "hardstyle", "industrial", "metal"],
  },
  FOCUS: {
    keywords: [
      "код",
      "дебаг",
      "логика",
      "пишу",
      "отчет",
      "crm",
      "focus",
      "study",
      "учеба",
    ],
    genres: ["minimal techno", "deep house", "liquid dnb", "ambient"],
  },
  CREATIVE: {
    keywords: [
      "дизайн",
      "арт",
      "фигма",
      "figma",
      "рендер",
      "voxel",
      "3d",
      "creative",
    ],
    genres: ["chillout", "downtempo", "lofi", "future garage"],
  },
  ACTION: {
    keywords: [
      "зал",
      "уборка",
      "бег",
      "тренировка",
      "gym",
      "workout",
      "дела",
      "активно",
    ],
    genres: ["drum and bass", "bass house", "electro house", "energy"],
  },
  RELAX: {
    keywords: [
      "отдых",
      "вечер",
      "устал",
      "лежу",
      "ванна",
      "чилл",
      "relax",
      "chill",
    ],
    genres: ["soul", "smooth jazz", "bossa nova", "lounge"],
  },
  GAMING: {
    keywords: ["играю", "катка", "квест", "турнир", "стрим", "play", "gaming"],
    genres: ["chiptune", "8-bit", "future bass", "synth-pop"],
  },
  NIGHT_DRIVE: {
    keywords: ["еду", "машина", "ночь", "дорога", "night", "drive", "car"],
    genres: ["synthwave", "vaporwave", "dark wave", "retrowave"],
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
  const normalized = normalizeInput(input);
  const words = normalized.split(" ").filter(Boolean);

  const directGenre = GENRE_ALIASES.find(({ aliases }) =>
    aliases.some((alias) => {
      if (alias.includes(" ") || alias.includes("-")) {
        return normalized.includes(alias);
      }
      return words.includes(alias);
    })
  );

  if (directGenre) {
    return {
      category: "DIRECT",
      genre: directGenre.tag,
      tag: directGenre.tag,
    };
  }

  for (const [category, config] of Object.entries(VIBE_MAP)) {
    const exactMatch = config.keywords.some((keyword) => {
      if (keyword.includes(" ")) {
        return normalized.includes(keyword);
      }
      return words.includes(keyword);
    });
    if (exactMatch) {
      const genre = pickRandom(config.genres);
      return {
        category,
        genre,
        tag: genre,
      };
    }
  }

  for (const [category, config] of Object.entries(VIBE_MAP)) {
    const partialMatch = config.keywords.some((keyword) => {
      if (keyword.includes(" ")) {
        return false;
      }
      return words.some((word) => word.includes(keyword));
    });
    if (partialMatch) {
      const genre = pickRandom(config.genres);
      return {
        category,
        genre,
        tag: genre,
      };
    }
  }

  const fallback = words.reduce(
    (longest, word) => (word.length > longest.length ? word : longest),
    ""
  );

  return {
    category: "DIRECT",
    genre: fallback || "lofi",
    tag: fallback || "lofi",
  };
};
