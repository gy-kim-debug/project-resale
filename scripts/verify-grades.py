"""Browser QA uses synthetic save slots and the real buttons, persistence and timed actions."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
DATA=json.loads(Path('work/grade-fixtures.json').read_text())
READ="""async()=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});return await new Promise(r=>{const q=db.transaction('saves').objectStore('saves').get('slot:1');q.onsuccess=()=>{db.close();r(q.result.game)}})}"""
WRITE="""async data=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});await new Promise(r=>{const tx=db.transaction('saves','readwrite');tx.objectStore('saves').put(data,'slot:1');tx.oncomplete=r});db.close()}"""
def inventory(page):
 page.get_by_role('navigation',name='주요 메뉴').get_by_role('button',name='보관함',exact=True).click();page.locator('.item-row').first.click()
def load(page,key):
 page.evaluate(WRITE,DATA[key]);page.reload();page.get_by_role('button',name='이어하기',exact=True).click();inventory(page)
def read(page):return page.evaluate(READ)
def appraise(page):
 page.get_by_role('button',name='가치 확인 ·',exact=False).click();expect(page.locator('.appraisal-result')).to_be_visible();expect(page.locator('.action-layer')).to_have_count(0)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for w,h in [(320,568),(390,844),(430,932),(1024,768)]:
  c=b.new_context(viewport={'width':w,'height':h});page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:4182');expect(page.get_by_role('button',name='새로 시작',exact=True)).to_be_visible()
  load(page,'success');expect(page.locator('.grade-result')).to_have_count(0);expect(page.get_by_role('button',name='수리하기',exact=True)).to_have_count(0);before=read(page);appraise(page)
  expect(page.locator('.grade-result strong')).to_have_text('C');expect(page.get_by_text('난이도 보통 · 성공률 60%',exact=True)).to_be_visible();expect(page.get_by_text('성공 시 A등급 · 실제 가치 110,000 원',exact=True)).to_be_visible()
  if w==390:page.screenshot(path='work/grade-check-390.png',full_page=True)
  page.get_by_role('button',name='수리하기',exact=True).click();expect(page.locator('.grade-result strong')).to_have_text('A');expect(page.locator('.action-layer')).to_have_count(0);after=read(page)
  assert after['cash']==before['cash']-1000-10000 and after['marketExperience']['street']==6 and after['minute']==before['minute'] and after['weekActions']==before['weekActions'];expect(page.get_by_role('button',name='수리하기',exact=True)).to_have_count(0)
  page.reload();page.get_by_role('button',name='이어하기',exact=True).click();inventory(page);expect(page.locator('.grade-result strong')).to_have_text('A');expect(page.get_by_role('button',name='수리하기',exact=True)).to_have_count(0)
  load(page,'failure');appraise(page);page.get_by_role('button',name='수리하기',exact=True).click();expect(page.locator('.grade-result strong')).to_have_text('F');expect(page.locator('.action-layer')).to_have_count(0);after=read(page);assert after['marketExperience']['street']==4 and after['cash']==989000 and after['inventory'][0]['value']==0
  expect(page.get_by_role('button',name='중고 장터에 판매 등록',exact=True)).to_be_disabled();expect(page.get_by_role('button',name='즉시 판매',exact=True)).to_be_disabled()
  page.get_by_role('button',name='폐기',exact=True).click();expect(page.get_by_role('button',name='실행 취소',exact=True)).to_be_visible();assert len(read(page)['inventory'])==0
  page.get_by_role('button',name='실행 취소',exact=True).click();page.wait_for_function('async()=>{const g=await ('+READ+')();return g.inventory.length===1}');assert len(read(page)['inventory'])==1;assert read(page)['cash']==after['cash'] and read(page)['marketExperience']==after['marketExperience']
  load(page,'F');appraise(page);expect(page.locator('.grade-result strong')).to_have_text('F');expect(page.get_by_role('button',name='수리하기',exact=True)).to_have_count(0)
  load(page,'SSS');appraise(page);expect(page.locator('.grade-result strong')).to_have_text('SSS');expect(page.get_by_role('button',name='수리하기',exact=True)).to_have_count(0)
  load(page,'legacy');appraise(page);expect(page.locator('.grade-result')).to_have_count(0);expect(page.locator('[data-appraisal=value]')).to_have_text('73,100 원')
  load(page,'experienced');appraise(page);expect(page.get_by_text('난이도 보통 · 성공률 80%',exact=True)).to_be_visible();page.get_by_role('navigation',name='주요 메뉴').get_by_role('button',name='내 정보',exact=True).click();expect(page.get_by_role('heading',name='생활 수리 Lv.10')).to_be_visible();expect(page.get_by_role('heading',name='전자 수리 Lv.2')).to_be_visible();expect(page.get_by_role('heading',name='악기 정비 Lv.1')).to_be_visible();expect(page.get_by_role('heading',name='수리 기술',exact=False)).to_have_count(0)
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert not errors,errors
  c.close();print(f'{w}x{h}: hidden appraisal, grade+quote, paid no-action repair, success/reload/no retry, failure/F, disposal+undo, SSS, legacy preservation, independent skills PASS',flush=True)
 b.close()
