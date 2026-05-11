import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

let bibleCache: unknown = null;

async function loadBibles() {
  if (bibleCache) return bibleCache;

  const dataDir = path.join(process.cwd(), 'data');
  
  const loadFile = async (name: string) => {
    try {
      const filePath = path.join(dataDir, `${name}.json`);
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const cleanContent = fileContent.replace(/^\uFEFF/, '');
      return JSON.parse(cleanContent);
    } catch (e) {
      console.error(`Failed to load ${name}.json`, e);
      return null;
    }
  };

  const kjv = await loadFile('kjv');
  const asv = await loadFile('asv');
  const korean = await loadFile('korean');
  const greek = await loadFile('greek');
  const hebrew = await loadFile('hebrew'); // Note: Hebrew is flat mocked array
  const tr = await loadFile('tr');

  bibleCache = { kjv, asv, korean, greek, hebrew, tr };
  return bibleCache;
}

// Normalize thiagobodruk format into a map: "Genesis 1:1" -> "In the beginning..."
function createIndex(bibleJson: unknown, isFlat = false) {
  const index = new Map<string, string>();
  if (!bibleJson) return index;

  if (isFlat) {
    for (const row of bibleJson as Array<{book_name: string, chapter: string, verse: string, text: string}>) {
      const ref = `${row.book_name} ${row.chapter}:${row.verse}`;
      index.set(ref, row.text);
    }
  } else {
    for (const book of bibleJson as Array<{name: string, chapters: string[][]}>) {
      const bookName = book.name;
      book.chapters.forEach((chapterVerses: string[], cIdx: number) => {
        chapterVerses.forEach((text: string, vIdx: number) => {
          const ref = `${bookName} ${cIdx + 1}:${vIdx + 1}`;
          index.set(ref, text);
        });
      });
    }
  }
  return index;
}

type IndexesType = {
  kjv: Map<string, string>;
  asv: Map<string, string>;
  korean: Map<string, string>;
  greek: Map<string, string>;
  hebrew: Map<string, string>;
};

let indexCache: IndexesType | null = null;

async function getIndexes(): Promise<IndexesType> {
  if (indexCache) return indexCache;
  const bibles = await loadBibles() as { kjv: unknown; asv: unknown; korean: unknown; greek: unknown; hebrew: unknown; tr: unknown; };
  
  const greekMap = createIndex(bibles.greek, false);
  const trMap = createIndex(bibles.tr, true);
  for (const [ref, text] of trMap.entries()) {
    if (text && text.trim().length > 0) {
      greekMap.set(ref, text);
    }
  }

  indexCache = {
    kjv: createIndex(bibles.kjv, false),
    asv: createIndex(bibles.asv, true),
    korean: createIndex(bibles.korean, false),
    greek: greekMap,
    hebrew: createIndex(bibles.hebrew, true) // Mock was flat format
  };
  
  return indexCache;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { reference, keywords, page = 1, limit = 50 } = body;
    
    const indexes = await getIndexes();
    const results = [];
    const queryRefs = reference ? reference.split(',').map((r: string) => r.trim()).filter(Boolean) : [];

    type ParsedQuery = { qBook: string, qChap: string | null, qVerse: string | null, qVerseEnd: string | null };
    const parsedQueries = queryRefs.map((q: string) => {
      const match = q.match(/^(.+?)(?:\s+(\d[\d:\-]*))?$/);
      if (!match) return null;
      const qBook = match[1].toLowerCase().trim();
      const cvPart = match[2];
      let qChap = null, qVerse = null, qVerseEnd = null;
      if (cvPart) {
        if (cvPart.includes(':')) {
          const [c, v] = cvPart.split(':');
          qChap = c;
          if (v.includes('-')) {
            [qVerse, qVerseEnd] = v.split('-');
          } else {
            qVerse = v;
          }
        } else {
          qChap = cvPart;
        }
      }
      return { qBook, qChap, qVerse, qVerseEnd } as ParsedQuery;
    }).filter(Boolean) as ParsedQuery[];

    const allMatches: string[] = [];

    for (const [ref, text] of indexes.asv.entries()) {
      let match = true;

      // Reference Matching
      if (parsedQueries.length > 0) {
        match = false;
        const refLastSpace = ref.lastIndexOf(' ');
        const refBook = ref.substring(0, refLastSpace).toLowerCase();
        const refCV = ref.substring(refLastSpace + 1);
        const [refChap, refVerse] = refCV.split(':');

        for (const qObj of parsedQueries) {
          if (refBook.startsWith(qObj.qBook) || refBook.replace(/\s+/g, '').startsWith(qObj.qBook.replace(/\s+/g, ''))) {
            if (!qObj.qChap) { match = true; break; }
            if (refChap === qObj.qChap) {
              if (!qObj.qVerse) { match = true; break; }
              if (!qObj.qVerseEnd) {
                if (refVerse === qObj.qVerse) { match = true; break; }
              } else {
                const vNum = parseInt(refVerse, 10);
                const startV = parseInt(qObj.qVerse, 10);
                const endV = parseInt(qObj.qVerseEnd, 10);
                if (vNum >= startV && vNum <= endV) { match = true; break; }
              }
            }
          }
        }
      }

      // Keyword Matching
      if (match && keywords) {
        if (keywords.asv && !text.toLowerCase().includes(keywords.asv.toLowerCase())) match = false;
        
        if (match && keywords.kjv) {
          const kjvText = indexes.kjv.get(ref) || '';
          if (!kjvText.toLowerCase().includes(keywords.kjv.toLowerCase())) match = false;
        }
        if (match && keywords.korean) {
          const korText = indexes.korean.get(ref) || '';
          if (!korText.includes(keywords.korean)) match = false;
        }
        if (match && keywords.hebrew) {
          const hebText = indexes.hebrew.get(ref) || '';
          if (!hebText.includes(keywords.hebrew)) match = false;
        }
        if (match && keywords.greek) {
          const grkText = indexes.greek.get(ref) || '';
          if (!grkText.includes(keywords.greek)) match = false;
        }
      }

      if (match) {
        allMatches.push(ref);
      }
    }

    const totalMatches = allMatches.length;
    const skipCount = (page - 1) * limit;
    const paginatedRefs = allMatches.slice(skipCount, skipCount + limit);

    for (const ref of paginatedRefs) {
      results.push({
        reference: ref,
        kjv: { text: indexes.kjv.get(ref) || 'N/A' },
        asv: { text: indexes.asv.get(ref) || 'N/A' },
        korean: { text: indexes.korean.get(ref) || 'N/A' },
        hebrew: { text: indexes.hebrew.get(ref) || 'N/A' },
        greek: { text: indexes.greek.get(ref) || 'N/A' }
      });
    }

    return NextResponse.json({ results, totalMatches });
  } catch (error: unknown) {
    console.error(error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
