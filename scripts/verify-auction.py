"""Auction purchase QA including free bidding, reload/offline and exact settlement."""
import json
import os
import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
subprocess.run(['node','scripts/prepare-browser-fixtures.mjs'],check=True)
BASE=os.getenv('SCREEN_BASE_URL','http://127.0.0.1:4182')
READ="""async()=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});return await new Promise(r=>{const q=db.transaction('saves').objectStore('saves').get('current');q.onsuccess=()=>{db.close();r(q.result)}})}"""
WRITE="""async data=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});await new Promise(r=>{const tx=db.transaction('saves','readwrite');tx.objectStore('saves').put(data,'current');tx.oncomplete=r});db.close()}"""
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
 for width in [320,375,390,430]:
  ctx=browser.new_context(viewport={'width':width,'height':844},is_mobile=True,has_touch=True)
  page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(BASE);page.get_by_role('heading',name='활동',exact=True).wait_for()
  data=json.loads(Path('work/rich.json').read_text());data['selectedMarket']='auction'
  def load(payload):
   page.evaluate(WRITE,payload);page.reload();page.get_by_role('heading',name='활동',exact=True).wait_for()
   page.locator('.activity-grid').get_by_role('button',name='장터',exact=True).click()
  def read():return page.evaluate(READ)
  def first_lot():page.locator('.item-row').first.click()
  load(data);expect(page.locator('.market-selection strong')).to_have_text('고가 경매시장');expect(page.locator('.item-row')).to_have_count(8)
  first_lot()
  assert page.get_by_role('button',name=' 입찰 · 행동 소모 없음').count()==3
  assert all(b.is_disabled() for b in page.get_by_role('button',name=' 입찰 · 행동 소모 없음').all())
  expect(page.get_by_role('button',name='구매 내용 확인')).to_have_count(0)
  data['game']['cash']=100000000000;data['game']['stats']['peakCash']=100000000000
  load(data);first_lot();lot=next(i for i in data['game']['board'] if i.get('marketId')=='auction');lotid=lot['id'];before=read()['game']
  expect(page.locator('.item-findings')).to_have_count(0)
  page.get_by_role('button',name=' 입찰 · 행동 소모 없음').first.click()
  expect(page.locator('.chat-message')).to_have_count(3)
  assert page.locator('.action-layer').count()==0
  saved=read()['game'];assert saved['cash']==before['cash'] and saved['minute']==before['minute'] and saved['seed']==before['seed']
  page.wait_for_function('!!navigator.serviceWorker.controller',timeout=15000)
  ctx.set_offline(True);page.reload();page.get_by_role('heading',name='활동',exact=True).wait_for()
  page.locator('.activity-grid').get_by_role('button',name='장터',exact=True).click();first_lot();expect(page.locator('.chat-message')).to_have_count(3)
  while page.get_by_role('button',name=' 입찰 · 행동 소모 없음').count():
   page.get_by_role('button',name=' 입찰 · 행동 소모 없음').first.click()
   assert page.locator('.action-layer').count()==0
  live=next(i for i in read()['game']['board'] if i['id']==lotid)
  assert live['auction']['status']=='won' and live['auction']['rounds']<=6
  won=live['auction']['currentBid'];assert read()['game']['cash']==before['cash'] and read()['game']['minute']==before['minute']
  page.get_by_role('log').scroll_into_view_if_needed();page.screenshot(path=f'work/auction-won-{width}.png',full_page=True)
  page.get_by_role('button',name='낙찰 내용 확인').click();page.get_by_role('button',name='낙찰 대금 결제 · 행동 1회',exact=True).click()
  expect(page.locator('.action-layer')).to_have_count(0)
  paid=read()['game'];assert paid['cash']==before['cash']-won and paid['minute']==before['minute']+480
  assert paid['inventory'][0]['acquiredFor']==won and paid['inventory'][0]['marketId']=='auction'
  page.get_by_role('button',name='받은 물품 확인',exact=True).click()
  expect(page.locator('.item-findings')).to_have_count(0)
  page.get_by_role('button',name='가치 확인 · 행동 소모 없음',exact=False).click();expect(page.locator('.action-layer')).to_have_count(0)
  expect(page.locator('.item-findings')).to_be_visible();expect(page.get_by_role('button',name='위탁 판매 등록',exact=True)).to_be_visible()
  assert read()['game']['minute']==paid['minute']
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.get_by_role('button',name='설정',exact=True).click();page.get_by_role('button',name='저장·백업 관리',exact=True).click()
  with page.expect_download() as download:page.get_by_role('button',name='백업 파일 내보내기',exact=True).click()
  backup=json.loads(Path(download.value.path()).read_text());assert backup['selectedMarket']=='auction' and backup['game']['inventory'][0]['acquiredFor']==won
  ctx.set_offline(False)
  load(data);first_lot();page.get_by_role('button',name='입찰 포기 · 행동 소모 없음',exact=True).click()
  expect(page.get_by_role('button',name=' 입찰 · 행동 소모 없음')).to_have_count(0)
  expect(page.get_by_text('경매를 포기했습니다.',exact=True).first).to_be_visible()
  assert read()['game']['cash']==data['game']['cash'] and read()['game']['minute']==data['game']['minute']
  assert not errors,errors
  print(json.dumps({'width':width,'bids_reload_offline_settlement_appraisal_backup_withdraw':'PASS'}),flush=True)
  ctx.close()
 browser.close()
