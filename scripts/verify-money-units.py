"""Hundred-won migration, UI rounding preview, ledger payments and weekly settlement."""
import json, os
from playwright.sync_api import sync_playwright, expect
BASE=os.getenv('SCREEN_BASE_URL','http://127.0.0.1:4182')
READ="""async()=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});return await new Promise(r=>{const q=db.transaction('saves').objectStore('saves').get('current');q.onsuccess=()=>{db.close();r(q.result)}})}"""
WRITE="""async data=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});await new Promise(r=>{const tx=db.transaction('saves','readwrite');tx.objectStore('saves').put(data,'current');tx.oncomplete=r});db.close()}"""
KEYS={'cash','principal','interest','principalRepaidThisWeek','earned','repaid','peakCash','price','base','value','acquiredFor','negotiatedPrice','floor','previousOffer','currentBid','competitorMax','step','max'}
def aligned(node):
 if isinstance(node,dict):
  for k,v in node.items():
   if k in KEYS and v is not None:assert isinstance(v,int) and v%100==0,(k,v)
   if k=='offers':assert all(n%100==0 for n in v)
   aligned(v)
 elif isinstance(node,list):
  for v in node:aligned(v)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in [320,375,390,430]:
  ctx=browser.new_context(viewport={'width':width,'height':844},is_mobile=True,has_touch=True)
  page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(BASE);page.get_by_role('heading',name='활동',exact=True).wait_for()
  page.wait_for_function('async()=>!!(await ('+READ+')())')
  old=page.evaluate(READ);g=old['game'];g.pop('moneyUnit',None);g['cash']=500049;g['marketFactor']=100
  item=g['board'].pop(0);item.update({'acquiredFor':1050,'base':20001,'value':10001,'checked':True});g['inventory']=[item];g['trend']=item['kind']
  page.evaluate(WRITE,old);page.reload();page.get_by_role('heading',name='활동',exact=True).wait_for()
  expect(page.locator('.header-cash')).to_contain_text('500,000 원')
  page.get_by_role('navigation',name='주요 메뉴').get_by_role('button',name='보관함',exact=True).click()
  box=page.locator('.item-comparison').first
  expect(box.locator('[data-field=cost]')).to_have_text('1,100 원');expect(box.locator('[data-field=value]')).to_have_text('12,000 원')
  page.get_by_role('navigation',name='주요 메뉴').get_by_role('button',name='활동',exact=True).click()
  page.get_by_role('button',name='즉시 판매',exact=True).click();page.locator('.sheet-layer .item-row').first.click()
  expect(page.locator('.sheet-layer')).to_contain_text('6,000 원')
  page.get_by_role('button',name='판매 확정 · 행동 1회',exact=True).click();expect(page.locator('.action-layer')).to_have_count(0)
  def read():return page.evaluate(READ)['game']
  assert read()['cash']==506000 and read()['moneyUnit']==100;aligned(read())
  page.get_by_role('button',name='닫기',exact=True).click()
  page.get_by_role('navigation',name='주요 메뉴').get_by_role('button',name='채무',exact=True).click()
  field=page.get_by_label('상환 금액',exact=True);button=page.get_by_role('button',name='입력 금액 상환 · 행동 1회',exact=True)
  for raw,actual in [('1049',1000),('1050',1100),('50',100)]:
   before=read();field.fill(raw)
   expect(page.locator('.amount-form p')).to_contain_text(f'{actual:,} 원 · 100원 단위 반올림')
   button.click();expect(page.locator('.action-layer')).to_have_count(0)
   after=read();assert before['cash']-after['cash']==actual and before['principal']-after['principal']==actual;aligned(after)
  assert read()['cash']==503800 and read()['principalRepaidThisWeek']==2200
  for invalid in ['49','1.5','1e3','-1',' ']:
   field.fill(invalid);expect(button).to_be_disabled()
  page.screenshot(path=f'work/money-units-{width}.png',full_page=True)
  page.get_by_role('navigation',name='주요 메뉴').get_by_role('button',name='활동',exact=True).click()
  page.get_by_role('button',name='이번 주 마무리하기',exact=True).click();page.get_by_role('button',name='이번 주 마무리 · 정산 시작',exact=True).click()
  page.get_by_role('button',name='의무 원금 납부 · 47,800 원',exact=True).click();expect(page.locator('.action-layer')).to_have_count(0)
  page.get_by_role('button',name='이자 납부 후 다음 주 시작 · 100,000 원',exact=True).click();expect(page.locator('.action-layer')).to_have_count(0)
  paid=read();assert paid['cash']==356000 and paid['principal']==9999950000 and paid['interestWeek']==1;aligned(paid)
  expect(page.locator('.header-interest')).to_contain_text(['100,000 원','300,000 원'])
  page.reload();expect(page.locator('.status-day')).to_have_text('2주차');assert read()==paid
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert not errors,errors
  ctx.close();print(f'{width}px hundred-won migration, price comparison, 1049/1050/50 input, invalid input, actual ledger, settlement/reload PASS',flush=True)
 browser.close()
