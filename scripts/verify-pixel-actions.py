"""Pixel player portrait and actual action scenes; frozen JS clock inspects the unchanged 750ms overlay."""
import json,os
from datetime import datetime,timedelta,timezone
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
BASE=os.getenv('SCREEN_BASE_URL','http://127.0.0.1:4182')
DATA=json.loads(Path('work/dialogue-fixture.json').read_text())
WRITE="""async data=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});await new Promise(r=>{const tx=db.transaction('saves','readwrite');tx.objectStore('saves').put(data,'current');tx.oncomplete=r});db.close()}"""
READ="""async()=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});return await new Promise(r=>{const q=db.transaction('saves').objectStore('saves').get('current');q.onsuccess=()=>{db.close();r(q.result.game)}})}"""
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
 for width,height in [(320,568),(375,667),(390,844),(430,932)]:
  c=b.new_context(viewport={'width':width,'height':height},is_mobile=True,has_touch=True);page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(BASE);page.get_by_role('heading',name='활동',exact=True).wait_for();page.evaluate(WRITE,DATA['save']);page.reload()
  nav=page.get_by_role('navigation',name='주요 메뉴');nav.get_by_role('button',name='내 정보',exact=True).click();expect(page.get_by_role('region',name='내 캐릭터')).to_be_visible();expect(page.locator('.player-character-portrait .pixel-character')).to_have_count(1)
  if width==390:page.screenshot(path='work/pixel-profile-390.png',full_page=True)
  nav.get_by_role('button',name='활동',exact=True).click();page.locator('.activity-grid').get_by_role('button',name='중고 장터',exact=True).click();page.locator('.item-row').filter(has=page.get_by_text(DATA['item']['title'],exact=True)).click();page.get_by_role('button',name='구매 내용 확인',exact=False).click()
  page.clock.install();page.clock.pause_at(datetime.now(timezone.utc)+timedelta(seconds=1))
  def scene(kind):
   expect(page.locator('.action-layer')).to_be_visible();expect(page.locator('.action-scene')).to_have_attribute('data-scene',kind)
   expect(page.locator('.action-scene .pixel-character')).to_have_count(2 if kind in ['buy','sell'] else 1)
   assert page.locator('.action-scene .pixel-character').evaluate_all('(sprites)=>sprites.every(s=>s.getAttribute("width")=="24" && s.getAttribute("height")=="32")')
   state=page.evaluate(READ);assert 'scene' not in state and 'action' not in state
   page.evaluate("document.querySelector('.action-scene').getAnimations({subtree:true}).forEach(a=>{a.pause();a.currentTime=450})")
   r=page.locator('.action-progress').bounding_box();assert r and r['x']>=0 and r['x']+r['width']<=width+1 and r['y']>=0 and r['y']+r['height']<=height+1,r
   if width==390:page.screenshot(path='work/pixel-'+kind+'-390.png',full_page=True)
   page.clock.run_for(749);expect(page.locator('.action-layer')).to_be_visible();page.clock.run_for(1);expect(page.locator('.action-layer')).to_have_count(0)
   assert page.evaluate(READ)==state,'presentation must not replay the transaction'
  page.get_by_role('button',name='지불·수령 확정',exact=True).click();scene('buy')
  nav.get_by_role('button',name='활동',exact=True).click();page.locator('.activity-grid').get_by_role('button',name='물건 수집',exact=True).click();page.get_by_role('button',name='물건 수집하기',exact=True).click();scene('search')
  page.get_by_role('button',name='닫기',exact=True).click();page.locator('.activity-grid').get_by_role('button',name='아르바이트',exact=True).click();page.get_by_role('button',name='일하기',exact=True).first.click();scene('work')
  page.get_by_role('button',name='닫기',exact=True).click();nav.get_by_role('button',name='보관함',exact=True).click();page.locator('.item-row').first.click();page.get_by_role('button',name='가치 확인',exact=False).click();scene('inspect');page.get_by_role('button',name='즉시 판매',exact=True).click();page.locator('.sheet-layer .item-row').first.click();page.get_by_role('button',name='판매 확정',exact=True).click();scene('sell')
  assert not errors,errors;assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');c.close();print(f'{width}x{height} portrait, buy/sell/search/work/inspect scenes, 750ms lock, single commit/save, mobile fit PASS',flush=True)
 # A free gift shares the encounter, but no money changes hands in either state or artwork.
 c=b.new_context(viewport={'width':390,'height':844});page=c.new_page();page.goto(BASE);page.get_by_role('heading',name='활동',exact=True).wait_for();free=json.loads(json.dumps(DATA['save']));item=next(i for i in free['game']['board'] if i['id']==DATA['item']['id']);item['price']=0;item['offers']=[];page.evaluate(WRITE,free);page.reload();page.locator('.activity-grid').get_by_role('button',name='무료나눔',exact=True).click();page.locator('.item-row').filter(has=page.get_by_text(item['title'],exact=True)).click();page.get_by_role('button',name='나눔 수령 확인',exact=False).click();page.clock.install();page.clock.pause_at(datetime.now(timezone.utc)+timedelta(seconds=1));page.get_by_role('button',name='나눔 수령 확정',exact=True).click();expect(page.locator('.action-scene')).to_have_attribute('data-scene','gift');expect(page.locator('.action-scene .pixel-character')).to_have_count(2);expect(page.locator('.scene-payment')).to_have_count(0);assert page.evaluate(READ)['cash']==free['game']['cash'];page.clock.run_for(750);expect(page.locator('.action-layer')).to_have_count(0);c.close();print('free gift encounter without payment artwork/cash deduction PASS',flush=True)
 # Motion preference must suppress every decorative CSS animation.
 c=b.new_context(viewport={'width':390,'height':844},reduced_motion='reduce');page=c.new_page();page.goto(BASE);page.locator('.activity-grid').get_by_role('button',name='물건 수집',exact=True).click();page.clock.install();page.clock.pause_at(datetime.now(timezone.utc)+timedelta(seconds=1));page.get_by_role('button',name='물건 수집하기',exact=True).click();expect(page.locator('.action-scene')).to_be_visible();assert page.locator('.action-scene').evaluate('(e)=>e.getAnimations({subtree:true}).length')==0;page.clock.run_for(750);expect(page.locator('.action-layer')).to_have_count(0);c.close();print('reduced-motion static scene and normal completion PASS',flush=True)
 b.close()
