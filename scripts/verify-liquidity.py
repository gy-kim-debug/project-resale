"""Real listing registration waits two later actions while paid work advances its clock."""
import json, subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
subprocess.run(['node','scripts/prepare-liquidity-fixture.mjs'],check=True)
READ="""async()=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});return await new Promise(r=>{const q=db.transaction('saves').objectStore('saves').get('current');q.onsuccess=()=>{db.close();r(q.result)}})}"""
WRITE="""async data=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});await new Promise(r=>{const tx=db.transaction('saves','readwrite');tx.objectStore('saves').put(data,'current');tx.oncomplete=r});db.close()}"""
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in [320,375,390,430]:
  ctx=browser.new_context(viewport={'width':width,'height':844},is_mobile=True,has_touch=True);page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto('http://127.0.0.1:4182');page.get_by_role('heading',name='활동',exact=True).wait_for()
  fixture=json.loads(Path('work/liquidity-ui.json').read_text());page.evaluate(WRITE,fixture);page.reload();page.get_by_role('heading',name='활동',exact=True).wait_for()
  def read():return page.evaluate(READ)['game']
  def reload():page.reload();page.get_by_role('heading',name='활동',exact=True).wait_for()
  def job():
   page.locator('.activity-grid').get_by_role('button',name='아르바이트',exact=True).click();page.locator('section.card').filter(has=page.get_by_role('heading',name='창고 분류',exact=True)).get_by_role('button',name='일하기',exact=True).click();expect(page.locator('.action-layer')).to_have_count(0)
  page.get_by_role('navigation',name='주요 메뉴').get_by_role('button',name='보관함',exact=True).click();page.locator('.item-row').first.click();page.get_by_role('button',name='중고 장터에 판매 등록',exact=True).click()
  page.get_by_label('판매 가격 (원)',exact=True).fill('1000');page.get_by_role('button',name='판매 글 등록 확정',exact=True).click();expect(page.locator('.action-layer')).to_have_count(0)
  posted=read();assert posted['minute']==480 and posted['weekActions']==1 and not posted['inquiries'];assert posted['sales'][0]['nextCheck']==1440 and posted['sales'][0]['expires']==4320
  reload();assert read()==posted;job();first=read();assert first['minute']==960 and first['cash']==538000 and not first['inquiries']
  reload();assert read()['sales']==first['sales'];job();second=read();assert second['minute']==1440 and second['cash']==576000 and len(second['inquiries'])==2
  expect(page.get_by_role('heading',name='문의',exact=True)).to_be_visible();offer=second['inquiries'][0]['price']
  page.get_by_role('button',name='수락하고 거래',exact=True).first.click();expect(page.locator('.action-layer')).to_have_count(0)
  sold=read();assert sold['minute']==1920 and sold['weekActions']==4 and sold['cash']==576000+offer and not sold['sales'] and not sold['inventory']
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth') and not errors,errors
  ctx.close();print(f'{width}px registration/delay, two paid jobs, deadline/reload preservation, inquiry and one-action sale PASS',flush=True)
 browser.close()
