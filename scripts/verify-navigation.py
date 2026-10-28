"""Real mobile navigation regression. Run prepare-profiles-codex.mjs first."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
BASE=os.getenv('SCREEN_BASE_URL','http://127.0.0.1:4182')
DATA=json.loads(Path('work/profile-fixtures.json').read_text())
WRITE="""async data=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});await new Promise(r=>{const tx=db.transaction('saves','readwrite');tx.objectStore('saves').put(data,'current');tx.oncomplete=r});db.close()}"""
READ="""async()=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});return await new Promise(r=>{const q=db.transaction('saves').objectStore('saves').get('current');q.onsuccess=()=>{db.close();r(q.result)}})}"""
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
 for width,height in [(320,667),(375,667),(390,844),(430,932),(900,900)]:
  c=b.new_context(viewport={'width':width,'height':height},is_mobile=width<500,has_touch=width<500);page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(BASE);page.get_by_role('heading',name='활동',exact=True).wait_for();page.evaluate(WRITE,DATA['initial']);page.reload();page.get_by_role('heading',name='활동',exact=True).wait_for()
  nav=page.get_by_role('navigation',name='주요 메뉴');expect(nav).to_be_visible();page.locator('.activity-grid').get_by_role('button',name='중고 장터',exact=True).click()
  page.get_by_label('매물 정렬',exact=True).select_option('high');scroller=page.locator('.sheet-content');scroller.evaluate('(e)=>e.scrollTop=350');page.wait_for_timeout(100)
  # Pick a visible row so click automation does not change the saved list position.
  row=page.locator('.item-row').nth(4)
  row.scroll_into_view_if_needed();page.wait_for_timeout(100);offset=scroller.evaluate('(e)=>e.scrollTop');row.click();expect(page.locator('#sheet-title')).to_have_text('매물')
  page.get_by_role('button',name='← 뒤로',exact=True).click();expect(page.locator('#sheet-title')).to_have_text('중고 장터');expect(page.get_by_label('매물 정렬',exact=True)).to_have_value('high');assert abs(scroller.evaluate('(e)=>e.scrollTop')-offset)<3,(width,offset,scroller.evaluate('(e)=>e.scrollTop'))
  page.locator('.item-row').nth(4).click();expect(page.locator('#sheet-title')).to_have_text('매물');page.go_back();expect(page.locator('#sheet-title')).to_have_text('중고 장터');assert abs(scroller.evaluate('(e)=>e.scrollTop')-offset)<3
  search=page.get_by_role('textbox',name='매물 검색');search.fill(DATA['flex']['title']);expect(page.locator('.item-row').first).to_contain_text(DATA['flex']['title']);filtered=page.locator('.item-row').count();page.locator('.item-row').first.click();expect(page.locator('#sheet-title')).to_have_text('매물');page.go_back();expect(search).to_have_value(DATA['flex']['title']);expect(page.locator('.item-row')).to_have_count(filtered);page.go_forward();expect(page.locator('#sheet-title')).to_have_text('매물')
  nav.get_by_role('button',name='보관함',exact=True).click();expect(page.locator('.sheet-layer')).to_have_count(0);expect(page.get_by_role('heading',name='보관함',exact=False)).to_be_visible();page.go_back();expect(page.locator('#sheet-title')).to_have_text('매물');page.get_by_role('button',name='활동으로 이동',exact=True).click();expect(page.get_by_role('heading',name='활동',exact=True)).to_be_visible()
  saved=page.evaluate(READ);assert saved['game']==DATA['initial']['game'],'navigation must not change gameplay'
  if width==390:page.screenshot(path='work/ui-home-390.png',full_page=True)
  assert page.locator('.status-header').bounding_box()['height']<190
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.evaluate(WRITE,DATA['inquiries']);page.reload();expect(page.get_by_role('region',name='구매자 프로필')).to_have_count(2);assert nav.locator('button:disabled').count()==5;expect(page.get_by_role('button',name='활동으로 이동',exact=True)).to_be_disabled();page.go_back();expect(page.get_by_role('region',name='구매자 프로필')).to_have_count(2)
  assert not errors,errors
  c.close();print(f'{width}x{height}: toolbar/native back-forward, list scroll/search/sort restoration, tabs/home, no action or money change, pending inquiry lock PASS',flush=True)
 b.close()
