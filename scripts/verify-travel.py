"""Outlet travel is navigation, including at zero satiety; actual sale costs an hour."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
BASE=os.getenv('SCREEN_BASE_URL','http://127.0.0.1:4182')
WRITE="""async data=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});await new Promise(r=>{const tx=db.transaction('saves','readwrite');tx.objectStore('saves').put(data,'current');tx.oncomplete=r});db.close()}"""
READ="""async()=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});return await new Promise(r=>{const q=db.transaction('saves').objectStore('saves').get('current');q.onsuccess=()=>{db.close();r(q.result.game)}})}"""
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
 results=[]
 for width in [320,375,390,430]:
  ctx=browser.new_context(viewport={'width':width,'height':844},is_mobile=True,has_touch=True)
  page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(BASE);page.get_by_role('heading',name='활동',exact=True).wait_for()
  def fixture(hungry):
   data=json.loads(Path('work/inventory-comparison.json').read_text());data['game']['satiety']=0 if hungry else 100;data['game']['fatigue']=100
   page.evaluate(WRITE,data);page.reload();page.get_by_role('heading',name='활동',exact=True).wait_for()
   page.locator('.activity-grid').get_by_role('button',name='매각처',exact=True).click()
   return data['game']
  g=fixture(True)
  for outlet,name in [('scrap','고물상'),('used','중고 상점'),('collector','수집품 상점'),('scrap','고물상')]:
   page.get_by_role('button',name=name+' 방문',exact=True).click()
   assert page.locator('.action-layer').count()==0
   expect(page.get_by_role('heading',name=name+' 제시 가격',exact=True)).to_be_visible()
   page.wait_for_function("async outlet=>(await ("+READ+")()).quotes?.outlet===outlet",arg=outlet)
   saved=page.evaluate(READ)
   assert {k:v for k,v in saved.items() if k!='quotes'}=={k:v for k,v in g.items() if k!='quotes'}
   assert page.get_by_role('status').count()==0
  page.reload();expect(page.get_by_role('heading',name='활동',exact=True)).to_be_visible()
  assert page.evaluate(READ)['quotes']['outlet']=='scrap'
  g=fixture(False)
  page.get_by_role('button',name='고물상 방문',exact=True).click()
  page.wait_for_function("async()=>(await ("+READ+")()).quotes?.outlet==='scrap'")
  quote=page.evaluate(READ)['quotes']['prices'][g['inventory'][0]['id']]
  page.locator('.sheet-layer .item-row').first.click()
  page.get_by_role('button',name='제시 가격으로 판매 확정 · 1시간',exact=True).click()
  expect(page.locator('.action-layer')).to_be_visible();expect(page.locator('.action-layer')).to_have_count(0)
  saved=page.evaluate(READ)
  assert saved['minute']==g['minute']+60
  assert saved['cash']==g['cash']+quote
  assert len(saved['inventory'])==len(g['inventory'])-1
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  assert not errors,errors
  results.append({'width':width,'travel_zero_stats_no_layer':'PASS','quote_save_reload':'PASS','actual_sale_one_hour':'PASS'})
  ctx.close()
 browser.close();print(json.dumps(results))
