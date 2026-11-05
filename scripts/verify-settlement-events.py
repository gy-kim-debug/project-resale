"""Actual invoice completion, repeat-week scenes, persisted replies and isolated previews."""
import json,time
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
DATA=json.loads(Path('work/settlement-fixtures.json').read_text())
READ="""async()=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});return await new Promise(r=>{const q=db.transaction('saves').objectStore('saves').get('slot:1');q.onsuccess=()=>{db.close();r(q.result.game)}})}"""
WRITE="""async data=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});await new Promise(r=>{const tx=db.transaction('saves','readwrite');tx.objectStore('saves').put(data,'slot:1');tx.oncomplete=r});db.close()}"""
def read(page):return page.evaluate(READ)
def wait_saved(page,condition):
 deadline=time.monotonic()+5
 while time.monotonic()<deadline:
  g=read(page)
  if condition(g):return g
  page.wait_for_timeout(20)
 raise AssertionError('Save did not finish')
def choices(page):
 for _ in range(8):
  button=page.get_by_role('button',name='다음',exact=True)
  if not button.count():return
  old=page.locator('.story-line p').inner_text();button.click();expect(page.locator('.story-line p')).not_to_have_text(old)
 raise AssertionError('Too many story lines')
def equal_ledger(a,b):
 for key in ['cash','principal','seed','minute','weekActions','stats','board','inventory','logs']:assert a[key]==b[key],key
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for w,h in [(320,568),(390,844),(430,932),(1024,768)]:
  c=b.new_context(viewport={'width':w,'height':h});page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:4182');expect(page.get_by_role('button',name='새로 시작',exact=True)).to_be_visible()
  for week,reply,label in [(1,'ask','다음 주 납부액을 묻는다'),(2,'end','통화를 마친다')]:
   sample=DATA['week'+str(week)];page.evaluate(WRITE,sample['data']);page.reload();page.get_by_role('button',name='이어하기',exact=True).click();before=read(page);page.get_by_role('button',name='이자 납부 후 다음 주 시작 ·',exact=False).click();expect(page.locator('.settlement-stage')).to_be_visible();paid=wait_saved(page,lambda g:g['story']['active'] and g['story']['active']['kind']=='weekly');assert paid['cash']==before['cash']-sample['fee'] and paid['principal']==before['principal'] and paid['interestWeek']==week and paid['weekActions']==0
   bounds=page.locator('.settlement-stage').bounding_box();page.get_by_role('button',name='다음',exact=True).click();expect(page.locator('.settlement-stage')).to_have_attribute('data-settlement-camera','receipt');expect(page.locator('.story-line')).to_contain_text(f'{week}주차 납부');assert abs(page.locator('.settlement-stage').bounding_box()['height']-bounds['height'])<1
   if w==390 and week==1:
    page.locator('.settlement-receipt').evaluate('async n=>{await Promise.all(n.getAnimations().map(a=>a.finished))}');page.screenshot(path='work/weekly-receipt-390.png')
   choices(page);page.get_by_role('button',name=label,exact=True).click();expect(page.locator('.story-line p')).not_to_have_text(label);wait_saved(page,lambda g:g['story']['active'].get('weeklyReply')==reply and g['story']['active']['step']==0)
   if week==1:
    page.reload();page.get_by_role('button',name='이어하기',exact=True).click();expect(page.locator('.settlement-stage')).to_be_visible();expect(page.locator('.story-line p')).to_have_text('다음 주에는 얼마를 준비해야 하죠?');equal_ledger(read(page),paid)
   choices(page);page.get_by_role('button',name='다음 주 시작',exact=True).click();expect(page.locator('.settlement-stage')).to_have_count(0);ended=wait_saved(page,lambda g:g['story']['active'] is None);equal_ledger(ended,paid);assert ended['story']['lastSettlementWeek']==week and ended['story']['history'].count('weekly')==week
   page.reload();page.get_by_role('button',name='이어하기',exact=True).click();expect(page.locator('.settlement-stage')).to_have_count(0)
  snapshot=read(page)
  for theme in ['first','tight','business','halfway','near','rain','envelope','quiet']:
   assert page.evaluate('(theme)=>previewSettlement(theme,4)',theme) is True;expect(page.locator('[data-settlement-preview] .settlement-stage')).to_be_visible();page.get_by_role('button',name='스킵',exact=True).click();page.get_by_role('button',name='통화를 마친다',exact=True).click();page.get_by_role('button',name='스킵',exact=True).click();page.get_by_role('button',name='다음 주 시작',exact=True).click();expect(page.locator('[data-settlement-preview]')).to_have_count(0);assert read(page)==snapshot
  assert not errors,errors;assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');c.close();print(f'{w}x{h}: actual weeks 1+2, exact receipt, fixed cameras, both spoken replies, mid-reply reload/no repayment, no replay after close, all 8 isolated previews, no overflow/errors PASS',flush=True)
 c=b.new_context(viewport={'width':390,'height':844},reduced_motion='reduce');page=c.new_page();page.goto('http://127.0.0.1:4182');expect(page.get_by_role('button',name='새로 시작',exact=True)).to_be_visible();page.evaluate("previewSettlement('rain')");expect(page.locator('.settlement-stage')).to_be_visible();assert page.locator('.settlement-stage > svg').evaluate('n=>getComputedStyle(n).animationName')=='none';page.keyboard.press('Escape');expect(page.locator('[data-settlement-preview]')).to_have_count(0);c.close();b.close();print('Reduced-motion and preview escape PASS',flush=True)
