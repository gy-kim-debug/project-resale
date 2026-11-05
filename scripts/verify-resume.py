"""Refresh resumes the current slot/tab/story, while an explicit menu remains a menu."""
import json,time
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
DATA=json.loads(Path('work/resume-fixtures.json').read_text())
READ="""async slot=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});return await new Promise(r=>{const q=db.transaction('saves').objectStore('saves').get('slot:'+slot);q.onsuccess=()=>{db.close();r(q.result)}})}"""
WRITE="""async ({slot,data,time})=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});await new Promise(r=>{const tx=db.transaction('saves','readwrite');tx.objectStore('saves').put(data,'slot:'+slot);tx.objectStore('saves').put(time,'slot-time:'+slot);tx.oncomplete=r});db.close()}"""
def read(page,slot=1):return page.evaluate(READ,slot)
def wait_saved(page,condition):
 deadline=time.monotonic()+5
 while time.monotonic()<deadline:
  d=read(page)
  if condition(d):return d
  page.wait_for_timeout(20)
 raise AssertionError('Save did not finish')
def resumed(page):
 expect(page.locator('.app-shell')).to_be_visible();expect(page.get_by_role('button',name='이어하기',exact=True)).to_have_count(0)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for w,h in [(320,568),(390,844),(430,932),(1024,768)]:
  c=b.new_context(viewport={'width':w,'height':h},reduced_motion='reduce');page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:4182');page.get_by_role('button',name='새로 시작',exact=True).click();page.get_by_label('닉네임',exact=True).fill('진행중');page.get_by_role('button',name='이 캐릭터로 시작',exact=True).click();expect(page.locator('[data-intro-shot=window]')).to_be_visible();page.get_by_role('button',name='다음',exact=True).click();saved=wait_saved(page,lambda d:d['game']['story']['active']['step']==1);page.reload();expect(page.locator('[data-intro-shot=family]')).to_be_visible();expect(page.get_by_role('button',name='이어하기',exact=True)).to_have_count(0);assert read(page)['game']==saved['game']
  page.get_by_role('button',name='스킵',exact=True).click();page.get_by_role('button',name='시작하기',exact=True).click();wait_saved(page,lambda d:d['game']['story']['active'] is None)
  nav=page.get_by_role('navigation',name='주요 메뉴');nav.get_by_role('button',name='보관함',exact=True).click();before=read(page);page.evaluate(WRITE,{'slot':2,'data':DATA['newer'],'time':int(time.time()*1000)+10000});page.reload();resumed(page);expect(page.get_by_role('navigation',name='주요 메뉴').get_by_role('button',name='보관함',exact=True)).to_have_attribute('aria-current','page');expect(page.locator('.status-header')).to_contain_text('500,000 원');assert read(page)['game']==before['game'];assert page.evaluate("JSON.parse(sessionStorage.getItem('resale:resume')).slot")==1
  page.get_by_role('button',name='설정',exact=True).click();page.get_by_role('button',name='시작 화면으로',exact=True).click();expect(page.get_by_role('button',name='새로 시작',exact=True)).to_be_visible();page.reload();expect(page.get_by_role('button',name='새로 시작',exact=True)).to_be_visible();assert page.evaluate("JSON.parse(sessionStorage.getItem('resale:resume')).screen")=='menu'
  # First reload after upgrading an older app, which had no view marker yet.
  page.evaluate("sessionStorage.removeItem('resale:resume')");page.reload();resumed(page);expect(page.locator('.status-header')).to_contain_text('900,000 원');assert page.evaluate("JSON.parse(sessionStorage.getItem('resale:resume')).slot")==2
  # A stale marker must not silently resume slot 1 or 2.
  page.evaluate("sessionStorage.setItem('resale:resume',JSON.stringify({version:1,screen:'game',slot:3,tab:'활동'}))");page.reload();expect(page.get_by_role('button',name='새로 시작',exact=True)).to_be_visible();assert page.evaluate("JSON.parse(sessionStorage.getItem('resale:resume')).screen")=='menu'
  # Resume a persisted repayment reply without re-running the payment.
  page.evaluate(WRITE,{'slot':1,'data':DATA['weekly'],'time':int(time.time()*1000)});page.evaluate("sessionStorage.setItem('resale:resume',JSON.stringify({version:1,screen:'game',slot:1,tab:'채무'}))");page.reload();expect(page.locator('.settlement-stage')).to_be_visible()
  expect(page.locator('.story-line')).to_contain_text('현재 원금 기준');expect(page.get_by_role('button',name='이어하기',exact=True)).to_have_count(0);assert read(page)['game']==DATA['weekly']['game'];assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert not errors,errors
  if w==390:page.screenshot(path='work/refresh-resumed-weekly-390.png')
  c.close();print(f'{w}x{h}: real new slot, automatic intro beat resume, current slot over newer save, tab preservation, explicit menu+reload, older-app fallback, stale slot safety, weekly reply+ledger preservation, no errors PASS',flush=True)
 b.close()
