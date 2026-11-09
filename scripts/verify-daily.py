"""Mobile list, native confirmation, one-ticket lotto and theme portfolio regression."""
import json,time,re
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
FIXTURE=json.loads(Path('work/daily-fixture.json').read_text())
CHART=json.loads(Path('work/daily-chart-fixture.json').read_text())
LEGACY=json.loads(Path('work/weekly-stock-legacy-fixture.json').read_text())
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
def row(page,label):return page.locator('.daily-row').filter(has_text=label)
def confirm(page,button,text,accept=True):
 before=read(page)
 button.click();dialog=page.get_by_role('alertdialog')
 expect(dialog).to_be_visible();expect(dialog).to_contain_text(text)
 expect(dialog.get_by_role('button',name='취소',exact=True)).to_be_focused()
 assert read(page)==before
 assert dialog.evaluate('(d)=>d.open && d.matches(":modal")')
 # The native HTML dialog top layer isolates the styled game UI from the background.
 page.locator('.bottom-nav button').first.evaluate('(b)=>b.focus()')
 assert dialog.evaluate('(d)=>d.contains(document.activeElement)')
 if not accept:
  dialog.get_by_role('button',name='취소',exact=True).click()
  expect(button).to_be_focused()
 else:dialog.locator('.confirmation-submit').click()
 expect(page.get_by_role('alertdialog')).to_have_count(0)

def skip(page):
 expect(page.locator('.story-layer')).to_be_visible()
 b=page.get_by_role('button',name='스킵',exact=True)
 if b.count():b.click()
def no_overflow(page):assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for w,h in [(320,568),(390,844),(430,932),(1024,768)]:
  c=browser.new_context(viewport={'width':w,'height':h},reduced_motion='reduce');page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:(errors.append('Unexpected browser dialog: '+d.message),d.dismiss()));page.goto('http://127.0.0.1:4182')
  page.get_by_role('button',name='새로 시작',exact=True).click();page.get_by_label('닉네임',exact=True).fill('번호거래');page.get_by_role('button',name='이 캐릭터로 시작',exact=True).click();skip(page);page.get_by_role('button',name='시작하기',exact=True).click();wait_saved(page,lambda g:g['story']['active'] is None)
  page.evaluate(WRITE,FIXTURE);page.reload();expect(page.get_by_role('heading',name='일상',exact=True)).to_be_visible();expect(page.locator('.daily-row')).to_have_count(4);expect(page.locator('.status-header')).to_contain_text('5,100,000 원')
  boxes=[b.bounding_box() for b in page.locator('.daily-row').all()];assert all(abs(b['x']-boxes[0]['x'])<1 for b in boxes) and all(boxes[i]['y']>=boxes[i-1]['y']+boxes[i-1]['height'] for i in range(1,4));no_overflow(page)
  assert page.locator('input:not([type=hidden]),textarea').count()==0
  if w==390:page.screenshot(path='work/daily-list-390.png')
  row(page,'아르바이트').click();expect(page.get_by_role('alertdialog')).to_be_visible()
  if w==390:page.screenshot(path='work/action-confirmation-390.png')
  original=read(page);page.keyboard.press('Escape');expect(page.get_by_role('alertdialog')).to_have_count(0);expect(row(page,'아르바이트')).to_be_focused();assert read(page)==original
  assert page.evaluate("document.body.style.overflow !== 'hidden'")
  unchanged=read(page)
  for label,text in [('아르바이트','아르바이트를 할까요'),('산책','산책할까요'),('복권','복권 1장')]:
   confirm(page,row(page,label),text,False);assert read(page)==unchanged;expect(page.locator('.sheet-layer')).to_have_count(0)
  expect(row(page,'아르바이트').locator('.action-cost')).to_have_count(1);confirm(page,row(page,'아르바이트'),'아르바이트를 할까요');g=wait_saved(page,lambda g:g['weekActions']==1);idle(page);assert g['cash']==5120000 and g['daily']['stockTick']==1 and len(g['daily']['stocks'][0]['history'])==2 and g['businesses']==[];expect(page.get_by_role('heading',name='일상',exact=True)).to_be_visible()
  confirm(page,row(page,'산책'),'산책할까요');g=wait_saved(page,lambda g:g['weekActions']==2);idle(page);expect(page.locator('.daily-stage-walk')).to_be_visible();assert g['cash']==5130000 and g['daily']['lastWalk']=='wallet' and g['daily']['stockTick']==2;stage=page.locator('.daily-stage').bounding_box();skip(page);assert stage==page.locator('.daily-stage').bounding_box();page.get_by_role('button',name='돌아가기',exact=True).click();wait_saved(page,lambda g:g['story']['active'] is None)
  confirm(page,row(page,'복권'),'복권 1장');g=wait_saved(page,lambda g:g['daily']['tickets']['count']==1);idle(page);numbers=g['daily']['tickets']['numbers'];assert len(numbers)==len(set(numbers))==6 and all(1<=n<=45 for n in numbers) and g['cash']==5125000 and g['weekActions']==2;expect(page.get_by_role('heading',name='일상',exact=True)).to_be_visible()
  row(page,'복권').click();expect(page.get_by_role('heading',name='내 복권',exact=True)).to_be_visible();expect(page.locator('.lottery-ticket .lotto-ball')).to_have_count(6);expect(page.get_by_role('button',name=re.compile('복권 구매'))).to_have_count(0);assert read(page)['daily']['tickets']['numbers']==numbers
  page.reload();expect(page.get_by_role('heading',name='일상',exact=True)).to_be_visible();row(page,'주식').click();expect(page.get_by_role('button',name='반도체',exact=True)).to_be_visible();expect(page.get_by_role('button',name='바이오',exact=True)).to_be_visible();expect(page.get_by_role('button',name='2차전지',exact=True)).to_be_visible()
  quote_before=read(page);price=quote_before['daily']['stocks'][0]['history'][-1]['price'];histories=[s['history'] for s in quote_before['daily']['stocks']];quote_seed=quote_before['daily']['stockSeed'];expect(page.get_by_role('img',name=re.compile('최근 3개 시세'))).to_be_visible()
  page.get_by_role('button',name='5주',exact=True).click();page.get_by_role('button',name='5주 매수하기',exact=True).click();expect(page.get_by_role('alertdialog')).to_be_visible();page.keyboard.press('Escape');expect(page.get_by_role('alertdialog')).to_have_count(0);expect(page.locator('.stock-summary h2')).to_have_text('반도체');before=read(page);confirm(page,page.get_by_role('button',name='5주 매수하기',exact=True),'반도체 5주',False);assert read(page)==before
  confirm(page,page.get_by_role('button',name='5주 매수하기',exact=True),'반도체 5주');g=wait_saved(page,lambda g:g['daily']['stocks'][0]['quantity']==5);idle(page);assert g['cash']==quote_before['cash']-price*5 and g['weekActions']==2 and g['daily']['stockTick']==2 and [s['history'] for s in g['daily']['stocks']]==histories and g['daily']['stockSeed']==quote_seed
  page.get_by_role('button',name='매도',exact=True).click();confirm(page,page.get_by_role('button',name='1주 매도하기',exact=True),'반도체 1주');g=wait_saved(page,lambda g:g['daily']['stocks'][0]['quantity']==4);idle(page);assert g['cash']==quote_before['cash']-price*4-max(100,((price+5000)//10000)*100) and g['daily']['stocks'][0]['cost']==price*4 and [s['history'] for s in g['daily']['stocks']]==histories and g['daily']['stockSeed']==quote_seed;no_overflow(page)
  nav(page,'활동');page.get_by_role('button',name='이번 주 마무리하기',exact=True).click();page.get_by_role('button',name='이번 주 마무리 · 정산 시작',exact=True).click();wait_saved(page,lambda g:g['settling']);idle(page);page.get_by_role('button',name=re.compile('^의무 원금 납부 ·')).click();wait_saved(page,lambda g:g['principalRepaidThisWeek']==50000);idle(page)
  page.get_by_role('button',name=re.compile('^이자 납부 후 다음 주 시작 ·')).click();g=wait_saved(page,lambda g:g['interestWeek']==1);idle(page);skip(page);page.get_by_role('button',name='다음 주 납부액을 묻는다',exact=True).click();skip(page);page.get_by_role('button',name='다음 주 시작',exact=True).click();g=wait_saved(page,lambda g:g['story']['active']['kind']=='lottery');expect(page.locator('.daily-stage-lottery')).to_be_visible();cash=g['cash'];assert g['daily']['stockTick']==2 and [s['history'] for s in g['daily']['stocks']]==histories and g['daily']['stockSeed']==quote_seed;draw=g['daily']['draws'][0];assert draw['numbers']==numbers and len(set(draw['winning']+[draw['bonus']]))==7
  stage=page.locator('.daily-stage').bounding_box();expect(page.locator('.lotto-result .ball-hidden')).to_have_count(7)
  for step in [1,2,3]:
   page.get_by_role('button',name='다음',exact=True).click();wait_saved(page,lambda g:g['story']['active']['step']==step);expect(page.locator('.lotto-result .ball-hidden')).to_have_count(7-step);assert page.locator('.daily-stage').bounding_box()==stage
  page.reload();expect(page.locator('.lotto-result .ball-hidden')).to_have_count(4);assert read(page)['story']['active']['step']==3 and read(page)['cash']==cash
  for step in [4,5,6,7,8]:
   page.get_by_role('button',name='다음',exact=True).click();wait_saved(page,lambda g:g['story']['active']['step']==step);assert page.locator('.daily-stage').bounding_box()==stage
  expect(page.locator('.lotto-verdict')).to_be_visible();expect(page.locator('.lotto-result .ball-hidden')).to_have_count(0);no_overflow(page)
  if w==390:page.screenshot(path='work/lotto-draw-390.png')
  page.get_by_role('button',name='돌아가기',exact=True).click();wait_saved(page,lambda g:g['story']['active'] is None);assert read(page)['cash']==cash and len(read(page)['daily']['draws'])==1
  nav(page,'일상')
  # Next week is a new purchase; its prompt can be cancelled without a navigation detour.
  before=read(page);confirm(page,row(page,'복권'),'복권 1장',False);assert read(page)==before
  page.get_by_role('button',name='지난 추첨 보기',exact=True).click();expect(page.get_by_role('heading',name='지난 추첨',exact=True)).to_be_visible();expect(page.locator('.lotto-verdict')).to_be_visible()
  page.evaluate(WRITE,CHART);page.reload();row(page,'주식').click();expect(page.get_by_role('img',name=re.compile('최근 6개 시세'))).to_be_visible();page.get_by_text('시세 기록 보기',exact=True).click();page.get_by_role('button',name=re.compile('^시세 2 ·')).click();expect(page.locator('.stock-chart p')).to_contain_text('시세 2');page.get_by_role('button',name='바이오',exact=True).click();expect(page.locator('.stock-summary h2')).to_have_text('바이오');no_overflow(page)
  if w==390:page.screenshot(path='work/theme-stocks-390.png',full_page=True)
  page.evaluate(WRITE,LEGACY);page.reload();row(page,'주식').click();expect(page.get_by_role('img',name=re.compile('최근 3개 시세'))).to_be_visible();expect(page.locator('.stock-summary .daily-big-number')).to_have_text('20,000 원');expect(page.get_by_role('heading',name=re.compile('내 보유 주식 3주'))).to_be_visible()
  nav(page,'일상');confirm(page,row(page,'아르바이트'),'아르바이트를 할까요');g=wait_saved(page,lambda g:g['weekActions']==1);idle(page);assert g['cash']==5020000 and g['daily']['stockTick']==4 and g['daily']['stocks'][0]['quantity']==3 and g['daily']['stocks'][0]['cost']==60000 and [p['price'] for p in g['daily']['stocks'][0]['history'][:3]]==[19000,19500,20000]
  latest=g['daily']['stocks'][0]['history'][-1]['price'];page.reload();row(page,'주식').click();expect(page.get_by_role('img',name=re.compile('최근 4개 시세'))).to_be_visible();assert read(page)['daily']['stocks'][0]['history'][-1]['price']==latest;no_overflow(page)
  assert not errors,errors;c.close();print(f'{w}x{h}: vertical list, styled in-game dialog accept/cancel/Escape+focus+background isolation, no browser popup or side effects, 1-ticket persisted numbers/limit, theme stock buy/sell+fee, sequential 6+bonus reveal and step reload, fixed stage+single payout, action quotes+private RNG, no quotes on orders/early settlement, restored price history/graph, no overflow/errors PASS',flush=True)
 browser.close()
