"""Bargaining and ending are free; only completed transactions cost one action. Production browser QA."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
BASE=os.getenv('SCREEN_BASE_URL','http://127.0.0.1:4182')
WRITE="""async data=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});await new Promise(r=>{const tx=db.transaction('saves','readwrite');tx.objectStore('saves').put(data,'current');tx.oncomplete=r});db.close()}"""
READ="""async()=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});return await new Promise(r=>{const q=db.transaction('saves').objectStore('saves').get('current');q.onsuccess=()=>{db.close();r(q.result.game)}})}"""
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
 results=[]
 for width in [320,375,390,430]:
  context=browser.new_context(viewport={'width':width,'height':844},is_mobile=True,has_touch=True)
  page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(BASE);page.get_by_role('heading',name='활동',exact=True).wait_for()
  def load(name,seed=None):
   data=json.loads(Path('work/'+name+'.json').read_text())
   if name=='rich':
    data['game']['board'][0]['inspected']=True # legacy saves must not reveal pre-purchase condition
   if seed is not None:
    data['game']['seed']=seed
    data['game']['inquiries'][0].update(price=100,max=1000,rounds=0,chat=[{'speaker':'other','text':'100 원에 거래할 수 있을까요?'}])
   page.evaluate(WRITE,data);page.reload();return data['game']
  def read():return page.evaluate(READ)
  def settled():expect(page.locator('.action-layer')).to_have_count(0)
  def purchase_chat():
   page.locator('.activity-grid').get_by_role('button',name='장터',exact=True).click()
   page.locator('.item-row').first.click()
   page.get_by_role('button',name='판매자와 채팅',exact=True).click()
  start=load('rich');purchase_chat()
  expect(page.get_by_role('log')).to_be_visible()
  expect(page.get_by_role('button',name='구매 전',exact=False)).to_have_count(0)
  expect(page.get_by_text('상태:',exact=False)).to_have_count(0)
  page.get_by_role('button',name=' 제안 · 행동 소모 없음').first.click()
  assert page.locator('.action-layer').count()==0
  expect(page.locator('.chat-message')).to_have_count(3)
  page.wait_for_function("async()=>!!(await ("+READ+")()).board[0].chat")
  assert read()['minute']==start['minute']
  page.reload();page.locator('.activity-grid').get_by_role('button',name='장터',exact=True).click();page.locator('.item-row').first.click()
  expect(page.locator('.chat-message')).to_have_count(3)
  page.get_by_role('log').scroll_into_view_if_needed()
  page.screenshot(path=f'work/chat-purchase-{width}.png',full_page=True)
  page.get_by_role('button',name='구매 내용 확인').click()
  page.get_by_role('button',name='지불·수령 확정 · 행동 1회',exact=True).click();expect(page.locator('.action-layer')).to_be_visible();settled()
  assert read()['minute']==start['minute']+480
  assert read()['inventory'][0]['chatSettled']
  start=load('rich');purchase_chat();page.get_by_role('button',name=' 제안 · 행동 소모 없음').first.click()
  page.get_by_role('button',name='거래하지 않고 흥정 종료 · 행동 소모 없음',exact=True).click();settled()
  page.wait_for_function("async()=>(await ("+READ+")()).board[0].chatSettled")
  assert read()['minute']==start['minute']
  expect(page.get_by_text('대화 종료',exact=True)).to_be_visible()
  start=load('pending',1000)
  page.get_by_role('button',name='거절 · 행동 소모 없음',exact=True).first.click()
  assert page.locator('.action-layer').count()==0
  expect(page.get_by_role('log').first.locator('.chat-message')).to_have_count(3)
  page.wait_for_function("async()=>(await ("+READ+")()).inquiries[0].rounds===1")
  assert read()['minute']==start['minute']
  page.reload();expect(page.get_by_role('log').first.locator('.chat-message')).to_have_count(3)
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.screenshot(path=f'work/chat-inquiry-{width}.png',full_page=True)
  page.get_by_role('button',name='수락하고 거래 · 행동 1회',exact=True).first.click();expect(page.locator('.action-layer')).to_be_visible();settled()
  assert read()['minute']==start['minute']+480
  for ending in ['walk','break']:
   start=load('pending',1)
   name='거절 · 행동 소모 없음' if ending=='walk' else '거래 파토 · 행동 소모 없음'
   page.get_by_role('button',name=name,exact=True).first.click();settled()
   page.wait_for_function("async id=>!(await ("+READ+")()).inquiries.some(q=>q.id===id)",arg=start['inquiries'][0]['id'])
   assert read()['minute']==start['minute']
   assert len(read()['inquiries'])==len(start['inquiries'])-1
   assert read()['sales']==start['sales']
  assert not errors,errors
  results.append({'width':width,'purchase_chat_reload':'PASS','counteroffer_reload':'PASS','purchase_sale_one_action':'PASS','chat_close_break_walk_zero_time':'PASS'})
  context.close()
 browser.close();print(json.dumps(results))
