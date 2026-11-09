"""Mobile chat persistence, resumed trades, inquiry locks and archived transaction regression."""
import json,time,re
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
FIXTURES=json.loads(Path('work/chat-fixtures.json').read_text())
WRITE="""async d=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});await new Promise(r=>{const tx=db.transaction('saves','readwrite');tx.objectStore('saves').put(d,'slot:1');tx.oncomplete=r});db.close();sessionStorage.setItem('resale:resume',JSON.stringify({version:1,screen:'game',slot:1,tab:'채팅'}))}"""
READ="""async()=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});return await new Promise(r=>{const q=db.transaction('saves').objectStore('saves').get('slot:1');q.onsuccess=()=>{db.close();r(q.result)}})}"""
def read(page):return page.evaluate(READ)['game']
def saved(page,predicate):
 end=time.monotonic()+10
 while time.monotonic()<end:
  g=read(page)
  if predicate(g):return g
  page.wait_for_timeout(25)
 raise AssertionError('Expected chat save update missing')
def idle(page):expect(page.locator('.action-layer')).to_have_count(0)
def nav(page,label):
 if page.get_by_role('button',name='채팅 나가기',exact=True).count():
  before=read(page);page.get_by_role('button',name='채팅 나가기',exact=True).click();expect(page.get_by_role('heading',name='채팅',exact=True)).to_be_visible();assert read(page)==before
 elif page.locator('.sheet-layer').count():page.get_by_role('button',name='활동으로 이동',exact=True).click()
 page.get_by_role('navigation',name='주요 메뉴').get_by_role('button',name=label,exact=True).click()
def inject(page,key):page.evaluate(WRITE,FIXTURES[key]);page.reload();expect(page.get_by_role('heading',name='채팅',exact=True)).to_be_visible()
def confirm(page,button):
 button.click();expect(page.get_by_role('alertdialog')).to_be_visible();page.locator('.confirmation-submit').click();expect(page.get_by_role('alertdialog')).to_have_count(0)
def no_overflow(page):assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for w,h in [(320,568),(390,844),(430,932),(1024,768)]:
  c=b.new_context(viewport={'width':w,'height':h},reduced_motion='reduce');page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:(errors.append('Unexpected native dialog'),d.dismiss()));page.goto('http://127.0.0.1:4182');expect(page.get_by_role('button',name='새로 시작',exact=True)).to_be_visible();inject(page,'basic')
  assert page.get_by_role('navigation',name='주요 메뉴').locator('button').all_text_contents()==['채무','보관함','활동','채팅','일상'];expect(page.locator('.header-tools button')).to_have_count(2);expect(page.locator('.status-header').get_by_role('button',name='내 정보',exact=True)).to_have_count(0);nav(page,'활동');expect(page.get_by_role('button',name='내 정보',exact=True)).to_have_count(1);page.get_by_role('button',name='내 정보',exact=True).click();expect(page.locator('.sheet-content')).to_contain_text('플레이어');page.get_by_role('button',name='닫기',exact=True).click();nav(page,'채팅');expect(page.get_by_role('heading',name='아직 대화가 없어요.',exact=True)).to_be_visible();no_overflow(page)
  nav(page,'활동');page.locator('.activity-grid').get_by_role('button',name='중고 장터',exact=True).click();page.locator('.item-row').first.click();page.get_by_role('button',name='판매자와 채팅',exact=True).click();expect(page.get_by_role('region',name='판매자와 대화')).to_be_visible();page.get_by_role('button',name='인사하기',exact=True).click();g=saved(page,lambda g:len(g.get('chats',[]))==1 and len(g['chats'][0]['messages'])>=3 and not g['chats'][0]['unread']);tid=g['chats'][0]['id'];itemid=g['chats'][0]['itemId'];history=g['chats'][0]['messages'];cash=g['cash'];assert g['weekActions']==0
  nav(page,'채팅');expect(page.locator('.chat-list-row')).to_have_count(1);page.locator('.chat-list-row').first.click();expect(page.get_by_role('region',name='판매자와 대화')).to_be_visible();assert read(page)['chats'][0]['messages']==history
  page.reload();expect(page.get_by_role('heading',name='채팅',exact=True)).to_be_visible();page.locator('.chat-list-row').first.click();expect(page.locator('.trade-chat')).to_contain_text(history[-1]['text']);expect(page.locator('.seller-conversation input,.seller-conversation textarea')).to_have_count(0);assert read(page)['cash']==cash and read(page)['weekActions']==0
  page.get_by_role('button',name='구매 내용 확인 ·',exact=False).click();page.get_by_role('button',name='지불·수령 확정',exact=True).click();g=saved(page,lambda g:len(g['inventory'])==1);idle(page);expect(page.locator('.chat-ended-status')).to_have_text('거래 완료');expect(page.get_by_role('button',name='지불·수령 확정',exact=True)).to_have_count(0);purchase_cash=g['cash'];assert g['weekActions']==1 and g['chats'][0]['status']=='completed'
  nav(page,'보관함');page.locator('.item-row').first.click();page.get_by_role('button',name='즉시 판매',exact=True).click();page.locator('.sheet-content .item-row').first.click();page.get_by_role('button',name='판매 확정',exact=True).click();g=saved(page,lambda g:len(g['inventory'])==0);idle(page);sold_cash=g['cash'];assert sold_cash>purchase_cash;nav(page,'채팅');page.locator('.chat-list-row').first.click();expect(page.locator('.chat-ended-status')).to_have_text('거래 완료');assert read(page)['cash']==sold_cash;no_overflow(page)
  inject(page,'pending');expect(page.locator('.chat-list-row')).to_have_count(1);expect(page.locator('.chat-unread-dot')).to_have_count(1);expect(page.locator('.chat-nav-badge')).to_have_text('1');expect(page.locator('.sheet-layer')).to_have_count(0)
  nav(page,'일상');before=read(page);confirm(page,page.locator('.daily-row').filter(has_text='아르바이트'));expect(page.locator('.toast.error')).to_contain_text('구매 문의');assert read(page)==before;expect(page.get_by_role('heading',name='일상',exact=True)).to_be_visible();nav(page,'보관함');expect(page.locator('.item-row')).to_have_count(1);nav(page,'채팅');page.locator('.chat-list-row').first.click();g=saved(page,lambda g:not g['chats'][0]['unread']);expect(page.locator('.chat-nav-badge')).to_have_count(0)
  page.get_by_role('button',name=re.compile('^절충가')).click();page.get_by_role('button',name='가격 제안',exact=True).click();g=saved(page,lambda g:g['inquiries'][0]['rounds']==1);assert g['weekActions']==0 and len(g['chats'][0]['messages'])==3
  nav(page,'채팅');page.locator('.chat-list-row').first.click();expect(page.locator('.trade-chat')).to_contain_text(g['chats'][0]['messages'][-1]['text']);assert read(page)['inquiries'][0]['price']==g['inquiries'][0]['price']
  if w==390:page.screenshot(path='work/chat-buyer-390.png')
  cash=read(page)['cash'];price=read(page)['inquiries'][0]['price'];page.get_by_role('button',name='수락하고 거래',exact=True).click();g=saved(page,lambda g:len(g['inquiries'])==0);idle(page);assert g['cash']==cash+price and g['weekActions']==1 and len(g['sales'])==0;expect(page.locator('.chat-ended-status')).to_have_text('거래 완료');expect(page.get_by_role('button',name='수락하고 거래',exact=True)).to_have_count(0)
  nav(page,'채팅');expect(page.locator('.chat-list-row')).to_contain_text('거래 완료')
  inject(page,'pending');page.locator('.chat-list-row').first.click();saved(page,lambda g:not g['chats'][0]['unread']);page.get_by_role('button',name='거래 파토',exact=True).click();g=saved(page,lambda g:len(g['inquiries'])==0);expect(page.locator('.chat-ended-status')).to_have_text('거래 종료');assert len(g['sales'])==1 and len(g['inventory'])==1 and g['weekActions']==0
  nav(page,'채팅');expect(page.locator('.chat-list-row')).to_contain_text('거래 종료')
  inject(page,'legacy');expect(page.locator('.chat-list-row')).to_have_count(1);page.locator('.chat-list-row').first.click();saved(page,lambda g:len(g.get('chats',[]))==1 and not g['chats'][0]['unread']);expect(page.locator('.trade-chat')).to_contain_text('거래');nav(page,'채팅');page.get_by_role('button',name='구매',exact=True).click();expect(page.locator('.chat-list-row')).to_have_count(1)
  if w==390:page.screenshot(path='work/chat-list-390.png')
  no_overflow(page);assert not errors,errors;c.close();print(f'{w}x{h}: new tab order+activity profile entry+two header tools, purchase chat→list/reload/resume→buy→sell→archived record, no double actions, pending navigation+action block, unread/read, seller negotiation resume/complete/cancel with listing retained, legacy chat migration, no typing/overflow/errors PASS',flush=True)
 b.close()
