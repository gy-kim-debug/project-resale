"""Real firm-tag chat offers: rare acceptance, holds, high-risk closure and reload."""
import json,os,re
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
BASE=os.getenv('SCREEN_BASE_URL','http://127.0.0.1:4182')
F=json.loads(Path('work/firm-offer-fixtures.json').read_text())
WRITE="""async d=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});await new Promise(r=>{const tx=db.transaction('saves','readwrite');tx.objectStore('saves').put(d,'slot:1');tx.oncomplete=r});db.close();sessionStorage.setItem('resale:resume',JSON.stringify({version:1,screen:'game',slot:1,tab:'활동'}))}"""
READ="""async()=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});return await new Promise(r=>{const q=db.transaction('saves').objectStore('saves').get('slot:1');q.onsuccess=()=>{db.close();r(q.result.game)}})}"""
def btn(p,s):return p.get_by_role('button',name=s,exact=True)
def read(p):return p.evaluate(READ)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for w,h in [(320,568),(390,844),(430,932),(1024,768)]:
  c=b.new_context(viewport={'width':w,'height':h},reduced_motion='reduce');p=c.new_page();errors=[];p.on('pageerror',lambda e:errors.append(str(e)));p.goto(BASE);expect(btn(p,'새로 시작')).to_be_visible()
  for outcome,fixture in F.items():
   p.evaluate(WRITE,fixture['save']);p.reload();expect(p.get_by_role('heading',name='활동',exact=True)).to_be_visible();btn(p,'중고 장터').click();source=next(i for i in fixture['save']['game']['board'] if i['id']==fixture['itemId']);p.locator('.item-row').filter(has=p.get_by_text(source['title'],exact=True)).click();expect(p.locator('.sheet-content')).to_contain_text('#가격고정');btn(p,'판매자와 채팅').click();p.locator('.conversation-tabs button').filter(has_text='가격 제안').click();expect(p.locator('.offer-options button')).to_have_count(2);before=read(p);p.locator('.offer-options button').first.click();expect(p.locator('.chat-typing')).to_have_count(0)
   after=read(p);item=next(i for i in after['board'] if i['id']==fixture['itemId']);assert item['purchaseBargain']['rounds']==1 and after['seed']==fixture['seedAfter'];assert after['cash']==before['cash'] and after['minute']==before['minute'] and after['weekActions']==before['weekActions'] and after['inventory']==before['inventory'];assert item['listing']==source['listing'] and item['value']==source['value']
   if outcome=='walked':
    expect(p.locator('.chat-ended-status')).to_have_text('거래 종료');expect(p.get_by_role('button',name=re.compile('^구매 내용 확인'))).to_have_count(0);expect(p.locator('.offer-options button')).to_have_count(0);assert item['purchaseBargain']['walked'];p.reload();p.get_by_role('navigation',name='주요 메뉴').get_by_role('button',name='채팅',exact=True).click();expect(btn(p,'전체')).to_have_attribute('aria-pressed','true');expect(p.locator('.chat-list-row')).to_have_count(1);btn(p,'진행 중').click();expect(p.locator('.chat-list-row')).to_have_count(0);btn(p,'종료').click();p.locator('.chat-list-row').click();expect(p.locator('.chat-ended-status')).to_have_text('거래 종료');assert read(p)['seed']==after['seed']
   elif outcome=='held':
    assert item['negotiatedPrice']==fixture['asking'];expect(p.locator('.offer-options button')).to_have_count(3);p.reload();p.get_by_role('navigation',name='주요 메뉴').get_by_role('button',name='채팅',exact=True).click();p.locator('.chat-list-row').click();p.locator('.conversation-tabs button').filter(has_text='가격 제안').click();expect(p.locator('.offer-options button')).to_have_count(3);assert next(i for i in read(p)['board'] if i['id']==fixture['itemId'])['purchaseBargain']==item['purchaseBargain']
   else:
    assert item['negotiatedPrice']==fixture['offer'] and item['negotiation']=='accepted';p.get_by_role('button',name=re.compile('^구매 내용 확인')).click();btn(p,'지불·수령 확정').click();expect(p.locator('.action-layer')).to_have_count(0);expect(p.locator('#sheet-title')).to_have_text('물품');p.wait_for_function("async()=>{const g=await ("+READ+")();return g.inventory.length===1}");purchased=read(p);assert purchased['cash']==before['cash']-fixture['offer'] and purchased['weekActions']==before['weekActions']+1 and purchased['inventory'][0]['acquiredFor']==fixture['offer'];p.reload();assert read(p)['cash']==purchased['cash']
   assert p.evaluate('document.documentElement.scrollWidth<=innerWidth')
  assert not errors,errors;c.close();print(f'{w}x{h}: fixed-tag offers visible, accepted/held/walked replies, no-time/no-cash proposals, next-round offers, saved deterministic outcomes, closed chat cannot continue, exact accepted-price purchase+1 action, no overflow/errors PASS',flush=True)
 b.close()
