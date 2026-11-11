"""Approved PNG bytes, exact review crops, shared scenes and offline availability."""
import hashlib,json
from io import BytesIO
from PIL import Image,ImageChops
from pathlib import Path
from datetime import datetime,timedelta,timezone
from playwright.sync_api import sync_playwright,expect
EXPECTED_SHA='c2ed3bc545cba579a9939e591a07f6711a5d6ed754ac714dd34249d73b3d0b40'
FIXTURE=json.loads(Path('work/chat-fixtures.json').read_text())['basic']
WRITE="""async d=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});await new Promise(r=>{const tx=db.transaction('saves','readwrite');tx.objectStore('saves').put(d,'slot:1');tx.oncomplete=r});db.close();sessionStorage.setItem('resale:resume',JSON.stringify({version:1,screen:'game',slot:1,tab:'활동'}))}"""
READ="""async()=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});return await new Promise(r=>{const q=db.transaction('saves').objectStore('saves').get('slot:1');q.onsuccess=()=>{db.close();r(q.result.game)}})}"""
CROPS={'male':'218 20 500 940','female':'806 80 500 880'}
def actor(svg,url,gender=None):
 expect(svg).to_have_attribute('data-style','b-approved-png');expect(svg.locator('image')).to_have_count(1);expect(svg.locator('path,rect,polygon')).to_have_count(0);expect(svg.locator('image')).to_have_attribute('href',url)
 assert svg.evaluate('(n)=>getComputedStyle(n).overflow')=='hidden'
 if gender:expect(svg).to_have_attribute('viewBox',CROPS[gender])
def compare_review(page,svg,url,gender):
 actual=svg.screenshot();box=svg.bounding_box();color=svg.evaluate('(n)=>getComputedStyle(n.parentElement).backgroundColor')
 page.evaluate("""({url,crop,box,color})=>{const s=document.createElementNS('http://www.w3.org/2000/svg','svg');s.id='review-reference';s.setAttribute('viewBox',crop);s.setAttribute('width',box.width);s.setAttribute('height',box.height);s.style.cssText=`position:fixed;z-index:999;left:${box.x}px;top:${box.y}px;image-rendering:pixelated;background:${color};`;const i=document.createElementNS(s.namespaceURI,'image');i.setAttribute('href',url);i.setAttribute('width','1536');i.setAttribute('height','1024');s.append(i);document.body.append(s)}""",{'url':url,'crop':CROPS[gender],'box':box,'color':color})
 reference=page.locator('#review-reference').screenshot();page.locator('#review-reference').evaluate('(n)=>n.remove()');diff=ImageChops.difference(Image.open(BytesIO(actual)).convert('RGB'),Image.open(BytesIO(reference)).convert('RGB'));assert diff.getbbox() is None,'Game portrait differs from approval reference'
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for w,h in [(320,568),(390,844),(430,932),(1024,768)]:
  c=b.new_context(viewport={'width':w,'height':h},reduced_motion='reduce');page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:4182');page.get_by_role('button',name='새로 시작',exact=True).click();page.get_by_label('닉네임',exact=True).fill('승인캐릭터');expect(page.get_by_role('group',name='아바타')).to_be_visible();expect(page.get_by_role('radio')).to_have_count(2)
  preview=page.locator('.create-preview .pixel-character');url=preview.locator('image').get_attribute('href');response=page.request.get('http://127.0.0.1:4182'+url);assert hashlib.sha256(response.body()).hexdigest()==EXPECTED_SHA
  for gender,label in [('male','남자'),('female','여자')]:page.get_by_role('group',name='아바타').locator('label').filter(has_text=label).click();actor(preview,url,gender)
  page.get_by_role('button',name='이 캐릭터로 시작',exact=True).click();page.get_by_role('button',name='스킵',exact=True).click();actor(page.locator('.story-stage .pixel-character[data-avatar]'),url,'female');page.get_by_role('button',name='시작하기',exact=True).click();page.get_by_role('button',name='내 정보',exact=True).click();portrait=page.locator('.player-character-portrait .pixel-character');actor(portrait,url,'female');compare_review(page,portrait,url,'female')
  if w==390:page.screenshot(path='work/approved-png-info-390.png')
  page.get_by_role('button',name='닫기',exact=True).click();page.get_by_role('navigation',name='주요 메뉴').get_by_role('button',name='일상',exact=True).click();page.clock.install();page.clock.pause_at(datetime.now(timezone.utc)+timedelta(seconds=1));page.locator('.daily-row').filter(has_text='아르바이트').click();page.locator('.confirmation-submit').click();actor(page.locator('.action-layer .scene-player .pixel-character'),url,'female');page.clock.run_for(800);expect(page.locator('.action-layer')).to_have_count(0);page.clock.resume()
  assert page.evaluate("previewEvent('bundle')") is True
  for svg in page.locator('[data-event-preview] .story-stage .pixel-character').all():actor(svg,url)
  page.keyboard.press('Escape')
  legacy=json.loads(json.dumps(FIXTURE));legacy['game']['player']={'nickname':'기존외형','appearance':{'avatar':'male','hair':'long','clothing':'coat','outfit':'rose','skin':'deep'}};page.evaluate(WRITE,legacy);page.reload();page.get_by_role('button',name='내 정보',exact=True).click();portrait=page.locator('.player-character-portrait .pixel-character');actor(portrait,url,'male');compare_review(page,portrait,url,'male');assert page.evaluate(READ)['player']==legacy['game']['player'];page.get_by_role('button',name='닫기',exact=True).click()
  page.wait_for_function('navigator.serviceWorker.controller !== null');page.evaluate('()=>navigator.serviceWorker.ready');c.set_offline(True);page.reload();page.get_by_role('button',name='내 정보',exact=True).click();actor(page.locator('.player-character-portrait .pixel-character'),url,'male');page.evaluate("""url=>new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(true);i.onerror=()=>reject(Error('Approved PNG unavailable offline'));i.src=url})""",url);c.set_offline(False)
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert not errors,errors;print(f'{w}x{h}: exact approved PNG SHA, two base avatars, pixel-identical review/game portraits, shared intro/action/event PNG, legacy choices preserved, reload offline asset load, no overflow/errors PASS',flush=True);c.close()
 b.close()
