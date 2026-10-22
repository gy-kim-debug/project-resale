"""Mobile QA: increasing weekly interest, compulsory payment, arrears and cash-zero play."""
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
  expect(page.locator('meter')).to_have_count(0)
  expect(page.locator('.header-cash')).to_contain_text('100,000 원')
  expect(page.locator('.header-interest')).to_contain_text('1주차 이자')
  expect(page.locator('.header-interest')).to_contain_text('100,000 원')
  assert page.locator('.activity-grid button').all_text_contents()==['무료나눔','아르바이트','물건 수집','장터','매각처']
  def read(): return page.evaluate(READ)
  def load(cash=200000,minute=10080-480):
   data=json.loads(Path('work/rich.json').read_text())
   data['game'].update({'cash':cash,'minute':minute,'marketDay':minute//1440+1,'interestWeek':0,'health':0,'fatigue':0})
   page.evaluate(WRITE,data);page.reload();page.get_by_role('heading',name='활동',exact=True).wait_for();return data
  def finish_week():
   page.locator('.activity-grid').get_by_role('button',name='물건 수집',exact=True).click()
   page.get_by_role('button',name='물건 수집하기 · 행동 1회',exact=True).click()
   expect(page.locator('.action-layer')).to_have_count(0)
  load();finish_week()
  expect(page.get_by_role('heading',name='이자 납부',exact=True)).to_be_visible()
  assert page.get_by_role('button',name='닫기',exact=True).count()==0
  assert all(b.is_disabled() for b in page.locator('.bottom-nav button').all())
  page.keyboard.press('Escape');expect(page.get_by_role('heading',name='이자 납부',exact=True)).to_be_visible()
  page.reload();expect(page.get_by_role('heading',name='이자 납부',exact=True)).to_be_visible()
  page.get_by_label('상환 금액').fill('100000')
  page.get_by_role('button',name='입력 금액 상환 · 행동 소모 없음',exact=True).click()
  expect(page.locator('.action-layer')).to_have_count(0)
  expect(page.locator('.header-interest')).to_contain_text('99,999 원')
  page.get_by_role('button',name='이자 납부 · 행동 소모 없음 · 99,999 원',exact=True).click()
  expect(page.locator('.action-layer')).to_have_count(0)
  expect(page.get_by_role('heading',name='활동',exact=True)).to_be_visible()
  assert read()['cash']==1 and read()['interestWeek']==1 and read()['minute']==10080
  assert not any(k in read() for k in ['health','fatigue','fatigueRemainder'])
  expect(page.locator('.header-interest-date')).to_contain_text('0.003%')
  expect(page.locator('.header-interest')).to_contain_text('299,997 원')
  page.reload();expect(page.locator('.header-interest')).to_contain_text('2주차 이자')
  page.screenshot(path=f'work/weekly-home-{width}.png',full_page=True)
  load(100000);finish_week()
  page.get_by_role('button',name='이자 납부 · 행동 소모 없음 · 100,000 원',exact=True).click()
  expect(page.locator('.action-layer')).to_have_count(0)
  assert read()['cash']==0 and read()['status']=='playing'
  page.locator('.activity-grid').get_by_role('button',name='아르바이트',exact=True).click()
  page.get_by_role('button',name='일하기 · 행동 1회',exact=True).first.click()
  expect(page.locator('.action-layer')).to_have_count(0)
  assert read()['cash']==9000
  load(99999);finish_week()
  expect(page.get_by_role('dialog')).to_contain_text('주간 이자를 납부하지 못했습니다.')
  assert read()['status']=='bankrupt' and read()['cash']==99999
  page.reload();expect(page.get_by_role('dialog')).to_contain_text('파산 · 게임 종료')
  data=load();data['game']['principal']=data['game']['cash'];data['game']['minute']=0;data['game']['marketDay']=1
  page.evaluate(WRITE,data);page.reload();page.get_by_role('heading',name='활동',exact=True).wait_for()
  page.get_by_role('navigation',name='주요 메뉴').get_by_role('button',name='채무',exact=True).click()
  page.get_by_role('button',name='가능한 만큼 상환',exact=False).click()
  expect(page.locator('.action-layer')).to_have_count(0)
  expect(page.get_by_role('heading',name='드디어, 자유.',exact=True)).to_be_visible()
  assert read()['cash']==0 and read()['status']=='cleared'
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  assert not errors,errors
  results.append({'width':width,'weekly_lock_reload':'PASS','principal_reprices_bill':'PASS','rate_increase':'PASS','zero_cash_play':'PASS','missed_payment_end':'PASS','final_clear':'PASS'})
  ctx.close()
 browser.close();print(json.dumps(results))
