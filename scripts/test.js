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
const kjv = JSON.parse(kjvFile);
const kjvIndex = createIndex(kjv, false);

console.log("KJV Index Size:", kjvIndex.size);

const reference = "Gen 1";
const queryRefs = reference ? reference.split(',').map((r) => r.trim()).filter(Boolean) : [];

let matchCount = 0;
for (const [ref, text] of kjvIndex.entries()) {
  let match = false;
  if (queryRefs.length > 0) {
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
  if (match) {
    console.log("Matched:", ref);
    matchCount++;
    if (matchCount > 5) break;
  }
}
console.log("Total Matches for", reference, ":", matchCount);
