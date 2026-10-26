"""All ordinary markets use repeated free chat, stable saves and exact agreed-price purchase."""
import json, os, subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
subprocess.run(['node','scripts/prepare-bargaining-fixtures.mjs'],check=True)
CASES=json.loads(Path('work/market-bargaining-cases.json').read_text())
NAMES={'street':'중고 장터','computers':'컴퓨터시장','instruments':'악기시장','cars':'중고차시장','property':'부동산 시장'}
BASE=os.getenv('SCREEN_BASE_URL','http://127.0.0.1:4182')
READ="""async()=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});return await new Promise(r=>{const q=db.transaction('saves').objectStore('saves').get('current');q.onsuccess=()=>{db.close();r(q.result)}})}"""
WRITE="""async data=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});await new Promise(r=>{const tx=db.transaction('saves','readwrite');tx.objectStore('saves').put(data,'current');tx.oncomplete=r});db.close()}"""
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in [320,375,390,430]:
  ctx=browser.new_context(viewport={'width':width,'height':844},is_mobile=True,has_touch=True)
  page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(BASE);page.get_by_role('heading',name='활동',exact=True).wait_for()
  for case in CASES:
   data=case['save'];original=data['game'];mid=case['marketId'];name=NAMES[mid];iid=case['id']
   rows=[i for i in original['board'] if i.get('marketId','street')==mid and i['price']>0]
   index=next(n for n,i in enumerate(rows) if i['id']==iid)
   def read():return page.evaluate(READ)['game']
   def live():return next(i for i in read()['board'] if i['id']==iid)
   def open_item():
    page.locator('.activity-grid').get_by_role('button',name=name,exact=True).click()
    page.locator('.sheet-layer .item-row').nth(index).click()
   page.evaluate(WRITE,data);page.reload();page.get_by_role('heading',name='활동',exact=True).wait_for();open_item()
   page.get_by_role('button',name='판매자와 채팅',exact=True).click()
   before=read()
   assert '공략' not in page.locator('.sheet-layer').inner_text()
   for round in range(2):
    page.get_by_role('button',name=' 제안 · 행동 소모 없음').first.click()
    expect(page.locator('.chat-message')).to_have_count(3+2*round)
    assert page.locator('.action-layer').count()==0
    assert read()['minute']==before['minute'] and read()['weekActions']==before['weekActions'] and read()['cash']==before['cash']
   saved=live();assert saved['purchaseBargain']['rounds']==2 and saved['purchaseBargain']['previousOffer']>0
   page.reload();page.get_by_role('heading',name='활동',exact=True).wait_for();open_item()
   expect(page.locator('.chat-message')).to_have_count(5)
   assert live()==saved
   price=saved['negotiatedPrice']
   page.get_by_role('button',name='구매 내용 확인',exact=False).click()
   page.get_by_role('button',name='지불·수령 확정 · 행동 1회',exact=True).click()
   expect(page.locator('.action-layer')).to_have_count(0)
   purchased=read();assert purchased['cash']==before['cash']-price and purchased['minute']==before['minute']+480
   assert next(i for i in purchased['inventory'] if i['id']==iid)['acquiredFor']==price
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   if width==390:page.screenshot(path=f'work/market-bargaining-{mid}-390.png',full_page=True)
  assert not errors,errors
  ctx.close();print(f'{width}px all five markets: multi-round free chat, reload, previous offer, exact-price purchase PASS',flush=True)
 browser.close()
