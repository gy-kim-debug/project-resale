"""Mobile narrative QA: real intro, resumable beats, every event and both endings."""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
BASE=os.getenv('SCREEN_BASE_URL','http://127.0.0.1:4182')
DATA=json.loads(Path('work/story-fixtures.json').read_text())
READ="""async()=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});return await new Promise(r=>{const q=db.transaction('saves').objectStore('saves').get('slot:1');q.onsuccess=()=>{db.close();r(q.result.game)}})}"""
WRITE="""async data=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});await new Promise(r=>{const tx=db.transaction('saves','readwrite');tx.objectStore('saves').put(data,'slot:1');tx.oncomplete=r});db.close()}"""
def read(page): return page.evaluate(READ)
def stored(page,condition): page.wait_for_function('async()=>{const g=await ('+READ+')();return '+condition+'}')
def advance(page):
 for _ in range(10):
  next=page.locator('.story-next')
  if not next.count():return
  current=read(page)['story']['active']['step'];next.click();stored(page,f'g.story.active.step==={current+1}')
 raise AssertionError('Story never reached choices')
def load(page,key):
 page.evaluate(WRITE,DATA[key]);page.reload();page.get_by_role('button',name='이어하기',exact=True).click();expect(page.locator('.story-layer')).to_be_visible()
def layout(page):
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 assert page.locator('input:not([type=radio]):not([type=checkbox]):not([type=file]),textarea').count()==0
 for button in page.locator('.story-choices button,.story-next').all():
  box=button.bounding_box();assert box and box['height']>=44
  button.scroll_into_view_if_needed();assert button.evaluate('(n)=>{const r=n.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight&&r.top>=0}')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width,height in [(320,568),(375,667),(390,844),(430,932)]:
  context=b.new_context(viewport={'width':width,'height':height},is_mobile=True,has_touch=True);page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(BASE);page.get_by_role('button',name='새로 시작',exact=True).click();page.get_by_label('닉네임',exact=True).fill('이야기주인공');page.get_by_role('button',name='이 캐릭터로 시작',exact=True).click();expect(page.get_by_role('heading',name='첫 정산까지',exact=True)).to_be_visible()
  expect(page.locator('.story-line')).to_contain_text('작은 방');before=read(page)
  if width==390:page.screenshot(path='work/story-intro-390.png')
  page.locator('.story-next').click();stored(page,'g.story.active.step===1');page.reload();page.get_by_role('button',name='이어하기',exact=True).click();expect(page.locator('.story-line')).to_contain_text('100억 원')
  page.get_by_role('button',name='건너뛰기',exact=True).click();expect(page.locator('.story-choices')).to_be_visible();page.get_by_role('button',name='시작하기',exact=True).click();expect(page.locator('.story-layer')).to_have_count(0);stored(page,'g.story.active===null');after=read(page)
  for k in ['cash','principal','minute','seed','weekActions']:assert before[k]==after[k],k
  page.reload();page.get_by_role('button',name='이어하기',exact=True).click();expect(page.locator('.story-layer')).to_have_count(0)
  for kind in ['missing','model','memory','regular','bundle','rehaggle','competitor','creditor','regularCall','success','failure']:
   load(page,kind);advance(page);layout(page);g=read(page)
   if kind=='bundle' and width==390:page.screenshot(path='work/story-bundle-390.png')
   if kind=='rehaggle' and width==390:page.screenshot(path='work/story-buyer-390.png')
   if kind=='competitor':
    page.locator('.story-targets summary').click();expect(page.locator('.story-targets li')).to_have_count(2)
   if kind=='model':
    page.get_by_role('button',name='모델 설명 더 듣기',exact=True).click();expect(page.locator('.story-line')).to_contain_text('실제 가치는 구매한 뒤');stored(page,'g.story.active.explained===true');assert read(page)['cash']==g['cash']
   # Choose a meaningful path, then check state, not just a rendered message.
   choice={'missing':'.story-choices button:nth-child(2)','model':'.story-choices button:first-child','regular':'.story-choices button:first-child','bundle':'.story-choices button:first-child','rehaggle':'.story-choices button:first-child','competitor':'.story-choices button:first-child','regularCall':'.story-choices button:first-child'}.get(kind,'.story-choices button:first-child')
   page.locator(choice).click();expect(page.locator('.story-layer')).to_have_count(0);expect(page.locator('.action-layer')).to_have_count(0);stored(page,'g.story.active===null');out=read(page)
   if kind=='bundle':assert len(out['inventory'])==len(g['inventory'])+2 and g['cash']-out['cash']==g['story']['active']['price'] and out['weekActions']==g['weekActions']+1
   if kind=='competitor':assert len(out['inventory'])==len(g['inventory'])-2 and out['cash']==g['cash']+g['story']['active']['price'] and out['weekActions']==g['weekActions']+1
   if kind=='rehaggle':assert out['cash']==g['cash']+9000 and len(out['sales'])==0
   if kind in ['success','failure']:assert out['story']['endingDone'];expect(page.locator('.end-overlay')).to_be_visible()
   if kind=='regularCall':assert out['weekActions']==g['weekActions'] and out['story']['requests']
  # Unaffordable bundle keeps scene available, error toast visible, cancel remains possible.
  load(page,'poorBundle');advance(page);page.locator('.story-choices button').first.click();expect(page.locator('.story-layer .toast.error')).to_be_visible();expect(page.locator('.story-layer')).to_be_visible();page.get_by_role('button',name='거래 취소',exact=True).click();expect(page.locator('.story-layer')).to_have_count(0)
  assert not errors,errors
  context.close();print(f'{width}x{height}: intro/reload/skip, 8 events, contact request, both endings, choice layout, zero typing, insufficient cash PASS',flush=True)
 # Reduced motion actually disables scene animation.
 context=b.new_context(viewport={'width':390,'height':844},reduced_motion='reduce');page=context.new_page();page.goto(BASE);page.get_by_role('button',name='새로 시작',exact=True).click();page.get_by_label('닉네임',exact=True).fill('동작줄이기');page.get_by_role('button',name='이 캐릭터로 시작',exact=True).click();expect(page.locator('.story-layer')).to_be_visible();assert page.locator('.story-actor').evaluate('n=>getComputedStyle(n).animationName')=='none';context.close();b.close();print('Reduced motion PASS',flush=True)
