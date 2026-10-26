"""Unified instant sales: exact 60% actual value, free entry and atomic completion."""
import json, os, subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
subprocess.run(['node','scripts/prepare-browser-fixtures.mjs'],check=True)
BASE=os.getenv('SCREEN_BASE_URL','http://127.0.0.1:4182')
READ="""async()=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});return await new Promise(r=>{const q=db.transaction('saves').objectStore('saves').get('current');q.onsuccess=()=>{db.close();r(q.result)}})}"""
WRITE="""async data=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});await new Promise(r=>{const tx=db.transaction('saves','readwrite');tx.objectStore('saves').put(data,'current');tx.oncomplete=r});db.close()}"""
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in [320,375,390,430]:
  ctx=browser.new_context(viewport={'width':width,'height':844},is_mobile=True,has_touch=True)
  page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(BASE);page.get_by_role('heading',name='활동',exact=True).wait_for()
  data=json.loads(Path('work/rich.json').read_text());g=data['game'];item=g['board'].pop(0)
  item.update({'value':100001,'checked':False,'acquiredFor':1,'price':9999999})
  g['inventory']=[item];g['marketFactor']=200;g['trend']=item['kind']
  g['quotes']={'outlet':'collector','at':0,'prices':{item['id']:99999999}}
  def load(d):
   page.evaluate(WRITE,d);page.reload();page.get_by_role('heading',name='활동',exact=True).wait_for()
  def enter():page.locator('.activity-grid').get_by_role('button',name='즉시 판매',exact=True).click()
  load(data);original=page.evaluate(READ)['game'];enter()
  expect(page.get_by_role('heading',name='즉시 판매',exact=True)).to_be_visible()
  expect(page.get_by_text('실제 가치의 60%로 판매합니다.',exact=True)).to_be_visible()
  expect(page.get_by_role('button',name='고물상 방문',exact=True)).to_have_count(0)
  expect(page.locator('.sheet-layer .item-row')).to_contain_text('60,000 원')
  assert page.locator('.action-layer').count()==0 and page.evaluate(READ)['game']==original
  page.locator('.sheet-layer .item-row').click()
  page.get_by_role('button',name='계속 보관',exact=True).click()
  assert page.evaluate(READ)['game']==original
  page.locator('.sheet-layer .item-row').click()
  page.screenshot(path=f'work/instant-sale-{width}.png',full_page=True)
  page.get_by_role('button',name='판매 확정 · 행동 1회',exact=True).click()
  expect(page.locator('.action-layer')).to_have_count(0)
  sold=page.evaluate(READ)['game'];assert sold['cash']==560000 and len(sold['inventory'])==0 and sold['minute']==480
  assert sold['stats']['sales']==original['stats']['sales']+1
  expect(page.get_by_text('보유한 물품이 없습니다.',exact=True)).to_be_visible()
  page.reload();page.get_by_role('heading',name='활동',exact=True).wait_for();assert page.evaluate(READ)['game']==sold
  enter();expect(page.get_by_text('보유한 물품이 없습니다.',exact=True)).to_be_visible()
  # Listed assets remain owned and cannot be sold twice via another channel.
  listed=json.loads(json.dumps(data));listed['game']['sales']=[{'id':'listed','itemId':item['id'],'price':1000,'created':0,'expires':2880,'nextCheck':480}]
  load(listed);enter();expect(page.locator('.sheet-layer .item-row')).to_be_disabled()
  expect(page.locator('.sheet-layer .item-row')).to_contain_text('판매 등록 취소 필요')
  # No actions left: preview is free, completion stays blocked.
  exhausted=json.loads(json.dumps(data));exhausted['game']['weekActions']=20;exhausted['game']['minute']=9600
  load(exhausted);enter();page.locator('.sheet-layer .item-row').click()
  expect(page.get_by_role('button',name='판매 확정 · 행동 1회',exact=True)).to_be_disabled()
  expect(page.get_by_role('button',name='이번주 정산하기',exact=True)).to_be_visible()
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  assert not errors,errors
  ctx.close();print(f'{width}px instant sale description, 60% price, no visit, payment/reload, listed/zero-budget protection: PASS',flush=True)
 browser.close()
