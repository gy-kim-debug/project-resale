"""Intuitive special listings, automatic ability growth and once-per-week business income."""
import json, os, subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
subprocess.run(['node','scripts/prepare-special-business-fixtures.mjs'],check=True)
CASES=json.loads(Path('work/special-business-cases.json').read_text())
NAMES={'clearance':'폐업 정리','collector':'소장품 출품','unverified':'미확인 특가'}
BASE=os.getenv('SCREEN_BASE_URL','http://127.0.0.1:4182')
READ="""async()=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});return await new Promise(r=>{const q=db.transaction('saves').objectStore('saves').get('current');q.onsuccess=()=>{db.close();r(q.result)}})}"""
WRITE="""async data=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});await new Promise(r=>{const tx=db.transaction('saves','readwrite');tx.objectStore('saves').put(data,'current');tx.oncomplete=r});db.close()}"""
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in [320,375,390,430]:
  ctx=browser.new_context(viewport={'width':width,'height':844},is_mobile=True,has_touch=True)
  page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(BASE);page.get_by_role('heading',name='활동',exact=True).wait_for();page.wait_for_function('async()=>!!(await ('+READ+')())')
  original=page.evaluate(READ)
  def read():return page.evaluate(READ)['game']
  def load(data):
   page.evaluate(WRITE,data);page.reload();page.get_by_role('heading',name='활동',exact=True).wait_for()
  def tab(name):page.get_by_role('navigation',name='주요 메뉴').get_by_role('button',name=name,exact=True).click()
  def finish():
   page.get_by_role('button',name='이번 주 마무리하기',exact=True).click();page.get_by_role('button',name='이번 주 마무리 · 정산 시작',exact=True).click()
  def pay(principal,interest):
   page.get_by_role('button',name=f'의무 원금 납부 · {principal:,} 원',exact=True).click();expect(page.locator('.action-layer')).to_have_count(0)
   page.get_by_role('button',name=f'이자 납부 후 다음 주 시작 · {interest:,} 원',exact=True).click();expect(page.locator('.action-layer')).to_have_count(0)
  page.get_by_role('button',name='사업',exact=True).click()
  stand=page.locator('section.card').filter(has=page.get_by_role('heading',name='중고 판매대',exact=True))
  expect(stand).to_contain_text('주간 수입 20,000 원');expect(stand).to_contain_text('100,000 원')
  before=read();stand.get_by_role('button',name='구매',exact=True).click()
  assert read()==before
  stand.get_by_role('button',name='사업 구매 확정 · 행동 1회',exact=True).click();expect(page.locator('.action-layer')).to_have_count(0)
  expect(stand.get_by_text('보유 중',exact=True)).to_be_visible()
  bought=read();assert bought['cash']==400000 and bought['weekActions']==1 and len(bought['businesses'])==1 and bought['stats']['purchases']==0
  page.reload();page.get_by_role('heading',name='활동',exact=True).wait_for();assert read()==bought
  tab('상점');expect(page.get_by_role('heading',name='주간 사업 수입',exact=True)).to_be_visible()
  expect(page.get_by_text('보유 중',exact=True)).to_be_visible();assert read()==bought
  if width==390:page.screenshot(path='work/business-shop-390.png',full_page=True)
  tab('활동');page.get_by_role('button',name='이번 주 마무리하기',exact=True).click();assert read()==bought
  page.get_by_role('button',name='닫기',exact=True).click();finish()
  assert read()['cash']==420000 and read()['businessIncomeWeek']==1 and read()['businessIncomeAmount']==20000
  page.reload();expect(page.get_by_role('heading',name='1주차 정산',exact=True)).to_be_visible()
  assert read()['cash']==420000;pay(50000,100000)
  assert read()['cash']==270000 and read()['interestWeek']==1 and read()['businessIncomeWeek']==1
  # Income is credited before checking the next bill, and cannot be collected twice on reload.
  bridge=page.evaluate(READ);bridge['game']['cash']=380000;load(bridge);finish()
  assert read()['cash']==400000 and read()['businessIncomeWeek']==2
  page.reload();expect(page.get_by_role('heading',name='2주차 정산',exact=True)).to_be_visible();assert read()['cash']==400000
  pay(100000,300000);assert read()['cash']==0 and read()['status']=='playing'
  # Automatic purchase growth appears in the existing character screen.
  growth=json.loads(json.dumps(original));growth['game']['stats']['purchases']=4;load(growth);tab('내 정보')
  expect(page.get_by_role('heading',name='매입 감각 Lv.0',exact=True)).to_be_visible()
  tab('활동');page.get_by_role('button',name='중고 장터',exact=True).click();page.locator('.sheet-layer .item-row').first.click()
  page.get_by_role('button',name='구매 내용 확인',exact=False).click();page.get_by_role('button',name='지불·수령 확정 · 행동 1회',exact=True).click();expect(page.locator('.action-layer')).to_have_count(0)
  assert read()['stats']['purchases']==5
  page.reload();page.get_by_role('heading',name='활동',exact=True).wait_for();tab('내 정보')
  expect(page.get_by_role('heading',name='매입 감각 Lv.1',exact=True)).to_be_visible()
  # All three specials follow the same listing -> buy -> inventory flow without leaking appraisal facts.
  for case in CASES:
   data=case['save'];g=data['game'];iid=case['id'];sid=case['special'];rows=[i for i in g['board'] if i.get('marketId','street')=='street' and i['price']>0]
   index=next(n for n,i in enumerate(rows) if i['id']==iid);item=rows[index]
   load(data);page.get_by_role('button',name='중고 장터',exact=True).click()
   row=page.locator('.sheet-layer .item-row').nth(index);expect(row.locator('.special-listing')).to_have_text('특별 · '+NAMES[sid]);row.click()
   expect(page.locator('.special-listing')).to_have_text('특별 · '+NAMES[sid]);expect(page.locator('.item-findings')).to_have_count(0)
   if width==390:page.screenshot(path=f'work/special-{sid}-390.png',full_page=True)
   page.get_by_role('button',name='구매 내용 확인',exact=False).click();page.get_by_role('button',name='지불·수령 확정 · 행동 1회',exact=True).click();expect(page.locator('.action-layer')).to_have_count(0)
   saved=read();assert saved['inventory'][0]['special']==sid and saved['inventory'][0]['acquiredFor']==item['price'] and not saved['inventory'][0]['checked']
   page.reload();page.get_by_role('heading',name='활동',exact=True).wait_for();tab('보관함')
   expect(page.locator('.special-listing')).to_have_text('특별 · '+NAMES[sid])
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert not errors,errors
  ctx.close();print(f'{width}px special labels/purchase/reload, business buy/income/debt/order/once-only, automatic ability growth PASS',flush=True)
 browser.close()
