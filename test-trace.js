const puppeteer = require('puppeteer-core');
function cp(){ return process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'; }
(async () => {
  const b = await puppeteer.launch({ executablePath: cp(), headless:'new', args:['--no-sandbox'] });
  const p = await b.newPage();
  p.on('pageerror', e => console.log('PAGEERROR:\n'+e.stack));
  p.on('console', m => { if(m.type()==='error') console.log('CONERR:', m.text(), m.stack()); });
  await p.goto('http://localhost:8765/index.html?auto', { waitUntil:'networkidle0' });
  await new Promise(r=>setTimeout(r,3000));
  await b.close();
})();
