"""Buyer inquiries share inventory valuation, preserve unknowns and never consume actions."""
import json, subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
subprocess.run(['node','scripts/prepare-browser-fixtures.mjs'],check=True)
BASE='http://127.0.0.1:4182'
READ="""async()=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});return await new Promise(r=>{const q=db.transaction('saves').objectStore('saves').get('current');q.onsuccess=()=>{db.close();r(q.result)}})}"""
WRITE="""async data=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});await new Promise(r=>{const tx=db.transaction('saves','readwrite');tx.objectStore('saves').put(data,'current');tx.oncomplete=r});db.close()}"""
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in [320,375,390,430]:
  ctx=browser.new_context(viewport={'width':width,'height':844},is_mobile=True,has_touch=True)
  page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(BASE);page.get_by_role('heading',name='활동',exact=True).wait_for()
  for checked,cost,value in [(True,32000,100000),(False,0,100000),(True,999999999999999,100000000000000)]:
   data=json.loads(Path('work/seller-counter.json').read_text());g=data['game'];item=g['inventory'][0]
   item.update({'checked':checked,'acquiredFor':cost,'value':value});g['marketFactor']=100;g['trend']=item['kind']
   page.evaluate(WRITE,data);page.reload();page.get_by_role('heading',name='문의',exact=True).wait_for()
   comparisons=page.locator('.sheet-layer .item-comparison');assert comparisons.count()==len(g['inquiries'])
   for box in comparisons.all():
    expect(box.locator('[data-field=cost]')).to_have_text(f'{cost:,} 원')
    expect(box.locator('[data-field=value]')).to_have_text(f'{value*120//100:,} 원' if checked else '미확인')
    if not checked:expect(box.locator('[data-field=difference]')).to_have_text('미확인')
   assert page.evaluate(READ)['game']==g
   assert page.locator('.action-layer').count()==0
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   if checked and cost==32000:
    expect(comparisons.first.locator('[data-field=difference]')).to_have_text('+88,000 원')
    page.screenshot(path=f'work/inquiry-comparison-{width}.png',full_page=True)
  assert not errors,errors
  ctx.close();print(f'{width}px inquiry cost/current value, unknowns, free acquisition, large amounts, unchanged game PASS',flush=True)
 browser.close()
