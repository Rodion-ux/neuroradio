type VibeRule = {
  keywords: string[];
  tags: string[];
};

const VIBE_RULES: VibeRule[] = [
  {
    keywords: [
      "work",
      "coding",
      "code",
      "study",
      "focus",
      "office",
      "design",
      "работ",
      "код",
      "программ",
      "учеб",
      "учёб",
      "учусь",
      "проект",
    ],
    tags: ["lofi", "ambient", "focus"],
  },
  {
    keywords: ["game", "gaming", "retro", "arcade", "dendy", "денди", "игр", "ретро"],
    tags: ["chiptune", "8-bit", "retrogame"],
  },
  {
    keywords: [
      "energy",
      "drive",
      "electro",
      "sport",
      "workout",
      "run",
      "gym",
      "энерг",
      "драйв",
      "спорт",
      "трен",
    ],
    tags: ["techno", "synthwave", "electro"],
  },
  {
    keywords: [
      "rest",
      "sleep",
      "chill",
      "relax",
      "relaxing",
      "calm",
      "отдых",
      "сон",
      "чилл",
    ],
    tags: ["chillout", "downtempo", "jazz"],
  },
];

const DIRECT_TAGS: Record<string, string> = {
  "lofi": "lofi",
  "lo-fi": "lofi",
  "chiptune": "chiptune",
  "synthwave": "synthwave",
  "ambient": "ambient",
  "techno": "techno",
  "retro game": "retrogame",
  "retrogame": "retrogame",
  "jazz": "jazz",
  "piano": "piano",
  "hip-hop": "hiphop",
  "hip hop": "hiphop",
  "hiphop": "hiphop",
  "dnb": "dnb",
  "8-bit": "8-bit",
  "8 bit": "8-bit",
};

const normalizeTag = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim();

export const getStationByVibe = (userInput: string) => {
  const normalized = normalizeTag(userInput);
  if (!normalized) return "lofi";

  if (DIRECT_TAGS[normalized]) {
    return DIRECT_TAGS[normalized];
  }

  for (const rule of VIBE_RULES) {
    if (rule.keywords.some((keyword) => normalized.includes(keyword))) {
      const choice = rule.tags[Math.floor(Math.random() * rule.tags.length)];
      return choice;
    }
  }

  return normalized;
};

export const sanitizeTag = (value: string) => {
  const normalized = normalizeTag(value);
  return DIRECT_TAGS[normalized] ?? normalized;
};
