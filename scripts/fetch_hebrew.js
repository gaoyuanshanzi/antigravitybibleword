const fs = require('fs');
const path = require('path');

const URL = 'https://raw.githubusercontent.com/Rikartt/Hebrew-Bible-JSON-with-Nikkud/master/hebrew_bible_with_nikkud.json';

const bookMap = {
  'Gen': 'Genesis',
  'Exod': 'Exodus',
  'Lev': 'Leviticus',
  'Num': 'Numbers',
  'Deut': 'Deuteronomy',
  'Josh': 'Joshua',
  'Judg': 'Judges',
  'Ruth': 'Ruth',
  '1Sam': '1 Samuel',
  '2Sam': '2 Samuel',
  '1Kgs': '1 Kings',
  '2Kgs': '2 Kings',
  '1Chr': '1 Chronicles',
  '2Chr': '2 Chronicles',
  'Ezra': 'Ezra',
  'Neh': 'Nehemiah',
  'Esth': 'Esther',
  'Job': 'Job',
  'Ps': 'Psalms',
  'Prov': 'Proverbs',
  'Eccl': 'Ecclesiastes',
  'Song': 'Song of Solomon',
  'Isa': 'Isaiah',
  'Jer': 'Jeremiah',
  'Lam': 'Lamentations',
  'Ezek': 'Ezekiel',
  'Dan': 'Daniel',
  'Hos': 'Hosea',
  'Joel': 'Joel',
  'Amos': 'Amos',
  'Obad': 'Obadiah',
  'Jonah': 'Jonah',
  'Mic': 'Micah',
  'Nah': 'Nahum',
  'Hab': 'Habakkuk',
  'Zeph': 'Zephaniah',
  'Hag': 'Haggai',
  'Zech': 'Zechariah',
  'Mal': 'Malachi'
};

async function fetchHebrew() {
  console.log('Fetching Hebrew Masoretic Text...');
  const res = await fetch(URL);
  const data = await res.json();
  const flat = [];

  for (const shortCode of Object.keys(data)) {
    const bookName = bookMap[shortCode] || shortCode;
    const chapters = data[shortCode];
    for (const chap of Object.keys(chapters)) {
      const verses = chapters[chap];
      for (const v of Object.keys(verses)) {
        // verses[v] is an array of words
        const text = verses[v].join(' ').trim();
        flat.push({
          book_name: bookName,
          chapter: String(parseInt(chap, 10) + 1),
          verse: String(parseInt(v, 10) + 1),
          text: text
        });
      }
    }
  }

  const outPath = path.join(__dirname, '../data/hebrew.json');
  console.log(`Writing ${flat.length} verses to ${outPath}...`);
  fs.writeFileSync(outPath, JSON.stringify(flat, null, 0));
}

fetchHebrew().catch(console.error);
