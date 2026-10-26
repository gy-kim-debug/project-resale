"""Mobile weekly budget, explicit/early settlement, persistence and bankruptcy checks."""
import json, os
from playwright.sync_api import sync_playwright, expect
BASE=os.getenv('SCREEN_BASE_URL','http://127.0.0.1:4182')
READ="""async()=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});return await new Promise(r=>{const q=db.transaction('saves').objectStore('saves').get('current');q.onsuccess=()=>{db.close();r(q.result)}})}"""
WRITE="""async data=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});await new Promise(r=>{const tx=db.transaction('saves','readwrite');tx.objectStore('saves').put(data,'current');tx.oncomplete=r});db.close()}"""
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in [320,375,390,430]:
  ctx=browser.new_context(viewport={'width':width,'height':844},is_mobile=True,has_touch=True)
  page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(BASE);page.get_by_role('heading',name='활동',exact=True).wait_for()
  expect(page.locator('.status-day')).to_have_text('1주차');expect(page.locator('.status-clock')).to_have_text('남은 행동 30/30')
  page.wait_for_function('''async () => {const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});return await new Promise(r=>{const q=db.transaction('saves').objectStore('saves').get('current');q.onsuccess=()=>{db.close();r(!!q.result)}})}''')
  original=page.evaluate(READ)
  page.get_by_role('button',name='이번 주 마무리하기',exact=True).click()
  expect(page.get_by_role('heading',name='1주차 정산',exact=True)).to_be_visible()
  assert page.evaluate(READ)['game']==original['game']
  page.get_by_role('button',name='닫기',exact=True).click()
  page.get_by_role('button',name='이번 주 마무리하기',exact=True).click()
  page.get_by_role('button',name='이번 주 마무리 · 정산 시작',exact=True).click()
  expect(page.get_by_role('button',name='이자 납부 후 다음 주 시작 · 100,000 원',exact=True)).to_be_visible()
  assert page.get_by_role('button',name='닫기',exact=True).count()==0
  assert page.evaluate(READ)['game']['settling'] is True
  page.reload();expect(page.get_by_role('heading',name='1주차 정산',exact=True)).to_be_visible()
  page.get_by_role('button',name='이자 납부 후 다음 주 시작 · 100,000 원',exact=True).click()
  expect(page.locator('.action-layer')).to_have_count(0)
  expect(page.locator('.status-day')).to_have_text('2주차');expect(page.locator('.status-clock')).to_have_text('남은 행동 30/30')
  paid=page.evaluate(READ)['game'];assert paid['cash']==400000 and paid['interestWeek']==1 and not paid['settling']
  page.reload();expect(page.locator('.status-day')).to_have_text('2주차')
  assert page.evaluate(READ)['game']==paid
  # Consume the final action from inside an activity; footer must stay visible in the sheet.
  data=json.loads(json.dumps(original));data['game']['weekActions']=29;data['game']['minute']=29*480
  page.evaluate(WRITE,data);page.reload();page.get_by_role('button',name='아르바이트',exact=True).click()
  page.get_by_role('button',name='일하기 · 행동 1회',exact=True).first.click();expect(page.locator('.action-layer')).to_have_count(0)
  expect(page.locator('.status-clock')).to_have_text('남은 행동 0/30');expect(page.locator('.status-day')).to_have_text('1주차')
  footer=page.get_by_role('button',name='이번주 정산하기',exact=True);expect(footer).to_be_visible()
  box=footer.bounding_box();assert box['y']+box['height']<=844
  page.screenshot(path=f'work/weekly-exhausted-{width}.png',full_page=True)
  # Navigation does not refill the exhausted budget; reload also preserves it.
  page.get_by_role('button',name='닫기',exact=True).click();expect(footer).to_be_visible()
  page.reload();expect(page.locator('.status-clock')).to_have_text('남은 행동 0/30');expect(footer).to_be_visible()
  footer.click();page.get_by_role('button',name='이번 주 마무리 · 정산 시작',exact=True).click()
  page.get_by_label('상환 금액',exact=True).fill('100000')
  page.get_by_role('button',name='입력 금액 상환 · 행동 소모 없음',exact=True).click();expect(page.locator('.action-layer')).to_have_count(0)
  expect(page.get_by_role('button',name='이자 납부 후 다음 주 시작 · 99,999 원',exact=True)).to_be_visible()
  page.screenshot(path=f'work/weekly-settlement-{width}.png',full_page=True)
  page.get_by_role('button',name='이자 납부 후 다음 주 시작 · 99,999 원',exact=True).click();expect(page.locator('.action-layer')).to_have_count(0)
  after=page.evaluate(READ)['game'];assert after['cash']==309001 and after['principal']==9999900000 and after['weekActions']==0 and after['interestWeek']==1
  # Bankruptcy happens on settlement confirmation, not merely viewing its preview.
  poor=json.loads(json.dumps(original));poor['game']['cash']=99999
  page.evaluate(WRITE,poor);page.reload();page.get_by_role('button',name='이번 주 마무리하기',exact=True).click()
  assert page.evaluate(READ)['game']['status']=='playing'
  page.get_by_role('button',name='이번 주 마무리 · 정산 시작',exact=True).click()
  expect(page.get_by_role('heading',name='이 이야기는 여기까지.',exact=True)).to_be_visible()
  assert page.evaluate(READ)['game']['status']=='bankrupt'
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  assert not errors,errors
  ctx.close();print(f'{width}px weekly/early settlement, remaining-principal interest, persistence, zero budget, bankruptcy: PASS',flush=True)
 browser.close()
