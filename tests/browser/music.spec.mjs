import {test,expect} from '@playwright/test';
async function setup(page){
  await page.route('**/ui/main.js',async route=>{
    const response=await route.fetch();await route.fulfill({response,body:await response.text()+'\nwindow.__music=music.element;window.__musicState=music;window.__musicQA={get sim(){return sim}};'});
  });
  await page.goto('/reparto/');
}
test('soundtrack ducks fivefold under voice and keeps playing through pauses, menus, review and blur',async({page})=>{
  await setup(page);expect(await page.evaluate(()=>window.__music.paused)).toBe(true);
  await page.getByRole('button',{name:'Jugar',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>!window.__music.paused&&!window.__music.muted&&window.__music.volume===.04)).toBe(true);
  const duringVoice=await page.evaluate(()=>window.__music.currentTime);
  await expect.poll(()=>page.evaluate(()=>window.__music.currentTime)).toBeGreaterThan(duringVoice);
  await expect.poll(()=>page.evaluate(()=>!window.__music.paused&&window.__music.volume===.2)).toBe(true);
  expect(await page.evaluate(()=>window.__music.loop)).toBe(true);
  expect(await page.evaluate(()=>window.__music.duration)).toBeGreaterThan(10);
  await page.locator('#listen').click();expect(await page.evaluate(()=>window.__music.volume)).toBe(.04);
  expect(await page.evaluate(()=>window.__music.paused||window.__music.muted)).toBe(false);
  const beforePause=await page.evaluate(()=>window.__music.currentTime);
  await page.keyboard.press('Escape');expect(await page.evaluate(()=>window.__music.paused)).toBe(false);
  expect(await page.evaluate(()=>window.__music.volume)).toBe(.2);
  await expect.poll(()=>page.evaluate(()=>window.__music.currentTime)).toBeGreaterThan(beforePause);
  await page.getByRole('button',{name:'Continuar',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>!window.__music.paused&&window.__music.volume===.2)).toBe(true);
  await page.getByRole('button',{name:'Música',exact:true}).click();
  await expect(page.locator('#music')).toHaveAttribute('aria-pressed','false');expect(await page.evaluate(()=>window.__music.paused)).toBe(true);
  await page.getByRole('button',{name:'Música',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>!window.__music.paused)).toBe(true);
  await page.evaluate(()=>{
    const s=window.__musicQA.sim;const target=s.route.gateOrder.indexOf(s.route.targetId);
    s.player={x:[1,4,7][(target+1)%3],y:2};s.step=null;s.traffic=[];s.clearInput();
  });
  await page.keyboard.press('ArrowUp');
  await expect(page.getByRole('heading',{name:'No es aquí, lo siento.',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>window.__music.paused)).toBe(false);
  await page.getByRole('dialog').getByRole('button',{name:'Escuchar',exact:true}).click();
  expect(await page.evaluate(()=>window.__music.volume)).toBe(.04);
  await expect.poll(()=>page.evaluate(()=>window.__music.volume)).toBe(.2);
  await page.getByRole('button',{name:'Siguiente pedido',exact:true}).click();
  await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
  await expect(page.getByRole('heading',{name:'En pausa',exact:true})).toBeVisible();expect(await page.evaluate(()=>window.__music.paused)).toBe(false);
  expect(await page.evaluate(()=>window.__music.volume)).toBe(.2);
});
test('music and voice settings are independent and survive reload',async({page})=>{
  await setup(page);await page.getByRole('button',{name:'Ajustes',exact:true}).click();
  await page.getByLabel('Voz del pedido', {exact:true}).uncheck();await page.getByRole('button',{name:'Empezar selección',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>!window.__music.paused&&!window.__music.muted)).toBe(true);
  await expect(page.locator('#prompt')).toContainText('La entrega es en');
  await page.getByRole('button',{name:'Música',exact:true}).click();await page.reload();
  await expect(page.locator('#music')).toHaveAttribute('aria-pressed','false');
  await page.getByRole('button',{name:'Ajustes',exact:true}).click();
  await expect(page.getByLabel('Voz del pedido',{exact:true})).not.toBeChecked();
  await expect(page.getByLabel('Música de fondo',{exact:true})).not.toBeChecked();
  await page.getByLabel('Música de fondo',{exact:true}).check();
  await expect.poll(()=>page.evaluate(()=>!window.__music.paused)).toBe(true);
  await page.getByRole('button',{name:'Empezar selección',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>!window.__music.paused&&!window.__music.muted)).toBe(true);
});
test('unavailable soundtrack leaves voice playback and game controls usable',async({page})=>{
  await page.route('**/audio/music/*.mp3',route=>route.abort());await setup(page);
  await page.getByRole('button',{name:'Jugar',exact:true}).click();
  await expect(page.locator('#music')).toHaveAttribute('title',/no disponible/);
  await expect(page.locator('#notice')).toHaveText('',{timeout:8000});
  await page.keyboard.press('ArrowLeft');await page.locator('#pause').click();
  await expect(page.getByRole('heading',{name:'En pausa',exact:true})).toBeVisible();
});
