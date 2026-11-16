import {test,expect} from '@playwright/test';
const key='reparto-en-marcha:v1';
async function muted(page){await page.addInitScript(({key})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({settings:{audioEnabled:false}}));},{key});}
for(const [width,height] of [[320,568],[390,844],[768,1024],[1024,768],[1366,768],[1440,900]]){
  test(`layout and controls ${width} × ${height}`,async({page})=>{
    await page.setViewportSize({width,height});await muted(page);const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('/');await page.getByRole('button',{name:'Jugar',exact:true}).click();
    await expect(page.locator('#prompt')).toContainText('La entrega es en');
    const bounds=await page.locator('canvas').boundingBox();
    expect(Math.abs(bounds.width/bounds.height-9/13)).toBeLessThan(.005);
    if(width>=950)expect(bounds.height).toBeGreaterThanOrEqual(height===768?720:850);
    if(width<950||height>=768){
      const pause=await page.locator('#pause').boundingBox();expect(pause.y+pause.height).toBeLessThanOrEqual(height+1);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
    for(const name of ['Arriba','Abajo','Izquierda','Derecha']){
      const b=await page.getByRole('button',{name,exact:true}).boundingBox();expect(b.width).toBeGreaterThanOrEqual(48);expect(b.height).toBeGreaterThanOrEqual(48);
    }
    await page.screenshot({path:`test-results/layout-${width}x${height}.png`});expect(errors).toEqual([]);
  });
}
test('pause, settings, persistence and subdirectory launch',async({page})=>{
  await muted(page);await page.goto('/reparto/');await page.getByRole('button',{name:'Jugar',exact:true}).click();
  await page.keyboard.press('Escape');await expect(page.getByRole('heading',{name:'En pausa'})).toBeVisible();
  await page.getByRole('button',{name:'Ajustes',exact:true}).click();
  await page.getByLabel('Tráfico lento (75 %)').check();await page.getByRole('combobox',{name:'Modo',exact:true}).selectOption('practice');
  await page.getByRole('combobox',{name:'Barrio o campaña'}).selectOption('avenida');await page.getByRole('button',{name:'Empezar selección'}).click();
  await expect(page.locator('#district')).toHaveText('La avenida');await expect(page.locator('#attempt-label')).toHaveText('Práctica ∞');
  await page.reload();await page.getByRole('button',{name:'Ajustes',exact:true}).click();
  await expect(page.getByLabel('Tráfico lento (75 %)')).toBeChecked();await expect(page.getByRole('combobox',{name:'Barrio o campaña'})).toHaveValue('avenida');
});
test('audio missing falls back to readable address; repeated replay and blur remain recoverable',async({page})=>{
  await page.route('**/*.mp3',route=>route.abort());await page.goto('/');await page.getByRole('button',{name:'Jugar',exact:true}).click();
  await expect(page.locator('#prompt')).toContainText('La entrega es en');
  await page.locator('#listen').click();await page.locator('#listen').click();
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
  await expect(page.getByRole('heading',{name:'En pausa'})).toBeVisible();
  await page.getByRole('button',{name:'Continuar',exact:true}).click();await expect(page.locator('#prompt')).toContainText('La entrega es en');
});
test('tutorial can be skipped and returns to start',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'Aprender',exact:true}).click();
  await expect(page.locator('#notice')).toHaveText('Pulsa una flecha.');await page.keyboard.press('ArrowLeft');
  await expect(page.locator('#notice')).toHaveText('Espera a que pase el coche.');
  await expect(page.locator('#notice')).toHaveText('Ve a la entrada.',{timeout:4000});
  await page.locator('#pause').click();await page.getByRole('button',{name:'Saltar',exact:true}).click();
  await expect(page.getByRole('button',{name:'Jugar',exact:true})).toBeVisible();
});
test('all 12 packaged MP3 files decode and have finite durations',async({page})=>{
  await page.goto('/');const result=await page.evaluate(async()=>{
    const {places}=await import('./content/catalog.js');
    return Promise.all(places.map(p=>new Promise(resolve=>{
      const a=new Audio(p.audio);a.onloadedmetadata=()=>resolve({id:p.id,duration:a.duration});a.onerror=()=>resolve({id:p.id,duration:0});
    })));
  });
  expect(result).toHaveLength(12);for(const r of result){expect(r.duration,r.id).toBeGreaterThan(1);expect(r.duration,r.id).toBeLessThan(10);}
});
