"""Real mobile flows for the daily tab, slot persistence and weekly lottery sequence."""
import json,time,re
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
FIXTURE=json.loads(Path('work/daily-fixture.json').read_text())
CHART=json.loads(Path('work/daily-chart-fixture.json').read_text())
READ="""async()=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});return await new Promise(r=>{const q=db.transaction('saves').objectStore('saves').get('slot:1');q.onsuccess=()=>{db.close();r(q.result)}})}"""
WRITE="""async data=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});await new Promise(r=>{const tx=db.transaction('saves','readwrite');tx.objectStore('saves').put(data,'slot:1');tx.oncomplete=r});db.close();sessionStorage.setItem('resale:resume',JSON.stringify({version:1,screen:'game',slot:1,tab:'일상'}))}"""
def read(page):return page.evaluate(READ)['game']
def wait_saved(page,predicate):
 deadline=time.monotonic()+8
 while time.monotonic()<deadline:
  g=read(page)
  if predicate(g):return g
  page.wait_for_timeout(30)
 raise AssertionError('Expected slot update missing')
def idle(page):expect(page.locator('.action-layer')).to_have_count(0)
def nav(page,label):page.get_by_role('navigation',name='주요 메뉴').get_by_role('button',name=label,exact=True).click()
def enter(page,label):page.locator('.daily-card').filter(has_text=label).click()
def skip(page):
 expect(page.locator('.story-layer')).to_be_visible()
 b=page.get_by_role('button',name='스킵',exact=True)
 if b.count():b.click()
def no_overflow(page):assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for w,h in [(320,568),(390,844),(430,932),(1024,768)]:
  c=browser.new_context(viewport={'width':w,'height':h},reduced_motion='reduce');page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:4182')
  page.get_by_role('button',name='새로 시작',exact=True).click();page.get_by_label('닉네임',exact=True).fill('일상거래');page.get_by_role('button',name='이 캐릭터로 시작',exact=True).click();skip(page);page.get_by_role('button',name='시작하기',exact=True).click();wait_saved(page,lambda g:g['story']['active'] is None)
  page.evaluate(WRITE,FIXTURE);page.reload();expect(page.get_by_role('heading',name='일상',exact=True)).to_be_visible();expect(page.locator('.daily-card')).to_have_count(4);expect(page.get_by_role('button',name='사업 관리',exact=True)).to_have_count(0);expect(page.locator('.status-header')).to_contain_text('5,100,000 원');no_overflow(page)
  assert page.locator('input:not([type=hidden]),textarea').count()==0
  if w==390:page.screenshot(path='work/daily-home-390.png')
  enter(page,'아르바이트');expect(page.get_by_role('button',name='일하러 가기',exact=True).locator('.action-cost')).to_have_count(1);page.get_by_role('button',name='일하러 가기',exact=True).click();g=wait_saved(page,lambda g:g['weekActions']==1);idle(page);assert g['cash']==5120000 and g['businesses']==[] and g['businessIncomeAmount']==0
  nav(page,'일상');enter(page,'산책');page.get_by_role('button',name='산책하기',exact=True).click();g=wait_saved(page,lambda g:g['weekActions']==2);idle(page);expect(page.locator('.daily-stage-walk')).to_be_visible();assert g['cash']==5130000 and g['daily']['lastWalk']=='wallet';stage=page.locator('.daily-stage').bounding_box();skip(page);end=page.locator('.daily-stage').bounding_box();assert stage==end
  page.get_by_role('button',name='돌아가기',exact=True).click();wait_saved(page,lambda g:g['story']['active'] is None)
  nav(page,'일상');enter(page,'주식');expect(page.get_by_role('img',name=re.compile('가격 그래프'))).to_be_visible();page.get_by_role('button',name='5주',exact=True).click();page.get_by_role('button',name='5주 매수하기',exact=True).click();g=wait_saved(page,lambda g:g.get('daily',{}).get('stocks',[{}])[0].get('quantity')==5);idle(page);assert g['cash']==5030000 and g['weekActions']==2
  page.get_by_role('button',name='매도',exact=True).click();page.get_by_role('button',name='1주 매도하기',exact=True).click();g=wait_saved(page,lambda g:g['daily']['stocks'][0]['quantity']==4);idle(page);assert g['cash']==5049800 and g['daily']['stocks'][0]['cost']==80000 and g['weekActions']==2;no_overflow(page)
  nav(page,'일상');enter(page,'복권');page.get_by_role('button',name='5장 구매 · 25,000 원',exact=True).click();g=wait_saved(page,lambda g:g['daily']['tickets']['count']==5);idle(page);assert g['cash']==5024800 and g['weekActions']==2;expect(page.get_by_text('이번 주 복권을 모두 구매했어요.',exact=True)).to_be_visible()
  nav(page,'활동');page.get_by_role('button',name='이번 주 마무리하기',exact=True).click();page.get_by_role('button',name='이번 주 마무리 · 정산 시작',exact=True).click();wait_saved(page,lambda g:g['settling']);idle(page)
  page.get_by_role('button',name=re.compile('^의무 원금 납부 ·')).click();wait_saved(page,lambda g:g['principalRepaidThisWeek']==50000);idle(page)
  page.get_by_role('button',name=re.compile('^이자 납부 후 다음 주 시작 ·')).click();g=wait_saved(page,lambda g:g['interestWeek']==1);idle(page);expect(page.locator('.story-layer')).to_be_visible();assert g['story']['active']['kind']=='weekly' and len(g['daily']['draws'])==1 and g['daily']['quoteWeek']==2
  skip(page);page.get_by_role('button',name='다음 주 납부액을 묻는다',exact=True).click();skip(page);page.get_by_role('button',name='다음 주 시작',exact=True).click();g=wait_saved(page,lambda g:g['story']['active']['kind']=='lottery');expect(page.locator('.daily-stage-lottery')).to_be_visible();cash=g['cash'];draw=g['daily']['draws'][0];skip(page);wait_saved(page,lambda g:g['story']['active']['step']==2);page.reload();expect(page.locator('.daily-stage-lottery')).to_be_visible();expect(page.locator('.daily-scene-result')).to_contain_text('1주차 추첨 결과');expect(page.locator('.daily-scene-result .lottery-ranks span')).to_have_count(5);g=read(page);assert g['cash']==cash and g['story']['active']['step']==2 and g['daily']['draws'][0]==draw
  if w==390:page.screenshot(path='work/lottery-result-390.png')
  page.get_by_role('button',name='돌아가기',exact=True).click();wait_saved(page,lambda g:g['story']['active'] is None);nav(page,'일상');enter(page,'복권');expect(page.get_by_role('heading',name='지난 추첨',exact=True)).to_be_visible();assert read(page)['cash']==cash;no_overflow(page)
  page.evaluate(WRITE,CHART);page.reload();enter(page,'주식');expect(page.get_by_role('img',name=re.compile('최근 6주'))).to_be_visible();page.get_by_text('주별 가격 보기',exact=True).click();page.get_by_role('button',name=re.compile('^2주 ·')).click();expect(page.locator('.stock-chart p')).to_contain_text('2주차');page.get_by_role('button',name='새봄테크',exact=True).click();expect(page.locator('.stock-summary h2')).to_have_text('새봄테크');no_overflow(page)
  if w==390:page.screenshot(path='work/stocks-chart-390.png',full_page=True)
  assert not errors,errors;c.close();print(f'{w}x{h}: daily navigation, work/walk action costs, wallet scene stable, stock buy/sell+fee, lottery limit, legacy principal refund once+early settlement without business income, weekly scene then draw, reload without duplicate rewards, six-week chart selection, no typing/overflow/errors PASS',flush=True)
 browser.close()
