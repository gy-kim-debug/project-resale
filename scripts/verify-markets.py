"""Five markets: free navigation, distinct inventories, trades, checks and saved selection."""
import json
import os
import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
subprocess.run(['node','scripts/prepare-browser-fixtures.mjs'],check=True)
BASE=os.getenv('SCREEN_BASE_URL','http://127.0.0.1:4182')
MARKETS=[('street','장터',10000,500000),('computers','컴퓨터시장',800000,1200000),('instruments','악기시장',1500000,10000000),('cars','중고차시장',10000000,80000000),('property','부동산 시장',100000000,1000000000),('auction','고가 경매시장',1000000000,10000000000)]
READ="""async()=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});return await new Promise(r=>{const q=db.transaction('saves').objectStore('saves').get('current');q.onsuccess=()=>{db.close();r(q.result)}})}"""
WRITE="""async data=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});await new Promise(r=>{const tx=db.transaction('saves','readwrite');tx.objectStore('saves').put(data,'current');tx.oncomplete=r});db.close()}"""
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
 for width in [320,375,390,430]:
  ctx=browser.new_context(viewport={'width':width,'height':844},is_mobile=True,has_touch=True)
  page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(BASE);page.get_by_role('heading',name='활동',exact=True).wait_for()
  data=json.loads(Path('work/rich.json').read_text());page.evaluate(WRITE,data);page.reload();page.get_by_role('heading',name='활동',exact=True).wait_for()
  def market():page.locator('.activity-grid').get_by_role('button',name='장터',exact=True).click()
  def read():return page.evaluate(READ)
  market();before=read()['game'];seen=set()
  expect(page.locator('.market-selector button')).to_have_count(6)
  expect(page.locator('.market-selector').get_by_role('button',name='비행기 시장',exact=True)).to_have_count(0)
  for mid,name,low,high in MARKETS:
   page.locator('.market-selector').get_by_role('button',name=name,exact=True).click()
   expect(page.locator('.market-selection strong')).to_have_text(name)
   expect(page.locator('.sheet-layer .item-row')).to_have_count(8)
   assert page.locator('.action-layer').count()==0
   assert read()['game']==before
   rows=[i for i in before['board'] if i.get('marketId','street')==mid and i['price']>0]
   assert len(rows)==8 and all(low<=i['price']<=high for i in rows)
   assert set(i['title'] for i in rows).isdisjoint(seen)
   seen.update(i['title'] for i in rows)
   page.locator('.item-row').first.click()
   expect(page.locator('.asset-market')).to_have_text(name)
   if low>before['cash'] and mid!='auction':expect(page.get_by_role('button',name='구매 내용 확인')).to_be_disabled()
   if mid=='auction': assert page.get_by_role('button',name=' 입찰 · 행동 소모 없음').count()==3
   page.get_by_role('button',name='← 뒤로',exact=True).click()
   expect(page.locator('.market-selection strong')).to_have_text(name)
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.screenshot(path=f'work/markets-{width}.png',full_page=True)
  page.reload();page.get_by_role('heading',name='활동',exact=True).wait_for();market()
  expect(page.locator('.market-selection strong')).to_have_text('고가 경매시장')
  page.locator('.market-selector').get_by_role('button',name='컴퓨터시장',exact=True).click()
  before=read()['game']
  page.get_by_role('button',name='새 매물 탐색 · 행동 1회',exact=True).click();expect(page.locator('.action-layer')).to_have_count(0)
  after=read()['game'];assert after['minute']==before['minute']+480
  assert [i for i in after['board'] if i.get('marketId')!='computers']==[i for i in before['board'] if i.get('marketId')!='computers']
  # Actual purchase and zero-action appraisal at three different scales.
  for mid,name,_,_ in [MARKETS[1],MARKETS[3],MARKETS[4]]:
   rich=json.loads(json.dumps(data));rich['game']['cash']=100000000000;rich['game']['stats']['peakCash']=100000000000;rich['selectedMarket']=mid
   page.evaluate(WRITE,rich);page.reload();page.get_by_role('heading',name='활동',exact=True).wait_for();market();page.locator('.item-row').first.click()
   item=next(i for i in rich['game']['board'] if i.get('marketId')==mid)
   page.get_by_role('button',name='구매 내용 확인').click();page.get_by_role('button',name='지불·수령 확정 · 행동 1회',exact=True).click();expect(page.locator('.action-layer')).to_have_count(0)
   bought=read()['game'];assert bought['inventory'][0]['marketId']==mid and bought['inventory'][0]['acquiredFor']==item['price']
   page.get_by_role('button',name='← 뒤로',exact=True).click();page.get_by_role('button',name='닫기',exact=True).click()
   page.get_by_role('navigation',name='주요 메뉴').get_by_role('button',name='보관함',exact=True).click();page.locator('.item-row').first.click()
   page.get_by_role('button',name='가치 확인 · 행동 소모 없음',exact=False).click();expect(page.locator('.action-layer')).to_have_count(0)
   checked=read()['game'];assert checked['minute']==bought['minute'] and checked['seed']==bought['seed'] and checked['board']==bought['board'] and checked['cash']<bought['cash']
   expect(page.locator('.item-findings')).to_be_visible()
   if mid=='property':expect(page.locator('.item-findings')).to_contain_text('권리')
   if mid=='cars':expect(page.locator('.item-findings')).to_contain_text('서류')
   expect(page.get_by_role('button',name=name+'에 판매 등록',exact=True)).to_be_visible()
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.get_by_role('button',name='설정',exact=True).click();page.get_by_role('button',name='저장·백업 관리',exact=True).click()
  with page.expect_download() as download:page.get_by_role('button',name='백업 파일 내보내기',exact=True).click()
  backup=json.loads(Path(download.value.path()).read_text());assert backup['selectedMarket']=='property' and backup['game']['inventory'][0]['marketId']=='property'
  # A saved retired board must not prevent loading or erase owned aircraft.
  legacy=json.loads(json.dumps(data));plane=json.loads(json.dumps(legacy['game']['board'][0]))
  plane.update(id='legacy-plane',marketId='aircraft',kind='항공기',title='경량 항공기',acquiredFor=2000000000)
  plane.pop('listing',None);legacy['game']['inventory']=[plane]
  old_listing=json.loads(json.dumps(plane));old_listing['id']='legacy-plane-listing';legacy['game']['board'].append(old_listing);legacy['selectedMarket']='aircraft'
  page.evaluate(WRITE,legacy);page.reload();page.get_by_role('heading',name='활동',exact=True).wait_for();market()
  expect(page.locator('.market-selection strong')).to_have_text('장터')
  expect(page.locator('.market-selector button')).to_have_count(6)
  page.locator('.market-selector').get_by_role('button',name='컴퓨터시장',exact=True).click()
  normalized=read();assert normalized['selectedMarket']=='computers'
  assert not any(i.get('marketId')=='aircraft' for i in normalized['game']['board'])
  assert normalized['game']['inventory'][0]==plane
  assert normalized['game']['cash']==legacy['game']['cash'] and normalized['game']['minute']==legacy['game']['minute']
  assert not errors,errors
  print(json.dumps({'width':width,'six_markets_free_switch_refresh_purchase_verification_backup':'PASS'}),flush=True)
  ctx.close()
 browser.close()
