import fs from 'node:fs/promises';
import { chromium } from 'playwright';

const root='http://127.0.0.1:8000/preview-v5.html';
const out='artifacts';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({
 channel:'chrome', headless:true,
 args:['--enable-webgl','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']
});
let failed=false;
try {
 for(const [label,width,height] of [['desktop',1206,847],['mobile',402,660]]){
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1});
  const page=await context.newPage();
  const problems=[];
  page.on('pageerror',error=>problems.push('JS: '+error.stack));
  page.on('console',message=>{
   if(message.type()==='error')problems.push('Console: '+message.text());
  });
  page.on('requestfailed',request=>problems.push('Network: '+request.url()+': '+request.failure()?.errorText));
  await page.goto(root,{waitUntil:'domcontentloaded',timeout:35000});
  await page.waitForFunction(()=>Boolean(window.__psxReady && window.__psxDebug),null,{timeout:35000});
  await page.waitForTimeout(2200);
  const state=await page.evaluate(()=>window.__psxDebug.snapshot());
  await fs.writeFile(out+'/psx-'+label+'.json',JSON.stringify({state,problems},null,2));
  await page.screenshot({path:out+'/psx-'+label+'.png',fullPage:true});
  if(!state.renderer || state.renderer.scenePass?.calls < 1 ||
    state.renderer.scenePass?.triangles < 1){
    problems.push('No main scene draw calls/triangles: '+JSON.stringify(state.renderer?.scenePass));
  }
  if(!state.sceneModuleLoaded || !state.firstFrameRendered){
    problems.push('Scene module/frame missing');
  }
  if(state.renderer?.renderTarget?.[0]!==342 || state.renderer?.renderTarget?.[1]!==240){
    problems.push('Unexpected render aspect/resolution: '+state.renderer?.renderTarget);
  }
  if(!state.renderer?.settings?.exposure || state.renderer?.settings?.exposure < 1.5){
    problems.push('Default scene exposure not applied: '+state.renderer?.settings?.exposure);
  }
  if(state.screenPixelProbe?.center8x8Mean!=null &&
    state.screenPixelProbe.center8x8Mean < 12){
    problems.push('Presented scene is nearly black: '+state.screenPixelProbe.center8x8Mean);
  }
  console.log(label,JSON.stringify({
    frame:state.firstFrameRendered,
    scenePass:state.renderer?.scenePass,
    renderTarget:state.renderer?.renderTarget,
    exposure:state.renderer?.settings?.exposure,
    rawCenter:state.recentPixelProbe?.center?.mean,
    presentedCenter:state.screenPixelProbe?.center8x8Mean,
    errors:problems
  },null,2));
  if(problems.length)failed=true;
  await page.close();await context.close();
 }
}finally{
 await browser.close();
}
if(failed)process.exitCode=1;
