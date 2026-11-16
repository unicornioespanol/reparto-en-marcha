import {test,expect} from '@playwright/test';
// Test-only instrumentation exposes state fixtures without adding production debug globals.
async function setup(page){
  await page.addInitScript(()=>localStorage.setItem('reparto-en-marcha:v1',JSON.stringify({settings:{audioEnabled:false}})));
  await page.route('**/ui/main.js',async route=>{
    const response=await route.fetch();const body=await response.text();
    await route.fulfill({response,body:body+'\nwindow.__qa={get sim(){return sim},get records(){return records}};'});
  });
  await page.goto('/');
}
async function atDoor(page,correct){
  await page.evaluate(correct=>{
    const s=window.__qa.sim;const target=s.route.gateOrder.indexOf(s.route.targetId);
    s.player={x:[1,4,7][correct?target:(target+1)%3],y:2};s.step=null;s.traffic=[];s.clearInput();
  },correct);
  await page.keyboard.press('ArrowUp');
  await expect(page.locator('#dialog')).toBeVisible();
}
for(const count of [0,2,3])test(`three-order UI total ${count}/3; result cannot be changed or counted twice`,async({page})=>{
  await setup(page);await page.getByRole('button',{name:'Jugar',exact:true}).click();
  for(let i=0;i<3;i++){
    await atDoor(page,i<count);
    await expect(page.getByRole('heading',{name:i<count?'¡Entrega hecha!':'No es aquí, lo siento.',exact:true})).toBeVisible();
    await page.keyboard.press('Escape');await page.keyboard.press('ArrowUp');
    expect(await page.evaluate(()=>window.__qa.records.length)).toBe(i+1);
    if(i===2)await page.getByRole('button',{name:'Ver resultado',exact:true}).click();
    else await page.getByRole('button',{name:'Siguiente pedido',exact:true}).dblclick();
  }
  await expect(page.getByRole('heading',{name:`${count} de 3 entregas`,exact:true})).toBeVisible();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('reparto-en-marcha:v1')).completedDistrictIds)).toEqual(['barrio']);
  await page.getByRole('button',{name:'Siguiente barrio',exact:true}).click();await expect(page.locator('#district')).toHaveText('El centro');
});
test('full campaign includes twelve orders and final total',async({page})=>{
  await setup(page);await page.getByRole('button',{name:'Ajustes',exact:true}).click();
  await page.getByRole('combobox',{name:'Barrio o campaña'}).selectOption('campaign');await page.getByRole('button',{name:'Empezar selección'}).click();
  for(let d=0;d<4;d++){
    for(let o=0;o<3;o++){
      await atDoor(page,true);await page.getByRole('button',{name:o===2?'Ver resultado':'Siguiente pedido',exact:true}).click();
    }
    await page.getByRole('button',{name:d===3?'Ver campaña':'Siguiente barrio',exact:true}).click();
  }
  await expect(page.getByRole('heading',{name:'12 de 12 entregas',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('reparto-en-marcha:v1')).completedDistrictIds.length)).toBe(4);
});
test('real input: one tap, hold, pointer release outside button, and up at top requires new press',async({page})=>{
  await setup(page);await page.getByRole('button',{name:'Jugar',exact:true}).click();
  await page.evaluate(()=>{window.__qa.sim.traffic=[];});
  await page.keyboard.press('ArrowLeft');await expect.poll(()=>page.evaluate(()=>window.__qa.sim.player.x)).toBe(3);
  await page.keyboard.down('ArrowRight');await page.waitForTimeout(700);await page.keyboard.up('ArrowRight');
  const afterHold=await page.evaluate(()=>window.__qa.sim.avatar.x);expect(afterHold).toBeGreaterThan(4);
  await page.waitForTimeout(200);const settled=await page.evaluate(()=>window.__qa.sim.avatar.x);
  await page.waitForTimeout(300);expect(await page.evaluate(()=>window.__qa.sim.avatar.x)).toBe(settled);
  const left=await page.getByRole('button',{name:'Izquierda',exact:true}).boundingBox();
  await page.mouse.move(left.x+24,left.y+24);await page.mouse.down();await page.mouse.move(2,2);await page.mouse.up();await page.waitForTimeout(200);
  expect(await page.evaluate(()=>window.__qa.sim.hold)).toBeNull();
  await page.evaluate(()=>{const s=window.__qa.sim;s.player={x:4,y:3};s.step=null;s.clearInput();});
  await page.keyboard.down('ArrowUp');await page.waitForTimeout(650);await page.keyboard.up('ArrowUp');
  expect(await page.evaluate(()=>window.__qa.sim.player.y)).toBe(2);await expect(page.locator('#dialog')).not.toBeVisible();
  await page.keyboard.press('ArrowUp');await expect(page.locator('#dialog')).toBeVisible();
});
test('pause during an actual MP3 and restart returns control',async({page})=>{
  await page.goto('/');await page.getByRole('button',{name:'Jugar',exact:true}).click();
  await page.keyboard.press('Escape');await expect(page.getByRole('heading',{name:'En pausa',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Continuar',exact:true}).click();
  await expect(page.locator('#notice')).toHaveText('',{timeout:8000});
  await page.keyboard.press('ArrowLeft');await expect(page.locator('#dialog')).not.toBeVisible();
});
