"""Seller counteroffer chat and keeping listings after failed trades."""
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
  ctx=browser.new_context(viewport={'width':width,'height':844},is_mobile=True,has_touch=True)
  page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(BASE);page.get_by_role('heading',name='활동',exact=True).wait_for()
  def load(seed=1000):
   data=json.loads(Path('work/seller-counter.json').read_text());data['game']['seed']=seed
   page.evaluate(WRITE,data);page.reload();page.get_by_role('heading',name='문의',exact=True).wait_for();return data['game']
  def state():return page.evaluate(READ)
  def propose(amount):
   page.get_by_label('제안할 판매 가격 (원)',exact=True).first.fill(str(amount))
   page.get_by_role('button',name='가격 제안 · 0시간',exact=True).first.click()
   assert page.locator('.action-layer').count()==0
  g=load()
  field=page.get_by_label('제안할 판매 가격 (원)',exact=True).first
  for invalid in ['100','1001','1.5']:
   field.fill(invalid);assert page.get_by_role('button',name='가격 제안 · 0시간',exact=True).first.is_disabled()
  propose(200)
  expect(page.get_by_role('log').first).to_contain_text('좋아요. 200 원에 거래해요.')
  page.wait_for_function("async()=>(await ("+READ+")()).inquiries[0].price===200")
  assert state()['minute']==g['minute'];assert state()['cash']==g['cash']
  page.reload();expect(page.get_by_role('log').first).to_contain_text('좋아요. 200 원에 거래해요.')
  page.get_by_role('log').first.scroll_into_view_if_needed();page.screenshot(path=f'work/seller-counter-{width}.png',full_page=True)
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.get_by_role('button',name='수락하고 거래 · 1시간',exact=True).first.click();expect(page.locator('.action-layer')).to_be_visible();expect(page.locator('.action-layer')).to_have_count(0)
  assert state()['cash']==g['cash']+200;assert state()['minute']==g['minute']+60
  assert not state()['sales'] and not state()['inventory']
  # Above-budget counteroffer gets a reply, without changing listing or time.
  g=load();propose(800);expect(page.get_by_role('log').first).to_contain_text('그 가격은 어렵습니다.')
  page.wait_for_function("async()=>(await ("+READ+")()).inquiries[0].price>100")
  assert state()['sales']==g['sales'];assert state()['minute']==g['minute']
  # Walking buyer closes only that chat, preserving the other buyer and whole listing.
  g=load(1);propose(800)
  page.wait_for_function("async id=>!(await ("+READ+")()).inquiries.some(q=>q.id===id)",arg=g['inquiries'][0]['id'])
  assert state()['sales']==g['sales'];assert state()['inquiries']==g['inquiries'][1:]
  assert state()['minute']==g['minute'];assert state()['inventory']==g['inventory']
  page.get_by_role('button',name='거래 파토 · 0시간',exact=True).first.click()
  page.wait_for_function("async()=>!(await ("+READ+")()).inquiries.length")
  assert state()['sales']==g['sales'];assert state()['minute']==g['minute']
  page.reload();expect(page.get_by_role('heading',name='활동',exact=True)).to_be_visible()
  assert state()['sales']==g['sales']
  for _ in range(16):
   page.get_by_role('button',name='구매 문의 기다리기 · 1시간',exact=True).click()
   expect(page.locator('.action-layer')).to_have_count(0)
   if page.get_by_role('heading',name='문의',exact=True).count():break
  expect(page.get_by_role('heading',name='문의',exact=True)).to_be_visible()
  assert state()['sales'][0]['id']==g['sales'][0]['id']
  assert state()['sales'][0]['price']==g['sales'][0]['price']
  assert state()['sales'][0]['expires']==g['sales'][0]['expires']
  assert not errors,errors
  results.append({'width':width,'counter_accept_reload_sale':'PASS','counter_reply':'PASS','walk_keeps_other_buyers':'PASS','listing_retained_new_inquiry':'PASS'})
  ctx.close()
 browser.close();print(json.dumps(results))
