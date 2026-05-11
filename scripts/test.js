const fs = require('fs');
const path = require('path');

function createIndex(bibleJson, isFlat = false) {
  const index = new Map();
  if (!bibleJson) return index;

  if (isFlat) {
    for (const row of bibleJson) {
      const ref = `${row.book_name} ${row.chapter}:${row.verse}`;
      index.set(ref, row.text);
    }
  } else {
    for (const book of bibleJson) {
      const bookName = book.name;
      book.chapters.forEach((chapterVerses, cIdx) => {
        chapterVerses.forEach((text, vIdx) => {
          const ref = `${bookName} ${cIdx + 1}:${vIdx + 1}`;
          index.set(ref, text);
        });
      });
    }
  }
  return index;
}

const kjvFile = fs.readFileSync(path.join(__dirname, '../data/kjv.json'), 'utf-8');
const cleanContent = kjvFile.replace(/^\uFEFF/, '');
const kjv = JSON.parse(cleanContent);
const kjvIndex = createIndex(kjv, false);

console.log("KJV Index Size:", kjvIndex.size);

const reference = "Gen 1";
const queryRefs = reference ? reference.split(',').map((r) => r.trim()).filter(Boolean) : [];

const parsedQueries = queryRefs.map(q => {
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
  return { qBook, qChap, qVerse, qVerseEnd };
}).filter(Boolean);

let matchCount = 0;
for (const [ref, text] of kjvIndex.entries()) {
  let match = false;
  if (parsedQueries.length > 0) {
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
  if (match) {
    console.log("Matched:", ref);
    matchCount++;
    if (matchCount > 5) break;
  }
}
console.log("Total Matches for", reference, ":", matchCount);
