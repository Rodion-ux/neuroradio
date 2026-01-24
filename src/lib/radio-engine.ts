type VibeCategory = {
  keywords: string[];
  genres: string[];
};

const VIBE_MAP: Record<string, VibeCategory> = {
  STUDY: {
    keywords: [
      "учусь",
      "экзамен",
      "отчет",
      "диплом",
      "дедлайн",
      "концентрация",
      "study",
      "exam",
    ],
    genres: ["ambient", "lofi", "focus", "classical"],
  },
  WORK: {
    keywords: [
      "работа",
      "офис",
      "звонок",
      "почта",
      "задачи",
      "созвон",
      "work",
      "office",
    ],
    genres: ["lounge", "deep house", "jazzhop", "downtempo"],
  },
  CHORES: {
    keywords: [
      "уборка",
      "готовлю",
      "душ",
      "дела",
      "дома",
      "быт",
      "cleaning",
      "cooking",
    ],
    genres: ["funk", "disco", "pop", "electro house"],
  },
  SPORT: {
    keywords: [
      "зал",
      "качаюсь",
      "бег",
      "тренировка",
      "фитнес",
      "спорт",
      "gym",
      "workout",
    ],
    genres: ["phonk", "techno", "drum and bass", "hardstyle"],
  },
  GAMING: {
    keywords: [
      "играю",
      "катка",
      "стрим",
      "квест",
      "гейминг",
      "win",
      "game",
      "play",
    ],
    genres: ["chiptune", "8-bit", "future bass", "synth-pop"],
  },
  TRANSIT: {
    keywords: ["еду", "машина", "метро", "прогулка", "дорога", "night", "drive", "car"],
    genres: ["synthwave", "retrowave", "dark wave", "vaporwave"],
  },
  RELAX: {
    keywords: ["отдых", "вечер", "устал", "лежу", "ванна", "чилл", "relax", "chill"],
    genres: ["soul", "smooth jazz", "bossa nova", "chillout"],
  },
  ZEN: {
    keywords: ["сон", "медитация", "тишина", "грущу", "засыпаю", "sleep", "zen"],
    genres: ["dark ambient", "drone", "sleep", "nature"],
  },
};

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

  for (const [category, config] of Object.entries(VIBE_MAP)) {
    if (config.keywords.some((keyword) => normalized.includes(keyword))) {
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
