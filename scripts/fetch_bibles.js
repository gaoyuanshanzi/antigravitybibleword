const fs = require('fs');
const path = require('path');

const ASV_URL = 'https://raw.githubusercontent.com/dscottpi/ASV_JSON/master/ASV.json';
const TR_URL = 'https://raw.githubusercontent.com/scrollmapper/bible_databases/master/formats/json/TR.json';

async function fetchAndSave() {
  console.log('Fetching ASV from dscottpi...');
  const asvRes = await fetch(ASV_URL);
  const asvData = await asvRes.json();
  const flatAsv = [];

  for (const book of Object.keys(asvData)) {
    const chapters = asvData[book];
    for (const chap of Object.keys(chapters)) {
      const verses = chapters[chap];
      for (const v of Object.keys(verses)) {
        flatAsv.push({
          book_name: book,
          chapter: String(chap),
          verse: String(v),
          text: verses[v]
        });
      }
    }
  }

  console.log(`Writing ASV with ${flatAsv.length} verses...`);
  fs.writeFileSync(path.join(__dirname, '../data/asv.json'), JSON.stringify(flatAsv, null, 0));

  console.log('Fetching TR from scrollmapper...');
  const trRes = await fetch(TR_URL);
  const trData = await trRes.json();
  const flatTr = [];

  for (const book of trData.books) {
    if (!book.chapters || book.chapters.length === 0) continue;
    // Check if it's really an array with chapter objects
    if (typeof book.chapters[0] === 'object' && book.chapters[0].chapter) {
      for (const chapObj of book.chapters) {
        for (const vObj of chapObj.verses) {
          flatTr.push({
            book_name: book.name,
            chapter: String(chapObj.chapter),
            verse: String(vObj.verse),
            text: vObj.text
          });
        }
      }
    }
  }

  console.log(`Writing TR with ${flatTr.length} verses...`);
  fs.writeFileSync(path.join(__dirname, '../data/tr.json'), JSON.stringify(flatTr, null, 0));
}

fetchAndSave().catch(console.error);
