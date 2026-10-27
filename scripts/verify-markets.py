"""All markets have independent, direct activity entrances; outlets only sell owned assets."""
import json
import os
import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
subprocess.run(['node','scripts/prepare-browser-fixtures.mjs'],check=True)
BASE=os.getenv('SCREEN_BASE_URL','http://127.0.0.1:4182')
MARKETS=[('street','중고 장터',10000,500000),('computers','컴퓨터시장',800000,1200000),('instruments','악기시장',1500000,10000000),('cars','중고차시장',10000000,80000000),('property','부동산 시장',100000000,1000000000),('auction','고가 경매시장',1000000000,10000000000)]
READ="""async()=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});return await new Promise(r=>{const q=db.transaction('saves').objectStore('saves').get('current');q.onsuccess=()=>{db.close();r(q.result)}})}"""
WRITE="""async data=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});await new Promise(r=>{const tx=db.transaction('saves','readwrite');tx.objectStore('saves').put(data,'current');tx.oncomplete=r});db.close()}"""
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
 for width in [320,375,390,430]:
  ctx=browser.new_context(viewport={'width':width,'height':844},is_mobile=True,has_touch=True)
  page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(BASE);page.get_by_role('heading',name='활동',exact=True).wait_for()
  data=json.loads(Path('work/rich.json').read_text());page.evaluate(WRITE,data);page.reload();page.get_by_role('heading',name='활동',exact=True).wait_for()
  def read():return page.evaluate(READ)
  def open_market(name):page.locator('.activity-grid').get_by_role('button',name=name,exact=True).click()
  expected=['무료나눔','아르바이트','물건 수집']+[m[1] for m in MARKETS]+['즉시 판매','사업']
  assert page.locator('.activity-grid button').all_text_contents()==expected
  page.screenshot(path=f'work/activity-direct-markets-{width}.png',full_page=True)
  original=read()['game']
  for mid,name,low,high in MARKETS:
   open_market(name)
   expect(page.get_by_role('heading',name=name,exact=True)).to_be_visible()
   expect(page.locator('.market-selector')).to_have_count(0)
   expect(page.locator('.sheet-layer .item-row')).to_have_count(8)
   assert read()['game']==original
   assert page.locator('.action-layer').count()==0
   rows=[i for i in original['board'] if i.get('marketId','street')==mid and i['price']>0]
   assert len(rows)==8 and all(low<=i['price']<=high for i in rows)
   page.locator('.item-row').first.click()
   expect(page.locator('.asset-market')).to_have_text(name)
   if mid=='auction':
    expect(page.get_by_role('button',name='판매자와 채팅',exact=True)).to_have_count(0)
    assert page.get_by_role('button',name=' 입찰 · 행동 소모 없음').count()==3
   else:
    expect(page.get_by_role('button',name='판매자와 채팅',exact=True)).to_be_visible()
    expect(page.get_by_role('button',name=' 입찰 · 행동 소모 없음')).to_have_count(0)
   page.get_by_role('button',name='← 뒤로',exact=True).click()
   expect(page.get_by_role('heading',name=name,exact=True)).to_be_visible()
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   page.get_by_role('button',name='닫기',exact=True).click()
  # A previous market preference must never hijack the street entrance.
  open_market('중고 장터');expect(page.locator('.market-selection strong')).to_have_text('중고 장터');page.get_by_role('button',name='닫기',exact=True).click()
  open_market('즉시 판매')
  expect(page.locator('.market-selection')).to_have_count(0)
  expect(page.get_by_role('button',name='판매자와 채팅',exact=True)).to_have_count(0)
  expect(page.get_by_text('실제 가치의 60%로 판매합니다.',exact=True)).to_be_visible()
  page.get_by_role('button',name='닫기',exact=True).click()
  open_market('컴퓨터시장');before=read()['game']
  page.get_by_role('button',name='새 매물 탐색 · 행동 1회',exact=True).click();expect(page.locator('.action-layer')).to_have_count(0)
  after=read()['game'];assert after['minute']==before['minute']+480
  assert [i for i in after['board'] if i.get('marketId')!='computers']==[i for i in before['board'] if i.get('marketId')!='computers']
  page.reload();page.get_by_role('heading',name='활동',exact=True).wait_for();open_market('컴퓨터시장')
  expect(page.get_by_role('heading',name='컴퓨터시장',exact=True)).to_be_visible()
  rich=json.loads(json.dumps(data));rich['game']['cash']=2000000;rich['game']['stats']['peakCash']=2000000
  page.evaluate(WRITE,rich);page.reload();page.get_by_role('heading',name='활동',exact=True).wait_for();open_market('컴퓨터시장');page.locator('.item-row').first.click()
  page.get_by_role('button',name='판매자와 채팅',exact=True).click();page.get_by_role('button',name=' 제안 · 행동 소모 없음').first.click()
  expect(page.locator('.chat-message')).to_have_count(3)
  assert read()['game']['minute']==rich['game']['minute']
  purchase=page.get_by_role('button',name='구매 내용 확인')
  if purchase.is_disabled():
   # An unlucky opening offer can end a real negotiation. Verify that lock, then
   # use an untouched snapshot to test the independent direct-purchase path.
   assert next(i for i in read()['game']['board'] if i.get('marketId')=='computers')['purchaseBargain']['walked']
   page.evaluate(WRITE,rich);page.reload();page.get_by_role('heading',name='활동',exact=True).wait_for();open_market('컴퓨터시장');page.locator('.item-row').first.click()
  page.get_by_role('button',name='구매 내용 확인').click();page.get_by_role('button',name='지불·수령 확정 · 행동 1회',exact=True).click();expect(page.locator('.action-layer')).to_have_count(0)
  paid=read()['game'];assert paid['inventory'][0]['marketId']=='computers' and paid['minute']==rich['game']['minute']+480
  page.get_by_role('button',name='받은 물품 확인',exact=True).click();page.get_by_role('button',name='가치 확인 · 행동 소모 없음',exact=False).click();expect(page.locator('.action-layer')).to_have_count(0)
  assert read()['game']['minute']==paid['minute']
  assert not errors,errors
  print(json.dumps({'width':width,'direct_entrances_five_market_chats_auction_only_outlets_separate':'PASS'}),flush=True)
  ctx.close()
 browser.close()
