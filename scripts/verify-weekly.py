"""Twenty-action weeks: mandatory principal, interest order, credit, migration and bankruptcy."""
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
  expect(page.locator('.status-clock')).to_have_text('남은 행동 20/20')
  page.wait_for_function('async()=>!!(await ('+READ+')())')
  original=page.evaluate(READ)
  def read():return page.evaluate(READ)['game']
  def load(data):
   page.evaluate(WRITE,data);page.reload();page.get_by_role('heading',name='활동',exact=True).wait_for()
  def finish():
   page.get_by_role('button',name='이번 주 마무리하기',exact=True).click()
   page.get_by_role('button',name='이번 주 마무리 · 정산 시작',exact=True).click()
  def complete(amount):
   page.get_by_role('button',name=f'의무 원금 납부 · {amount:,} 원',exact=True).click();expect(page.locator('.action-layer')).to_have_count(0)
   page.get_by_role('button',name='이자 납부 후 다음 주 시작',exact=False).click();expect(page.locator('.action-layer')).to_have_count(0)
  page.get_by_role('button',name='이번 주 마무리하기',exact=True).click()
  expect(page.get_by_role('heading',name='1주차 정산',exact=True)).to_be_visible()
  assert read()==original['game']
  page.get_by_role('button',name='닫기',exact=True).click()
  finish()
  expect(page.get_by_role('button',name='이자 납부 후 다음 주 시작 · 100,000 원',exact=True)).to_be_disabled()
  page.get_by_role('button',name='의무 원금 납부 · 50,000 원',exact=True).click();expect(page.locator('.action-layer')).to_have_count(0)
  assert read()['principal']==9999950000 and read()['principalRepaidThisWeek']==50000 and read()['cash']==450000
  page.reload();expect(page.get_by_role('heading',name='1주차 정산',exact=True)).to_be_visible()
  expect(page.get_by_role('button',name='의무 원금 납부',exact=False)).to_have_count(0)
  assert read()['principalRepaidThisWeek']==50000
  page.screenshot(path=f'work/principal-settlement-{width}.png',full_page=True)
  page.get_by_role('button',name='이자 납부 후 다음 주 시작 · 100,000 원',exact=True).click();expect(page.locator('.action-layer')).to_have_count(0)
  expect(page.locator('.status-day')).to_have_text('2주차');expect(page.locator('.status-clock')).to_have_text('남은 행동 20/20')
  paid=read();assert paid['cash']==350000 and paid['interestWeek']==1 and paid['principalRepaidThisWeek']==0
  expect(page.locator('.header-interest')).to_contain_text(['100,000 원','299,996 원'])
  page.reload();expect(page.locator('.status-day')).to_have_text('2주차');assert read()==paid
  # Last available action shows settlement rather than advancing automatically.
  data=json.loads(json.dumps(original));data['game']['weekActions']=19;data['game']['minute']=19*480
  load(data);page.get_by_role('button',name='아르바이트',exact=True).click()
  page.get_by_role('button',name='일하기 · 행동 1회',exact=True).first.click();expect(page.locator('.action-layer')).to_have_count(0)
  expect(page.locator('.status-clock')).to_have_text('남은 행동 0/20');expect(page.locator('.status-day')).to_have_text('1주차')
  footer=page.get_by_role('button',name='이번주 정산하기',exact=True);expect(footer).to_be_visible()
  assert footer.bounding_box()['y']+footer.bounding_box()['height']<=844
  page.get_by_role('button',name='닫기',exact=True).click();page.reload();expect(footer).to_be_visible()
  footer.click();page.get_by_role('button',name='이번 주 마무리 · 정산 시작',exact=True).click()
  page.get_by_label('상환 금액',exact=True).fill('100000')
  page.get_by_role('button',name='입력 금액 상환 · 행동 소모 없음',exact=True).click();expect(page.locator('.action-layer')).to_have_count(0)
  assert read()['principalRepaidThisWeek']==100000
  page.get_by_role('button',name='이자 납부 후 다음 주 시작 · 99,999 원',exact=True).click();expect(page.locator('.action-layer')).to_have_count(0)
  assert read()['cash']==309001 and read()['weekActions']==0 and read()['principalRepaidThisWeek']==0
  # Voluntary prepayment reduces this week's mandatory amount.
  load(original);page.get_by_role('navigation',name='주요 메뉴').get_by_role('button',name='채무',exact=True).click()
  page.get_by_label('상환 금액',exact=True).fill('20000')
  page.get_by_role('button',name='입력 금액 상환 · 행동 1회',exact=True).click();expect(page.locator('.action-layer')).to_have_count(0)
  assert read()['principalRepaidThisWeek']==20000 and read()['weekActions']==1
  page.get_by_role('navigation',name='주요 메뉴').get_by_role('button',name='활동',exact=True).click()
  finish();complete(30000);assert read()['cash']==350000
  # Exact funds leave zero cash but remain playable; one won short ends on confirmation.
  exact=json.loads(json.dumps(original));exact['game']['cash']=150000;load(exact);finish();complete(50000)
  assert read()['cash']==0 and read()['status']=='playing'
  page.get_by_role('button',name='아르바이트',exact=True).click();page.get_by_role('button',name='일하기 · 행동 1회',exact=True).first.click()
  expect(page.locator('.action-layer')).to_have_count(0);assert read()['cash']==9000
  poor=json.loads(json.dumps(original));poor['game']['cash']=149999;load(poor);finish()
  expect(page.get_by_role('heading',name='이 이야기는 여기까지.',exact=True)).to_be_visible();assert read()['status']=='bankrupt'
  # An old 30-action save with 25 actions used migrates to 0/20 without resetting finances.
  old=json.loads(json.dumps(original));g=old['game'];g.pop('weeklyRulesVersion');g.pop('principalRepaidThisWeek')
  g.update({'cash':2000000,'interestWeek':2,'weekActions':25,'minute':2*14400+25*480})
  load(old);expect(page.locator('.status-clock')).to_have_text('남은 행동 0/20');expect(page.locator('.status-day')).to_have_text('3주차')
  page.get_by_role('button',name='이번주 정산하기',exact=True).click();page.get_by_role('button',name='이번 주 마무리 · 정산 시작',exact=True).click()
  assert read()['weeklyRulesVersion']==2 and read()['minute']==3*9600 and read()['cash']==2000000
  # Debt below the scheduled principal is settled at its remaining balance only.
  final=json.loads(json.dumps(original));final['game']['principal']=30000;final['game']['cash']=30000
  load(final);finish();page.get_by_role('button',name='의무 원금 납부 · 30,000 원',exact=True).click()
  expect(page.locator('.action-layer')).to_have_count(0);expect(page.get_by_role('heading',name='드디어, 자유.',exact=True)).to_be_visible()
  assert read()['cash']==0 and read()['principal']==0
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert not errors,errors
  ctx.close();print(f'{width}px 20-action budget, principal before interest, prepayment credit, save/reload, migration, exact funds/bankruptcy/final clear PASS',flush=True)
 browser.close()
