"""Real saved events: question resume, one-time outcomes, reservation callback, action costs."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
DATA=json.loads(Path('work/event-depth-fixtures.json').read_text())
READ="""async()=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});return await new Promise(r=>{const q=db.transaction('saves').objectStore('saves').get('slot:1');q.onsuccess=()=>{db.close();r(q.result.game)}})}"""
WRITE="""async data=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});await new Promise(r=>{const tx=db.transaction('saves','readwrite');tx.objectStore('saves').put(data,'slot:1');tx.oncomplete=r});db.close()}"""
def saved(page,expr):page.wait_for_function('async()=>{const g=await ('+READ+')();return '+expr+'}')
def read(page):return page.evaluate(READ)
def skip(page):
 button=page.get_by_role('button',name='스킵',exact=True)
 if button.count():button.click()
def finish(page):
 skip(page);page.get_by_role('button',name='계속하기',exact=True).click();saved(page,'g.story.active===null')
def load(page,key):page.evaluate(WRITE,DATA[key]);page.reload();page.get_by_role('button',name='이어하기',exact=True).click();expect(page.locator('.story-layer')).to_be_visible()
def reload_game(page):page.reload();page.get_by_role('button',name='이어하기',exact=True).click();expect(page.locator('.story-layer')).to_be_visible()
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for w,h in [(320,568),(390,844)]:
  c=b.new_context(viewport={'width':w,'height':h});page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:4182');expect(page.get_by_role('button',name='새로 시작',exact=True)).to_be_visible();load(page,'reservation');original=read(page);skip(page)
  page.get_by_role('button',name='거래 조건 다시 묻기',exact=True).click();saved(page,"g.story.active.branch==='terms'");reload_game(page);expect(page.locator('.story-line')).to_contain_text('거래 조건');assert read(page)['cash']==original['cash'] and read(page)['minute']==original['minute'];skip(page)
  page.get_by_role('button',name='잠시 예약해 두기',exact=True).click();saved(page,"g.story.active.outcome==='promised'");g=read(page);assert len(g['sales'])==1 and not g['inquiries'] and len(g['story']['pending'])==1 and g['weekActions']==original['weekActions'];quote=g['story']['pending'][0]['price'];reload_game(page);finish(page)
  for n in range(3):page.get_by_role('button',name='구매 문의 기다리기',exact=False).click();expect(page.locator('.action-layer')).to_have_count(0)
  expect(page.get_by_role('heading',name='예약자의 재연락',exact=True)).to_be_visible();saved(page,"g.story.active.kind==='returnBuyer'");assert read(page)['story']['active']['price']==quote;skip(page);page.locator('.story-choices button').filter(has=page.locator('.story-action')).first.click();expect(page.locator('.action-layer')).to_have_count(0);saved(page,"g.story.active.outcome==='sold'");g=read(page);assert g['cash']==original['cash']+quote and not g['sales'] and not g['inventory'] and g['weekActions']==original['weekActions']+4;reload_game(page);finish(page);assert read(page)['cash']==g['cash'] and read(page)['stats']['sales']==1
  load(page,'appointment');before=read(page);skip(page);wait=page.get_by_role('button',name='기다린 뒤 구매',exact=False);expect(wait.locator('.story-action')).to_contain_text('2');wait.click();expect(page.locator('.action-layer')).to_have_count(0);saved(page,"g.story.active.outcome==='purchased'");after=read(page);assert after['weekActions']==before['weekActions']+2 and len(after['inventory'])==1 and after['story']['pending'][0]['kind']=='referral';finish(page)
  load(page,'scam');before=read(page);skip(page);target=before['story']['active']['target'];page.get_by_role('button',name='신고하고 거래 종료',exact=True).click();saved(page,"g.story.active.outcome==='reported'");after=read(page);assert after['cash']==before['cash'] and after['minute']==before['minute'] and not any(i['id']==target for i in after['board']);reload_game(page);finish(page);assert read(page)['cash']==before['cash']
  assert not errors,errors;c.close();print(f'{w}x{h}: real saved question/reaction resume, delayed reserved buyer/one-time sale, waiting cost2, zero-cost report PASS',flush=True)
 b.close()
