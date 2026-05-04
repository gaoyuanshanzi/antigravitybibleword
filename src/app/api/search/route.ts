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
      return JSON.parse(fileContent);
    } catch {
      console.error(`Failed to load ${name}.json`);
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

let indexCache: unknown = null;

async function getIndexes() {
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
    const { reference, keywords } = body;
    
    const indexes = await getIndexes();
    const results = [];

    // Search logic
    if (reference) {
      // Parse references like "Genesis 1:1, Genesis 1:2"
      const refs = reference.split(',').map((r: string) => r.trim());
      for (const ref of refs) {
        // Expand ranges if necessary (e.g. Genesis 1:1-3) - For now, simple exact match
        // A full app would use a bible reference parser like `bible-reference-parser`
        if (indexes.kjv.has(ref) || indexes.hebrew.has(ref)) {
          results.push({
            reference: ref,
            kjv: { text: indexes.kjv.get(ref) || 'N/A' },
            korean: { text: indexes.korean.get(ref) || 'N/A' },
            hebrew: { text: indexes.hebrew.get(ref) || 'N/A' },
            greek: { text: indexes.greek.get(ref) || 'N/A' }
          });
        }
      }
    } else {
      // Keyword search or default Gen 1:1 to Gen 1:30
      // We will iterate over the KJV index keys and match filters
      let count = 0;
      for (const [ref, text] of indexes.kjv.entries()) {
        if (count >= 50) break; // Limit to 50 results
        
        let match = true;
        
        if (keywords) {
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
          
          // If all keywords are empty, just return the first verses (Genesis 1)
          const allEmpty = !keywords.kjv && !keywords.korean && !keywords.hebrew && !keywords.greek;
          if (allEmpty) match = true;
        }

        if (match) {
          results.push({
            reference: ref,
            kjv: { text: text },
            korean: { text: indexes.korean.get(ref) || 'N/A' },
            hebrew: { text: indexes.hebrew.get(ref) || 'N/A' },
            greek: { text: indexes.greek.get(ref) || 'N/A' }
          });
          count++;
        }
      }
    }

    return NextResponse.json({ results });
  } catch (error: unknown) {
    console.error(error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
