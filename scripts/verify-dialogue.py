"""Choice-driven seller conversations, save/reload and free action cost in mobile production UI."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
BASE=os.getenv('SCREEN_BASE_URL','http://127.0.0.1:4182')
DATA=json.loads(Path('work/dialogue-fixture.json').read_text())
WRITE="""async data=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});await new Promise(r=>{const tx=db.transaction('saves','readwrite');tx.objectStore('saves').put(data,'slot:1');tx.oncomplete=r});db.close()}"""
READ="""async()=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});return await new Promise(r=>{const q=db.transaction('saves').objectStore('saves').get('slot:1');q.onsuccess=()=>{db.close();r(q.result)}})}"""
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
 for width in [320,375,390,430]:
  c=b.new_context(viewport={'width':width,'height':844},is_mobile=True,has_touch=True);page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(BASE);page.get_by_role('heading',name='시작하기',exact=True).wait_for();page.evaluate(WRITE,DATA['save']);page.reload();page.get_by_role('button',name='이어하기',exact=True).click()
  def open_item():
   page.locator('.activity-grid').get_by_role('button',name='중고 장터',exact=True).click();page.locator('.sheet-layer .item-row').filter(has=page.get_by_text(DATA['item']['title'],exact=True)).click()
  open_item();page.get_by_role('button',name='판매자와 채팅',exact=True).click()
  page.locator('.dialogue-options button').filter(has_text='인사하기').click();expect(page.locator('.chat-message')).to_have_count(3)
  page.locator('.dialogue-options button').filter(has_text='상태').first.click();expect(page.locator('.dialogue-options button')).to_have_count(2)
  page.locator('.dialogue-options button').filter(has_text='조건 확인').click();expect(page.locator('.dialogue-options button').filter(has_text='자세히')).to_have_count(1)
  page.locator('.dialogue-options button').filter(has_text='자세히').click()
  expect(page.locator('.action-layer')).to_have_count(0);expect(page.locator('.item-findings')).to_have_count(0)
  page.wait_for_function("async()=>!!(await ("+READ+")()).game.board.find(i=>i.id==="+json.dumps(DATA['item']['id'])+").dialogue.topics.includes('detail')")
  saved=page.evaluate(READ);assert saved['game']['weekActions']==0 and saved['game']['cash']==DATA['save']['game']['cash'];assert saved['game']['seed']==DATA['save']['game']['seed'];item=next(i for i in saved['game']['board'] if i['id']==DATA['item']['id']);count=len(item['chat'])
  page.reload();page.get_by_role('button',name='이어하기',exact=True).click();open_item();expect(page.locator('.chat-message')).to_have_count(count);expect(page.locator('.dialogue-options button').filter(has_text='인사하기')).to_have_count(0)
  if width==390:
   page.locator('.trade-chat').scroll_into_view_if_needed();page.screenshot(path='work/dialogue-390.png',full_page=True)
  page.get_by_role('button',name='가격 제안',exact=False).first.click();page.locator('.offer-options button').last.click();expect(page.locator('.action-layer')).to_have_count(0)
  page.get_by_role('button',name='구매 내용 확인',exact=False).click();page.get_by_role('button',name='지불·수령 확정',exact=True).click();expect(page.locator('.action-layer')).to_have_count(0)
  page.wait_for_function("async()=>(await ("+READ+")()).game.inventory.length===1")
  bought=page.evaluate(READ)['game'];assert bought['weekActions']==1 and bought['inventory'][0]['dialogue']['topics']==item['dialogue']['topics'];assert bought['inventory'][0]['chatSettled']
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth') and not errors,errors
  c.close();print(f'{width}px greeting/questions/contextual event/reply, free chat, saved branch, negotiation/purchase, no overflow/errors PASS',flush=True)
 b.close()
