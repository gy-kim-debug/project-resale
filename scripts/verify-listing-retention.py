"""Live board retention across discovery/day boundary, favorites/chat/backup and expiry."""
import copy,json,os,re
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
BASE=os.getenv('SCREEN_BASE_URL','http://127.0.0.1:4182')
DATA=json.loads(Path('work/chat-fixtures.json').read_text())['basic']
WRITE="""async d=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});await new Promise(r=>{const tx=db.transaction('saves','readwrite');tx.objectStore('saves').put(d,'slot:1');tx.oncomplete=r});db.close();sessionStorage.setItem('resale:resume',JSON.stringify({version:1,screen:'game',slot:1,tab:'활동'}))}"""
READ="""async()=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});return await new Promise(r=>{const q=db.transaction('saves').objectStore('saves').get('slot:1');q.onsuccess=()=>{db.close();r(q.result)}})}"""
def btn(p,s):return p.get_by_role('button',name=s,exact=True)
def nav(p,s):p.get_by_role('navigation',name='주요 메뉴').get_by_role('button',name=s,exact=True).click()
def read(p):return p.evaluate(READ)
def idle(p):expect(p.locator('.action-layer')).to_have_count(0)
def load(p,data):p.evaluate(WRITE,data);p.reload();expect(p.get_by_role('heading',name='활동',exact=True)).to_be_visible()
def item(p,title):p.locator('.item-row').filter(has=p.get_by_text(title,exact=True)).click()
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for w,h in [(320,568),(390,844),(430,932),(1024,768)]:
  c=b.new_context(viewport={'width':w,'height':h},reduced_motion='reduce');p=c.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)));p.goto(BASE);expect(btn(p,'새로 시작')).to_be_visible();load(p,DATA)
  target=next(i for i in DATA['game']['board'] if i['marketId']=='street' and i['expires']==5760);btn(p,'중고 장터').click();item(p,target['title']);btn(p,'관심 저장').click();btn(p,'판매자와 채팅').click();btn(p,'인사하기').click();expect(p.locator('.chat-typing')).to_have_count(0);before=read(p);original=next(i for i in before['game']['board'] if i['id']==target['id']);history=next(t for t in before['game']['chats'] if t['itemId']==target['id'])['messages']
  while p.locator('#sheet-title').inner_text()!='중고 장터':btn(p,'← 뒤로').click()
  for n in range(1,4):
   btn(p,'새 매물 탐색').click();idle(p);g=read(p)['game'];assert g['weekActions']==n;assert next(i for i in g['board'] if i['id']==target['id'])==original;assert g['board'][0]['id'] not in {i['id'] for i in before['game']['board']};assert len([i for i in g['board'] if i['marketId']=='street'])==12+4*n;assert read(p)['favoriteIds']==before['favoriteIds']
  p.get_by_role('checkbox',name='관심 매물만 보기').check();expect(p.locator('.item-row')).to_have_count(1);item(p,target['title']);btn(p,'대화 이어보기').click();expect(p.locator('.trade-chat')).to_contain_text(history[-1]['text']);assert next(t for t in read(p)['game']['chats'] if t['itemId']==target['id'])['messages']==history
  p.reload();nav(p,'채팅');p.locator('.chat-list-row').click();expect(p.locator('.trade-chat')).to_contain_text(history[-1]['text']);assert next(i for i in read(p)['game']['board'] if i['id']==target['id'])==original
  # Existing saved deadlines remain authoritative: discovery does not renew them.
  old=copy.deepcopy(DATA);old['game']['board'][0]['expires']=960;expiredid=old['game']['board'][0]['id'];load(p,old);btn(p,'중고 장터').click();item(p,old['game']['board'][0]['title']);btn(p,'판매자와 채팅').click();btn(p,'← 뒤로').click();btn(p,'← 뒤로').click();btn(p,'새 매물 탐색').click();idle(p);assert any(i['id']==expiredid for i in read(p)['game']['board']);btn(p,'새 매물 탐색').click();idle(p);assert not any(i['id']==expiredid for i in read(p)['game']['board']);assert next(t for t in read(p)['game']['chats'] if t['itemId']==expiredid)['status']=='expired';assert not errors,errors;assert p.evaluate('document.documentElement.scrollWidth<=innerWidth');c.close();print(f'{w}x{h}: +4 new listings first, originals+facts+prices+chat+favorites retained across 3 actions/day, saved reload, actual expiry closes chat without renewal, budget+1 per discovery, no overflow/errors PASS',flush=True)
 b.close()
