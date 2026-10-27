"""Multi-round purchase bargaining, continuation and terminal-state production QA."""
import json
import os
import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
subprocess.run(['node','scripts/prepare-browser-fixtures.mjs'],check=True)
BASE=os.getenv('SCREEN_BASE_URL','http://127.0.0.1:4182')
READ="""async()=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});return await new Promise(r=>{const q=db.transaction('saves').objectStore('saves').get('current');q.onsuccess=()=>{db.close();r(q.result.game)}})}"""
WRITE="""async data=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});await new Promise(r=>{const tx=db.transaction('saves','readwrite');tx.objectStore('saves').put(data,'current');tx.oncomplete=r});db.close()}"""
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
 for width in [320,375,390,430]:
  ctx=browser.new_context(viewport={'width':width,'height':844},is_mobile=True,has_touch=True)
  page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(BASE);page.get_by_role('heading',name='활동',exact=True).wait_for()
  data=json.loads(Path('work/rich.json').read_text())
  data['game']['cash']=2000000;data['game']['stats']['peakCash']=2000000;data['game']['seed']=17
  if data['game']['board'][0].get('listing'): data['game']['board'][0]['listing']['facts']['seller']='ordinary'
  page.evaluate(WRITE,data);page.reload();page.get_by_role('heading',name='활동',exact=True).wait_for()
  def open_item():
   page.locator('.activity-grid').get_by_role('button',name='중고 장터',exact=True).click()
   page.locator('.item-row').first.click()
  open_item();page.get_by_role('button',name='판매자와 채팅',exact=True).click()
  for round in range(2):
   page.get_by_role('button',name=' 제안').first.click()
   expect(page.locator('.chat-message')).to_have_count(3+2*round)
   assert page.locator('.action-layer').count()==0
  before=page.evaluate(READ)
  assert before['board'][0]['purchaseBargain']['rounds']==2
  assert before['minute']==data['game']['minute']
  assert before['cash']==data['game']['cash']
  page.reload();page.get_by_role('heading',name='활동',exact=True).wait_for();open_item()
  expect(page.locator('.chat-message')).to_have_count(5)
  assert page.evaluate(READ)['board'][0]['purchaseBargain']==before['board'][0]['purchaseBargain']
  page.get_by_role('button',name=' 제안').first.click()
  expect(page.locator('.chat-message')).to_have_count(7)
  page.get_by_role('log').scroll_into_view_if_needed()
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.screenshot(path=f'work/multi-bargain-{width}.png',full_page=True)
  current=page.evaluate(READ);quote=current['board'][0]['negotiatedPrice'] or current['board'][0]['price']
  assert quote<=data['game']['board'][0]['price']
  page.get_by_role('button',name='구매 내용 확인').click()
  expect(page.locator('.sheet-layer')).to_contain_text(f'{quote:,} 원')
  page.get_by_role('button',name='지불·수령 확정',exact=True).click()
  expect(page.locator('.action-layer')).to_have_count(0)
  bought=page.evaluate(READ)
  assert bought['minute']==data['game']['minute']+480
  assert bought['cash']==data['game']['cash']-quote
  assert bought['inventory'][0]['acquiredFor']==quote
  # Terminal seller walkaway must disable every purchase path.
  terminal=json.loads(json.dumps(data));item=terminal['game']['board'][0]
  terminal['game']['seed']=1
  item.update(purchaseBargain={'rounds':3,'floor':item['price'],'patience':4,'walked':False},offers=[item['price']//2],negotiation='rejected',negotiatedPrice=item['price'],chat=[{'speaker':'other','text':'다시 제안해 보세요.'}])
  page.evaluate(WRITE,terminal);page.reload();page.get_by_role('heading',name='활동',exact=True).wait_for();open_item()
  page.get_by_role('button',name=' 제안').first.click()
  expect(page.get_by_role('button',name='구매 내용 확인')).to_be_disabled()
  expect(page.get_by_role('button',name=' 제안')).to_have_count(0)
  assert page.evaluate(READ)['board'][0]['purchaseBargain']['walked']
  assert not errors,errors
  print(json.dumps({'width':width,'multi_round_reload_quote_purchase_walkaway':'PASS'}),flush=True)
  ctx.close()
 browser.close()
