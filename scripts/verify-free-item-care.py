"""Appraisal and repair spend money but never advance actions, dates or deadlines."""
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
  data=json.loads(Path('work/rich.json').read_text());g=data['game']
  g.update({'minute':9120,'weekActions':19,'marketDay':10,'interestWeek':0,'cash':500000})
  item=g['board'].pop(0);item.update({'base':100000,'value':18000,'condition':'고장','checked':False,'repaired':False,'acquiredFor':76000})
  g['inventory']=[item]
  for listing in g['board']:listing['expires']=9121
  page.evaluate(WRITE,data);page.reload();page.get_by_role('heading',name='활동',exact=True).wait_for()
  page.get_by_role('navigation',name='주요 메뉴').get_by_role('button',name='보관함',exact=True).click()
  page.locator('.item-row').first.click()
  page.get_by_role('button',name='가치 확인 · 행동 소모 없음 · 1,000 원',exact=True).click()
  expect(page.locator('.action-layer')).to_have_count(0)
  saved=page.evaluate(READ)
  assert saved['cash']==499000 and saved['minute']==9120 and saved['inventory'][0]['checked']
  assert saved['seed']==g['seed'] and saved['board']==g['board'] and saved['event']==g['event']
  page.get_by_role('button',name='수리하기 · 행동 소모 없음',exact=True).click()
  expect(page.locator('.action-layer')).to_have_count(0)
  saved=page.evaluate(READ)
  assert saved['cash']==487000 and saved['minute']==9120 and saved['inventory'][0]['repaired']
  assert saved['board']==g['board'] and saved['event']==g['event'] and saved['interestWeek']==0
  expect(page.locator('.status-day')).to_have_text('1주차')
  expect(page.locator('.status-clock')).to_have_text('남은 행동 1/20')
  expect(page.get_by_role('button',name='수리하기 · 행동 소모 없음',exact=True)).to_have_count(0)
  page.screenshot(path=f'work/free-item-care-{width}.png',full_page=True)
  page.reload();page.get_by_role('heading',name='활동',exact=True).wait_for()
  saved=page.evaluate(READ);assert saved['minute']==9120 and saved['cash']==487000 and saved['inventory'][0]['repaired']
  page.locator('.activity-grid').get_by_role('button',name='아르바이트',exact=True).click()
  page.get_by_role('button',name='일하기 · 행동 1회',exact=True).first.click()
  expect(page.locator('.action-layer')).to_have_count(0)
  page.get_by_role('button',name='이번주 정산하기',exact=True).click()
  page.get_by_role('button',name='이번 주 마무리 · 정산 시작',exact=True).click()
  expect(page.get_by_role('heading',name='1주차 정산',exact=True)).to_be_visible()
  assert page.evaluate(READ)['minute']==9600
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  assert not errors,errors
  results.append({'width':width,'appraisal_zero_actions':'PASS','repair_zero_actions':'PASS','fees_and_reload':'PASS','next_major_action_reaches_due':'PASS'})
  ctx.close()
 browser.close();print(json.dumps(results))
