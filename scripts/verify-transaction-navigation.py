"""Successful purchases/registration replace old layers; failed/cancelled trades stay."""
import copy,json,os,re
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
BASE=os.getenv('SCREEN_BASE_URL','http://127.0.0.1:4182')
DATA=json.loads(Path('work/chat-fixtures.json').read_text())
STORY=json.loads(Path('work/story-fixtures.json').read_text())
WRITE="""async data=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});await new Promise(r=>{const tx=db.transaction('saves','readwrite');tx.objectStore('saves').put(data,'slot:1');tx.oncomplete=r});db.close();sessionStorage.setItem('resale:resume',JSON.stringify({version:1,screen:'game',slot:1,tab:'활동'}))}"""
READ="""async()=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});return await new Promise(r=>{const q=db.transaction('saves').objectStore('saves').get('slot:1');q.onsuccess=()=>{db.close();r(q.result.game)}})}"""
def btn(p,name):return p.get_by_role('button',name=name,exact=True)
def read(p):return p.evaluate(READ)
def load(p,data):p.evaluate(WRITE,data);p.reload();expect(p.get_by_role('heading',name='활동',exact=True)).to_be_visible()
def nav(p,name):p.get_by_role('navigation',name='주요 메뉴').get_by_role('button',name=name,exact=True).click()
def listing(p,title):btn(p,'중고 장터').click();p.locator('.item-row').filter(has=p.get_by_text(title,exact=True)).click()
def idle(p):expect(p.locator('.action-layer')).to_have_count(0)
def inventory(p):nav(p,'보관함');p.locator('.item-row').first.click()
def register(p):btn(p,'중고 장터에 판매 등록').click();p.locator('.price-options button').first.click()
def advance(p):
 for _ in range(30):
  if not p.locator('.story-layer').count():return
  if p.locator('.story-next').count():p.locator('.story-next').click()
  else:return
 raise AssertionError('Dialogue failed to advance')
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for w,h in [(320,568),(390,844),(430,932),(1024,768)]:
  c=b.new_context(viewport={'width':w,'height':h},reduced_motion='reduce');p=c.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)));p.on('dialog',lambda d:(errors.append('native dialog'),d.dismiss()));p.goto(BASE);expect(btn(p,'새로 시작')).to_be_visible()
  # Direct listing purchase; cancel is inert, then one action/payment and new root.
  data=copy.deepcopy(DATA['basic']);target=next(i for i in data['game']['board'] if i['marketId']=='street');load(p,data);listing(p,target['title']);btn(p,'구매 내용 확인 · '+format(target['price'],',')+' 원').click();before=read(p);btn(p,'구매하지 않기').click();assert read(p)==before;expect(p.locator('#sheet-title')).to_have_text('매물');btn(p,'구매 내용 확인 · '+format(target['price'],',')+' 원').click();btn(p,'지불·수령 확정').click();idle(p);expect(p.locator('#sheet-title')).to_have_text('물품');expect(p.locator('.sheet-content h2').first).to_have_text(target['title']);expect(btn(p,'← 뒤로')).to_have_count(0);btn(p,'닫기').click();expect(p.get_by_role('heading',name=re.compile('^보관함 '))).to_be_visible();assert read(p)['weekActions']==before['weekActions']+1
  # Successful listing replaces the stack with activity home and persisted sale.
  p.locator('.item-row').first.click();register(p);before=read(p);btn(p,'판매 글 등록 확정').click();idle(p);expect(p.locator('.sheet-layer')).to_have_count(0);expect(p.get_by_role('heading',name='활동',exact=True)).to_be_visible();g=read(p);assert len(g['sales'])==1 and g['weekActions']==before['weekActions']+1;assert g['inventory']==before['inventory'];p.reload();expect(p.get_by_role('heading',name='활동',exact=True)).to_be_visible();assert len(read(p)['sales'])==1
  # Exhausted action budget rejects registration; keep selected price and layer.
  failed=copy.deepcopy(DATA['pending']);failed['game']['weekActions']=20;extra=next(i for i in failed['game']['board'] if i['marketId']=='street' and i['stateGrade']!='F');failed['game']['board'].remove(extra);extra['acquiredFor']=extra['price'];failed['game']['inventory'].insert(0,extra);load(p,failed);inventory(p);register(p);before=read(p);btn(p,'판매 글 등록 확정').click();expect(p.locator('.toast.error')).to_be_visible();expect(p.locator('#sheet-title')).to_have_text('판매 등록');assert read(p)==before
  # A failed purchase remains in the chat, with no added item/action.
  exhausted=copy.deepcopy(DATA['pending']);exhausted['game']['weekActions']=20;load(p,exhausted);listing(p,exhausted['game']['board'][0]['title']);btn(p,'판매자와 채팅').click();p.get_by_role('button',name=re.compile('^구매 내용 확인')).click();before=read(p);btn(p,'지불·수령 확정').click();expect(p.locator('.toast.error')).to_be_visible();expect(p.locator('#sheet-title')).to_have_text('채팅방');assert read(p)==before
  # Purchase via event choice: remain until reaction ends, then the main item detail.
  data=copy.deepcopy(STORY['bundle']);targetid=data['game']['story']['active']['target'];target=next(i for i in data['game']['board'] if i['id']==targetid);data['game']['story']['active']=None;load(p,data);listing(p,target['title']);btn(p,'판매자와 채팅').click();p.get_by_role('button',name=re.compile('^구매 내용 확인')).click();btn(p,'지불·수령 확정').click();expect(p.locator('.story-layer')).to_be_visible();advance(p);p.locator('.story-choices button').filter(has_text=re.compile('^두 개')).click();idle(p);expect(p.locator('.story-layer')).to_be_visible();assert any(i['id']==targetid for i in read(p)['inventory']);advance(p)
  for _ in range(8):
   if not p.locator('.story-layer').count():break
   p.locator('.story-choices button').first.click();advance(p)
  expect(p.locator('.story-layer')).to_have_count(0);expect(p.locator('#sheet-title')).to_have_text('물품');expect(p.locator('.sheet-content h2').first).to_have_text(target['title']);assert len(read(p)['inventory'])==2;btn(p,'닫기').click();expect(p.get_by_role('heading',name=re.compile('^보관함 '))).to_be_visible();assert not errors,errors;assert p.evaluate('document.documentElement.scrollWidth<=innerWidth');c.close();print(f'{w}x{h}: direct/chat/event purchase to owned detail, clean stack+inventory tab, cancelled/failed purchase stays, registration home+reload and failed registration stays, single action, no errors PASS',flush=True)
 b.close()
