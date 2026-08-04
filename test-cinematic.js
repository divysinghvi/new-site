#!/usr/bin/env node
/* test-cinematic.js — capture the cinematic approach + freeze/night juice */
const puppeteer = require('puppeteer-core');
function chromePath(){ return process.env.CHROME_PATH || (process.platform==='darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : '/usr/bin/google-chrome'); }
const url = process.argv[2] || 'http://localhost:8765/index.html';
(async () => {
  const errors = [];
  const b = await puppeteer.launch({ executablePath: chromePath(), headless: 'new', args:['--hide-scrollbars','--no-sandbox','--force-device-scale-factor=1'] });
  try {
    const page = await b.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    page.on('pageerror', e => errors.push('PAGEERROR: '+e.message));
    page.on('console', m => { if(m.type()==='error') errors.push(m.text()); });
    await page.goto(url, { waitUntil:'networkidle0', timeout:60000 });
    // wait for loader to finish + cinematic to start
    await new Promise(r=>setTimeout(r, 2600));
    await page.screenshot({ path:'shots/c-1-approach.png' });
    await new Promise(r=>setTimeout(r, 1800));
    await page.screenshot({ path:'shots/c-2-walls.png' });
    await new Promise(r=>setTimeout(r, 1800));
    await page.screenshot({ path:'shots/c-3-defenses.png' });
    await new Promise(r=>setTimeout(r, 1600));
    await page.screenshot({ path:'shots/c-4-townhall.png' });
    // cinematic should have settled into scout by now (~8s)
    await new Promise(r=>setTimeout(r, 1200));
    await page.screenshot({ path:'shots/c-5-scout.png' });
    // type freeze to test the spell (needs a battle — start one by deploying)
    await page.evaluate(() => { window.__audio && window.__audio.init && window.__audio.init(); });
    await page.focus('body');
    // deploy a giant near a defense to start battle, then freeze
    const canvas = await page.$('#world');
    const box = await canvas.boundingBox();
    await page.mouse.click(box.x + box.width*0.3, box.y + box.height*0.7);
    await new Promise(r=>setTimeout(r, 400));
    // type freeze
    for (const ch of 'freeze') { await page.keyboard.press(ch); }
    await new Promise(r=>setTimeout(r, 700));
    await page.screenshot({ path:'shots/c-6-freeze.png' });
    console.log('=== CINEMATIC ERRORS ('+errors.length+') ===');
    errors.forEach(e=>console.log(e));
    console.log(errors.length ? 'RESULT: FAIL' : 'RESULT: PASS');
  } finally { await b.close().catch(()=>{}); process.exitCode = errors.length?1:0; }
})();