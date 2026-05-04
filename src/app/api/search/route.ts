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
  const korean = await loadFile('korean');
  const greek = await loadFile('greek');
  const hebrew = await loadFile('hebrew'); // Note: Hebrew is flat mocked array

  bibleCache = { kjv, korean, greek, hebrew };
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
  korean: Map<string, string>;
  greek: Map<string, string>;
  hebrew: Map<string, string>;
};

let indexCache: IndexesType | null = null;

async function getIndexes(): Promise<IndexesType> {
  if (indexCache) return indexCache;
  const bibles = await loadBibles() as { kjv: unknown; korean: unknown; greek: unknown; hebrew: unknown; };
  
  indexCache = {
    kjv: createIndex(bibles.kjv, false),
    korean: createIndex(bibles.korean, false),
    greek: createIndex(bibles.greek, false),
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

    let skipped = 0;
    const skipCount = (page - 1) * limit;

    for (const [ref, text] of indexes.kjv.entries()) {
      let match = true;

      // Reference Matching
      if (queryRefs.length > 0) {
        match = false;
        const idxLower = ref.toLowerCase();
        for (const q of queryRefs) {
          const qLower = q.toLowerCase();
          if (idxLower === qLower) {
            match = true; break;
          }
          if (idxLower.startsWith(qLower)) {
            const nextChar = idxLower[qLower.length];
            if (!nextChar || nextChar === ':' || nextChar === ' ') {
              match = true; break;
            }
          }
        }
      }

      // Keyword Matching
      if (match && keywords) {
        if (keywords.kjv && !text.toLowerCase().includes(keywords.kjv.toLowerCase())) match = false;
        
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
        if (skipped < skipCount) {
          skipped++;
        } else {
          results.push({
            reference: ref,
            kjv: { text: text },
            korean: { text: indexes.korean.get(ref) || 'N/A' },
            hebrew: { text: indexes.hebrew.get(ref) || 'N/A' },
            greek: { text: indexes.greek.get(ref) || 'N/A' }
          });
          if (results.length >= limit) break;
        }
      }
    }

    return NextResponse.json({ results });
  } catch (error: unknown) {
    console.error(error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
