const fs = require('fs');
const https = require('https');
const path = require('path');

const bibles = {
  kjv: 'https://raw.githubusercontent.com/thiagobodruk/bible/master/json/en_kjv.json',
  korean: 'https://raw.githubusercontent.com/thiagobodruk/bible/master/json/ko_ko.json',
  greek: 'https://raw.githubusercontent.com/thiagobodruk/bible/master/json/el_greek.json',
  // Using a mock URL for hebrew, in production replace with a valid JSON source or API
  hebrew: 'mock' 
};

const dataDir = path.join(__dirname, '../data');

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    if (url === 'mock') {
      const mockData = [
        { book_name: "Genesis", book_reference: "1", chapter: "1", verse: "1", text: "בְּרֵאשִׁ֖ית בָּרָ֣א אֱלֹהִ֑ים אֵ֥ת הַשָּׁמַ֖יִם וְאֵ֥ת הָאָֽרֶץ׃" },
        { book_name: "Genesis", book_reference: "1", chapter: "1", verse: "2", text: "וְהָאָ֗רֶץ הָיְתָ֥ה תֹ֙הוּ֙ וָבֹ֔הוּ וְחֹ֖שֶׁךְ עַל־פְּנֵ֣י תְהֹ֑ום וְר֣וּחַ אֱלֹהִ֔ים מְרַחֶ֖פֶת עַל־פְּנֵ֥י הַמָּֽיִם׃" },
        { book_name: "Genesis", book_reference: "1", chapter: "1", verse: "3", text: "וַיֹּ֥אמֶר אֱלֹהִ֖ים יְהִ֣י אֹ֑ור וַֽיְהִי־אֹֽור׃" }
      ];
      fs.writeFileSync(dest, JSON.stringify(mockData, null, 2));
      resolve();
      return;
    }

    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function main() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir);
  }

  for (const [name, url] of Object.entries(bibles)) {
    const dest = path.join(dataDir, `${name}.json`);
    console.log(`Downloading ${name} Bible...`);
    try {
      await downloadFile(url, dest);
      console.log(`Successfully downloaded ${name} Bible.`);
    } catch (err) {
      console.error(`Error downloading ${name}:`, err.message);
    }
  }

  console.log('All downloads completed or mocked. Generating consolidated search index...');
  
  // Create a minimal index for demo purposes if full files are too big to parse easily,
  // but for now we'll just let the Next.js API read these files dynamically.
}

main();
