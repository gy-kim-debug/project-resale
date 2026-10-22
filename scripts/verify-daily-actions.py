"""Three daily actions, overnight settlement and old-save migration."""
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
  def read():return page.evaluate(READ)
  def load(name='rich'):
   data=json.loads(Path('work/'+name+'.json').read_text());page.evaluate(WRITE,data);page.reload()
   page.get_by_role('heading',name='활동',exact=True).wait_for();return data
  def activity(name):page.locator('.activity-grid').get_by_role('button',name=name,exact=True).click()
  def work(index=0):
   page.get_by_role('button',name='일하기 · 행동 1회',exact=True).nth(index).click()
   expect(page.locator('.action-layer')).to_have_count(0)
  expect(page.locator('.status-day')).to_have_text('1일째')
  expect(page.locator('.status-clock')).to_have_text('남은 행동 3/3')
  assert ':00' not in page.locator('.status-header').inner_text()
  activity('아르바이트')
  for left in [2,1,3]:
   work();expect(page.locator('.status-clock')).to_have_text('남은 행동 '+str(left)+'/3')
  expect(page.locator('.status-day')).to_have_text('2일째')
  assert read()['minute']==1440;assert read()['cash']==527000
  assert 'satiety' not in read() and 'hungerRemainder' not in read()
  page.get_by_role('button',name='닫기',exact=True).click()
  page.screenshot(path=f'work/daily-home-{width}.png',full_page=True)
  load();activity('아르바이트')
  for _ in range(3):work(2)
  expect(page.locator('.status-day')).to_have_text('2일째')
  expect(page.locator('.status-clock')).to_have_text('남은 행동 3/3')
  legacy=load();legacy['game'].update({'satiety':0,'hungerRemainder':59,'minute':480})
  page.evaluate(WRITE,legacy);page.reload();page.get_by_role('heading',name='활동',exact=True).wait_for()
  expect(page.locator('.status-clock')).to_have_text('남은 행동 2/3')
  expect(page.locator('meter[aria-label="포만감"]')).to_have_count(0)
  activity('아르바이트');work();assert read()['cash']==509000
  assert 'satiety' not in read() and 'hungerRemainder' not in read()
  expect(page.locator('.status-clock')).to_have_text('남은 행동 1/3')
  # Old hourly snapshots keep their date and finances; the first action persists the marker.
  old=json.loads(Path('work/rich.json').read_text());old['game'].pop('timeMode',None);old['game'].pop('interestWeek',None)
  old['game']['minute']=14*1440+23*60+45;old['game']['marketDay']=15
  for item in old['game']['board']:item['expires']=old['game']['minute']+1440
  page.evaluate(WRITE,old);page.reload();page.get_by_role('heading',name='활동',exact=True).wait_for()
  expect(page.locator('.status-day')).to_have_text('15일째')
  expect(page.locator('.status-clock')).to_have_text('남은 행동 3/3')
  activity('아르바이트');work()
  assert read()['cash']==509000;assert read()['timeMode']=='daily-actions'
  assert read()['interest']==old['game']['interest']
  page.reload();expect(page.locator('.status-clock')).to_have_text('남은 행동 2/3')
  expect(page.locator('.status-day')).to_have_text('15일째')
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  assert not errors,errors
  results.append({'width':width,'third_action_new_day':'PASS','all_jobs_one_action':'PASS','legacy_migration_reload':'PASS'})
  ctx.close()
 browser.close();print(json.dumps(results))
