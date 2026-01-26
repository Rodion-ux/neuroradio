type VibeMapEntry = {
  regex: RegExp;
  genres: string[];
};

const VIBE_MAP: VibeMapEntry[] = [
  {
    // INTIMATE & ROMANCE
    regex: /(секс|sex|любов|love|свидани|date|романт|nezhno|нежно|страсть|passion|kiss|поцелуй|обнима|hugs|couple|пара|отношени|heart|сердце|candle|свечи|wine|вино|вечер вдвоем)/i,
    genres: ['rnb', 'smooth jazz', 'soul', 'slow jam', 'lofi sex', 'blues', 'sexual vibe', 'chill r&b']
  },
  {
    // AGGRESSION & RAGE
    regex: /(руга|ссор|зло|angry|mad|fuck|bitch|fight|драка|крич|scream|бесит|hate|ненавиж|stress|стресс|rage|ярость|burnout|выгорел|panick|паника|kill|destroy|разруш|break|сломал)/i,
    genres: ['hardstyle', 'metal', 'breakcore', 'industrial', 'aggrotech', 'screamo', 'phonk drift', 'doom metal', 'gabber']
  },
  {
    // HARD WORK & CODING
    regex: /(разраб|код|code|coding|dev|it|прога|script|скрипт|верст|css|html|js|react|next|node|tilda|тильд|лендинг|landing|сайт|web|figma|фигма|дизайн|design|ui|ux|макет|crm|црм|эксель|excel|table|таблиц|отчет|report|office|офис|work|работ|job|business|бизнес|meeting|митинг|zoom|зум|стартап|startup|bug|баг|debug|deploy|деплой)/i,
    genres: ['lofi coding', 'deep house', 'minimal techno', 'focus', 'idm', 'ambient', 'brain food', 'dub techno', 'liquid dnb']
  },
  {
    // SPORT & POWER
    regex: /(спорт|sport|зал|gym|train|тренир|бег|run|jogging|кач|fitness|фитнес|workout|воркаут|power|сила|crossfit|кроссфит|cardio|кардио|bicep|бицепс|fight|boxing|бокс|swim|бассейн|football|футбол|active|активн)/i,
    genres: ['gym phonk', 'hardstyle', 'drum and bass', 'neurofunk', 'bass house', 'workout', 'high energy', 'rock', 'metalcore']
  },
  {
    // RELAX & SLEEP
    regex: /(сплю|спать|сон|sleep|bed|кровать|постель|nap|дрема|отдых|rest|чил|chill|relax|релакс|lazy|лень|диван|sofa|couch|tv|телик|netflix|youtube|ютуб|book|книг|читаю|read|meditat|медитац|yoga|йога|bath|ванна|shower|душ|tea|чай)/i,
    genres: ['ambient', 'nature sounds', 'soft piano', 'sleep', 'downtempo', 'meditation', 'healing', 'spa', 'chillout']
  },
  {
    // SADNESS & MELANCHOLY
    regex: /(груст|sad|cry|плач|слез|tear|alone|один|lonely|одинок|pain|боль|расста|breakup|бросил|miss|скуча|nostalg|ностальг|rain|дождь|autumn|осень|grey|серый|dark|темно|depress|депресс|устал|tired)/i,
    genres: ['sad piano', 'acoustic', 'slowcore', 'melancholy', 'sad lofi', 'indie folk', 'post-rock', 'blues']
  },
  {
    // HOUSEHOLD & CHORES
    regex: /(уборк|убира|clean|мыть|wash|посуд|dishes|готов|cook|kitchen|кухн|food|еда|eat|куша|жрать|cleaning|chores|home|дом|быт|глаж|ironing|repair|ремонт|shop|магазин|grocer|продукты)/i,
    genres: ['disco', 'funk', 'pop', 'dance', 'motown', 'house', 'indie pop', 'retro pop', 'classic rock']
  },
  {
    // COMMUTE & TRAVEL
    regex: /(еду|drive|руль|wheel|car|машин|auto|авто|road|дорог|way|путь|trip|travel|путешеств|metro|метро|subway|bus|автобус|train|поезд|fly|лечу|plane|самолет|airport|аэропорт|walk|гуля|прогулк|street|улиц|traffic|пробк)/i,
    genres: ['synthwave', 'retrowave', 'vaporwave', 'indie', 'night drive', 'road trip', 'soft rock', 'alternative']
  },
  {
    // PARTY & SOCIAL
    regex: /(туса|party|dance|танц|drink|пить|алко|beer|пиво|wine|вино|club|клуб|bar|бар|drunk|пьян|friends|друзья|birthday|др|рождени|holiday|праздник|weekend|выходн|friday|пятниц)/i,
    genres: ['house', 'techno', 'edm', 'club', 'pop remix', 'hip hop', 'rnb party', 'dance', 'bass']
  },
  {
    // GAMING
    regex: /(игра|play|game|steam|стим|dota|дота|cs|кс|pubg|пабг|пвп|pvp|quest|квест|rpg|рпг|console|консол|ps5|xbox|nintendo|switch|league|лига|rank|ранк)/i,
    genres: ['chiptune', '8-bit', 'retro game', 'video game music', 'synthwave', 'dubstep', 'glitch hop']
  }
];

const GENRE_ALIASES: Array<{ tag: string; aliases: string[] }> = [
  { tag: "phonk", aliases: ["phonk", "фонк"] },
  { tag: "hardstyle", aliases: ["hardstyle", "хардстайл"] },
  { tag: "metal", aliases: ["metal", "метал", "металл"] },
  { tag: "psytrance", aliases: ["psytrance", "псайтранс", "психотренс"] },
  { tag: "dubstep", aliases: ["dubstep", "дабстеп", "дубстеп"] },
  { tag: "drum and bass", aliases: ["drum and bass", "drumandbass", "dnb", "днб", "драм энд бейс"] },
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

export const getGenreFromText = (text: string): { genre: string; category: string } => {
  const normalized = normalizeInput(text);

  // Step 1: Search in VIBE_MAP
  const categoryNames = [
    "INTIMATE_ROMANCE",
    "AGGRESSION_RAGE",
    "HARD_WORK_CODING",
    "SPORT_POWER",
    "RELAX_SLEEP",
    "SADNESS_MELANCHOLY",
    "HOUSEHOLD_CHORES",
    "COMMUTE_TRAVEL",
    "PARTY_SOCIAL",
    "GAMING"
  ];

  for (let i = 0; i < VIBE_MAP.length; i++) {
    const vibeEntry = VIBE_MAP[i];
    if (vibeEntry.regex.test(normalized)) {
      const genre = pickRandom(vibeEntry.genres);
      return {
        genre,
        category: categoryNames[i] || "MATCHED"
      };
    }
  }

  // Step 2: Smart Cleaner - remove stop words
  const stopWords = ['занимаюсь', 'делаю', 'сижу', 'лежу', 'пошел', 'иду', 'хочу', 'сейчас', 'просто', 'пытаюсь', 'doing', 'trying', 'going'];
  let cleanText = normalized;
  stopWords.forEach(word => {
    cleanText = cleanText.replace(new RegExp(`\\b${word}\\b`, 'gi'), '');
  });
  cleanText = cleanText.replace(/\s+/g, ' ').trim();

  // Step 3: Fallback - find longest word > 3 characters
  const words = cleanText.split(" ").filter((word) => word.length > 3);
  if (words.length > 0) {
    const longestWord = words.reduce(
      (longest, word) => (word.length > longest.length ? word : longest),
      ""
    );
    return {
      genre: longestWord,
      category: "FALLBACK"
    };
  }

  // Final fallback: LOFI
  return {
    genre: "lofi",
    category: "FALLBACK"
  };
};

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

  // 2. Use getGenreFromText for semantic analysis
  const { genre, category } = getGenreFromText(original);
  
  console.log(
    `[Radio Engine] Original: "${original}" | Category: ${category} | Genre: ${genre}`
  );

  return {
    category,
    genre,
    tag: genre, // Always use genre for both UI and API
    useRandomOrder: category !== "FALLBACK", // Use random order for vibe-matched genres
  };
};
