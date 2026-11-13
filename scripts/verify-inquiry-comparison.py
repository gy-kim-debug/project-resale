"""Compare the same item's buyers, choose the lower offer deliberately, settle once."""
import copy,json,os,re,time
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
BASE=os.getenv('SCREEN_BASE_URL','http://127.0.0.1:4182')
DATA=json.loads(Path('work/chat-fixtures.json').read_text())['pending']
WRITE="""async d=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});await new Promise(r=>{const tx=db.transaction('saves','readwrite');tx.objectStore('saves').put(d,'slot:1');tx.oncomplete=r});db.close();sessionStorage.setItem('resale:resume',JSON.stringify({version:1,screen:'game',slot:1,tab:'활동'}))}"""
READ="""async()=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});return await new Promise(r=>{const q=db.transaction('saves').objectStore('saves').get('slot:1');q.onsuccess=()=>{db.close();r(q.result.game)}})}"""
def nav(p,s):p.get_by_role('navigation',name='주요 메뉴').get_by_role('button',name=s,exact=True).click()
def btn(p,s):return p.get_by_role('button',name=s,exact=True)
def read(p):return p.evaluate(READ)
def idle(p):expect(p.locator('.action-layer')).to_have_count(0)
def load(p,data):p.evaluate(WRITE,data);p.reload();expect(p.get_by_role('heading',name='활동',exact=True)).to_be_visible()
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for w,h in [(320,568),(390,844),(430,932),(1024,768)]:
  c=b.new_context(viewport={'width':w,'height':h},reduced_motion='reduce');p=c.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)));p.goto(BASE);expect(btn(p,'새로 시작')).to_be_visible()
  data=copy.deepcopy(DATA);data['game']['inquiries'][0]['name']='낮은제안손님';data['game']['inquiries'][0]['max']=123456700;data['game']['inquiries'].append({**data['game']['inquiries'][0],'id':'buyer-2','name':'높은제안손님','price':95000});data['game'].pop('chats',None);data['game'].pop('chatSerial',None)
  load(p,data);before=read(p);p.get_by_role('button',name=re.compile('판매 상세$')).click();expect(p.locator('.inquiry-group')).to_have_count(1);expect(p.locator('.inquiry-offer')).to_have_count(2);expect(p.locator('.inquiry-offer').first).to_contain_text('95,000 원');expect(p.locator('.inquiry-offer').last).to_contain_text('80,000 원');expect(p.locator('.inquiry-comparison')).not_to_contain_text('123,456,700');expect(p.locator('.inquiry-comparison')).to_contain_text('현재 가치');assert read(p)==before
  assert abs(p.locator('.sheet-toolbar').bounding_box()['y'])<1
  if w==390:p.screenshot(path='work/inquiry-comparison-390.png')
  btn(p,'낮은제안손님 채팅 이어가기').click();expect(p.locator('#sheet-title')).to_have_text('채팅방');expect(p.locator('.sheet-content h2').first).to_have_text('낮은제안손님');expect(btn(p,'수락하고 거래')).to_be_enabled();assert read(p)['cash']==before['cash'];btn(p,'← 뒤로').click();expect(p.locator('.inquiry-offer')).to_have_count(2)
  btn(p,'활동으로 이동').click();nav(p,'채팅');btn(p,'문의 비교').click();expect(p.locator('.inquiry-offer')).to_have_count(2);btn(p,'낮은제안손님 채팅 이어가기').click();btn(p,'수락하고 거래').click();idle(p)
  for _ in range(30):
   g=read(p)
   if not g['inquiries']:break
   p.wait_for_timeout(25)
  assert g['cash']==before['cash']+80000 and g['weekActions']==before['weekActions']+1 and not g['sales'] and not g['inventory'];assert next(t for t in g['chats'] if t['inquiryId']=='buyer-1')['status']=='completed';assert next(t for t in g['chats'] if t['inquiryId']=='buyer-2')['status']=='expired';expect(btn(p,'수락하고 거래')).to_have_count(0)
  btn(p,'채팅 나가기').click();expect(p.locator('.chat-list-row')).to_have_count(0);p.reload();expect(p.locator('.chat-list-row')).to_have_count(0);assert read(p)['cash']==g['cash'];assert not errors,errors;assert p.evaluate('document.documentElement.scrollWidth<=innerWidth');c.close();print(f'{w}x{h}: home+chat comparison, sorted public prices/no private cap, deliberate lower-buyer choice, resume/back, no effects until acceptance, exact payment+1 action, other chat expires, reload/no double sale/errors PASS',flush=True)
 b.close()
