"""Focused chat layout: fixed choices, product return, long transcript and short mobile screens."""
import json, os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
BASE=os.getenv('SCREEN_BASE_URL','http://127.0.0.1:4182')
DATA=json.loads(Path('work/dialogue-fixture.json').read_text())
WRITE="""async data=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});await new Promise(r=>{const tx=db.transaction('saves','readwrite');tx.objectStore('saves').put(data,'slot:1');tx.oncomplete=r});db.close()}"""
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
 for width,height in [(320,568),(375,667),(390,844),(430,932),(900,900)]:
  c=b.new_context(viewport={'width':width,'height':height},has_touch=True);page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(BASE);page.get_by_role('heading',name='시작하기',exact=True).wait_for();page.evaluate(WRITE,DATA['save']);page.reload();page.get_by_role('button',name='이어하기',exact=True).click();page.locator('.activity-grid').get_by_role('button',name='중고 장터',exact=True).click();page.locator('.item-row').filter(has=page.get_by_text(DATA['item']['title'],exact=True)).click();page.get_by_role('button',name='판매자와 채팅',exact=True).click()
  def fits():
   v=page.evaluate("""()=>{const c=document.querySelector('.sheet-content'),log=document.querySelector('.trade-chat'),dock=document.querySelector('.purchase-dock');return {overflow:c.scrollHeight-c.clientHeight,log:log.clientHeight,bottom:dock.getBoundingClientRect().bottom,nav:document.querySelector('nav').getBoundingClientRect().top,width:document.documentElement.scrollWidth-innerWidth}}""")
   assert v['overflow']<=2,v;assert v['log']>=60,v;assert v['bottom']<=v['nav']+2,v;assert v['width']<=0,v
  fits();page.get_by_role('button',name='인사하기',exact=True).click();fits()
  page.get_by_role('button',name='가격 제안',exact=False).first.click();expect(page.locator('.dialogue-options')).to_have_count(0);expect(page.locator('.offer-options')).to_be_visible();fits()
  page.get_by_role('button',name='질문',exact=False).first.click();expect(page.locator('.dialogue-options')).to_be_visible()
  page.get_by_role('button',name='상품 보기',exact=True).click();expect(page.get_by_role('region',name='판매자 프로필')).to_be_visible();page.get_by_role('button',name='대화 이어보기',exact=True).click();expect(page.locator('.chat-message')).to_have_count(3);fits()
  page.get_by_role('button',name='상태 물어보기',exact=True).click();page.get_by_role('button',name='조건 확인했어요',exact=True).click();page.get_by_role('button',name='더 자세히 묻기',exact=True).click();fits()
  log=page.locator('.trade-chat');assert log.evaluate('(e)=>Math.abs(e.scrollHeight-e.scrollTop-e.clientHeight)<3')
  if width in [320,390]:page.screenshot(path=f'work/chat-layout-{width}.png',full_page=True)
  page.get_by_role('button',name='구매 내용 확인',exact=False).click();expect(page.locator('.conversation-composer')).to_be_hidden();fits();page.get_by_role('button',name='구매하지 않기',exact=True).click();expect(page.locator('.conversation-composer')).to_be_visible();fits()
  page.get_by_role('button',name='대화 종료',exact=True).click();expect(page.locator('p.chat-ended')).to_have_text('대화 종료');fits()
  assert not errors,errors;c.close();print(f'{width}x{height} chat/choices/confirmation fit, product toggle, auto-scroll and close PASS',flush=True)
 b.close()
