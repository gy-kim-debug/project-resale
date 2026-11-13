"""Chat typing/reveal/locks, offscreen continuity and persisted single execution."""
import json,os,re
from datetime import datetime,timedelta,timezone
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
DATA=json.loads(Path('work/chat-fixtures.json').read_text())
BASE=os.getenv('SCREEN_BASE_URL','http://127.0.0.1:4182')
WRITE="""async d=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});await new Promise(r=>{const tx=db.transaction('saves','readwrite');tx.objectStore('saves').put(d,'slot:1');tx.oncomplete=r});db.close();sessionStorage.setItem('resale:resume',JSON.stringify({version:1,screen:'game',slot:1,tab:'채팅'}))}"""
READ="""async()=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});return await new Promise(r=>{const q=db.transaction('saves').objectStore('saves').get('slot:1');q.onsuccess=()=>{db.close();r(q.result.game)}})}"""
def btn(p,name):return p.get_by_role('button',name=name,exact=True)
def read(p):return p.evaluate(READ)
def inject(p,key):p.evaluate(WRITE,DATA[key]);p.reload();expect(p.get_by_role('heading',name='채팅',exact=True)).to_be_visible()
def changed(p,before):
 for _ in range(30):
  latest=read(p)
  if latest!=before and not latest['chats'][0]['unread']:return latest
 raise AssertionError('Chat save did not commit')
def nav(p,name):p.get_by_role('navigation',name='주요 메뉴').get_by_role('button',name=name,exact=True).click()
def freeze(p):p.clock.install();p.clock.pause_at(datetime.now(timezone.utc)+timedelta(seconds=1))
def stable(before,after):
 for key in ['minute','weekActions','cash','principal','interest','inventory']:
  assert after[key]==before[key],key
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for w,h in [(320,568),(390,844),(430,932),(1024,768)]:
  c=b.new_context(viewport={'width':w,'height':h},reduced_motion='reduce');p=c.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)));p.goto(BASE);expect(btn(p,'새로 시작')).to_be_visible();inject(p,'basic');nav(p,'활동');btn(p,'중고 장터').click();p.locator('.item-row').first.click();btn(p,'판매자와 채팅').click();before=read(p);freeze(p);btn(p,'인사하기').click();expect(p.locator('.chat-typing')).to_have_count(1);expect(p.locator('.chat-player').last).to_be_visible();expect(btn(p,'상태 물어보기')).to_be_disabled();expect(p.get_by_role('button',name=re.compile('^구매 내용 확인'))).to_be_disabled();assert p.locator('.chat-typing i').first.evaluate('(n)=>getComputedStyle(n).animationName')=='none';p.clock.run_for(400);expect(p.locator('.chat-typing')).to_have_count(1)
  after=changed(p,before);stable(before,after);last=after['chats'][0]['messages'][-1]['text'];assert last not in p.locator('.trade-chat p').all_text_contents();assert len(after['chats'][0]['messages'])>=3
  if w==390:p.screenshot(path='work/chat-typing-390.png')
  # Leave and reopen while the reply is pending: preserve typing instead of restart.
  btn(p,'활동으로 이동').click();nav(p,'채팅');expect(p.locator('.chat-list-row')).to_contain_text('입력 중');p.locator('.chat-list-row').first.click();expect(p.locator('.chat-typing')).to_have_count(1);p.clock.run_for(2600);expect(p.locator('.chat-typing')).to_have_count(0);expect(p.locator('.trade-chat')).to_contain_text(last);expect(btn(p,'상태 물어보기')).to_be_enabled();assert read(p)==after
  # Refresh during the next reply: saved result loads immediately without replay.
  previous=read(p);btn(p,'상태 물어보기').click();expect(p.locator('.chat-typing')).to_have_count(1);after=changed(p,previous);p.clock.resume();p.reload();p.locator('.chat-list-row').first.click();expect(p.locator('.chat-typing')).to_have_count(0);expect(p.locator('.trade-chat')).to_contain_text(after['chats'][0]['messages'][-1]['text']);assert read(p)==after
  # Buyer negotiation follows the same sequence and blocks early acceptance.
  inject(p,'pending');p.locator('.chat-list-row').first.click();expect(p.locator('.trade-chat')).to_be_visible();p.wait_for_function("async()=>!(await ("+READ+")()).chats[0].unread");before=read(p);p.clock.pause_at(p.evaluate('Date.now()')+1000);p.get_by_role('button',name=re.compile('^절충가')).click();btn(p,'가격 제안').click();expect(p.locator('.chat-typing')).to_have_count(1);expect(btn(p,'수락하고 거래')).to_be_disabled();after=changed(p,before);stable(before,after);assert after['inquiries'][0]['rounds']==before['inquiries'][0]['rounds']+1;p.clock.run_for(400);expect(p.locator('.chat-typing')).to_have_count(1);p.clock.run_for(2600);expect(p.locator('.chat-typing')).to_have_count(0);expect(btn(p,'수락하고 거래')).to_be_enabled();assert read(p)==after;p.clock.resume();assert not errors,errors;assert p.evaluate('document.documentElement.scrollWidth<=innerWidth');c.close();print(f'{w}x{h}: immediate own message, delayed seller+buyer reply/typing, locked choices+purchase, offscreen continuity, reload no replay, saved once/no time or action/cash changes, reduced motion/no errors PASS',flush=True)
 b.close()
