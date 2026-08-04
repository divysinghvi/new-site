#!/usr/bin/env node
/* test-run.js — capture console errors + screenshots across states */
const puppeteer = require('puppeteer-core');
function chromePath(){ return process.env.CHROME_PATH || (process.platform==='darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : '/usr/bin/google-chrome'); }
const url = process.argv[2] || 'http://localhost:8765/index.html';
const mode = process.argv[3] || 'auto'; // auto|static|debug
(async () => {
  const errors = [], logs = [];
  const b = await puppeteer.launch({ executablePath: chromePath(), headless: 'new', args:['--hide-scrollbars','--no-sandbox','--force-device-scale-factor=1'] });
  try {
    const page = await b.newPage();
    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
    page.on('console', m => { logs.push(m.type()+': '+m.text()); if(m.type()==='error') errors.push(m.text()); });
    page.on('pageerror', e => errors.push('PAGEERROR: '+e.message));
    page.on('requestfailed', r => errors.push('REQFAIL: '+r.url()+' '+r.failure().errorText));
    const u = mode==='static' ? url : (mode==='debug'? url+(url.includes('?')?'&':'?')+'debug' : url+(url.includes('?')?'&':'?')+'auto');
    await page.goto(u, { waitUntil:'networkidle0', timeout:60000 }).catch(e=>errors.push('GOTO: '+e.message));
    await new Promise(r=>setTimeout(r,1500));
    // screenshot 1: early (scout/battle start)
    await page.screenshot({ path:'shots/g-1-early.png' });
    // wait for battle to progress
    await new Promise(r=>setTimeout(r, 4000));
    await page.screenshot({ path:'shots/g-2-mid.png' });
    await new Promise(r=>setTimeout(r, 6000));
    await page.screenshot({ path:'shots/g-3-late.png' });
    await new Promise(r=>setTimeout(r, 8000));
    await page.screenshot({ path:'shots/g-4-end.png' });
    // open war log
    await page.evaluate(() => document.getElementById('logBtn').click());
    await new Promise(r=>setTimeout(r,600));
    await page.screenshot({ path:'shots/g-5-warlog.png' });
    console.log('=== CONSOLE ERRORS ('+errors.length+') ===');
    errors.forEach(e=>console.log(e));
    console.log('=== LOGS (last 20) ===');
    logs.slice(-20).forEach(l=>console.log(l));
    console.log(errors.length ? 'RESULT: FAIL '+errors.length+' errors' : 'RESULT: PASS zero errors');
  } finally { await b.close().catch(()=>{}); process.exitCode = errors.length?1:0; }
})();