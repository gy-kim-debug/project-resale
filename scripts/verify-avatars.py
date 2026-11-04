"""Mobile creation, shared avatar rendering, isolated saves and pre-avatar profile compatibility."""
import json
from datetime import datetime,timedelta,timezone
from playwright.sync_api import sync_playwright,expect
READ="""async key=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});const result=await new Promise(r=>{const q=db.transaction('saves').objectStore('saves').get(key);q.onsuccess=()=>r(q.result)});db.close();return result}"""
WRITE="""async data=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});await new Promise(r=>{const tx=db.transaction('saves','readwrite');tx.objectStore('saves').put(data,'slot:3');tx.oncomplete=r});db.close()}"""
EXPECTED={'avatar':'female','clothing':'hoodie','hair':'ponytail','outfit':'rose','skin':'deep'}
def select(page,group,text):page.get_by_role('group',name=group,exact=True).locator('label').filter(has_text=text).click()
def traits(svg,expected):
 for key,value in expected.items():expect(svg).to_have_attribute('data-'+key,value)
def intro(page):
 expect(page.get_by_role('heading',name='첫 정산까지',exact=True)).to_be_visible();page.get_by_role('button',name='스킵',exact=True).click();page.get_by_role('button',name='시작하기',exact=True).click();expect(page.locator('.story-layer')).to_have_count(0)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);gallery=[]
 for w,h in [(320,568),(390,844),(430,932),(1024,768)]:
  c=b.new_context(viewport={'width':w,'height':h},is_mobile=w<600,has_touch=w<600);page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:4182');page.get_by_role('button',name='새로 시작',exact=True).click();page.get_by_label('닉네임',exact=True).fill('여자아바타');svg=page.locator('.create-preview .pixel-character')
  for label,count in [('아바타',2),('헤어',5),('옷 종류',5),('옷 색상',6),('피부색',3)]:expect(page.get_by_role('group',name=label,exact=True).get_by_role('radio')).to_have_count(count)
  select(page,'헤어','단발');select(page,'옷 색상','로즈');select(page,'피부색','짙은 톤')
  for gender in ['여자','남자']:
   select(page,'아바타',gender)
   for garment in ['재킷','티셔츠','후드','코트','원피스']:
    select(page,'옷 종류',garment);traits(svg,{'avatar':'female' if gender=='여자' else 'male','hair':'bob','outfit':'rose','skin':'deep'});box=page.locator('.create-preview').bounding_box();assert box and box['y']>=0 and box['y']+box['height']<=h
    if w==390:gallery.append((gender+' · '+garment,svg.evaluate('n=>n.outerHTML')))
  select(page,'아바타','여자');select(page,'헤어','묶은 머리');select(page,'옷 종류','후드');traits(svg,EXPECTED);pixels=svg.inner_html()
  if w==390:page.screenshot(path='work/avatar-create-390.png')
  page.get_by_role('button',name='이 캐릭터로 시작',exact=True).click();traits(page.locator('.story-stage .pixel-character[data-avatar]'),EXPECTED);assert page.locator('.story-stage .pixel-character[data-avatar]').inner_html()==pixels;intro(page)
  nav=page.get_by_role('navigation',name='주요 메뉴');nav.get_by_role('button',name='내 정보',exact=True).click();portrait=page.locator('.player-character-portrait .pixel-character');traits(portrait,EXPECTED);assert portrait.inner_html()==pixels
  if w==390:page.screenshot(path='work/avatar-info-390.png')
  nav.get_by_role('button',name='활동',exact=True).click();page.locator('.activity-grid').get_by_role('button',name='아르바이트',exact=True).click();page.clock.install();page.clock.pause_at(datetime.now(timezone.utc)+timedelta(seconds=1));page.get_by_role('button',name='일하기',exact=False).first.click();traits(page.locator('.action-layer .scene-player .pixel-character'),EXPECTED);assert page.locator('.action-layer .scene-player .pixel-character').inner_html()==pixels;page.clock.run_for(750);expect(page.locator('.action-layer')).to_have_count(0);page.clock.resume()
  assert page.evaluate("previewEvent('bundle')") is True;traits(page.locator('[data-event-preview] .story-stage .pixel-character[data-avatar]'),EXPECTED);assert page.locator('[data-event-preview] .story-stage .pixel-character[data-avatar]').inner_html()==pixels;page.keyboard.press('Escape')
  first=page.evaluate(READ,'slot:1');assert first['game']['player']['appearance']==EXPECTED and first['game']['weekActions']==1
  page.reload();traits(page.locator('.start-hero .pixel-character'),EXPECTED);page.get_by_role('button',name='이어하기',exact=True).click();nav.get_by_role('button',name='내 정보',exact=True).click();traits(page.locator('.player-character-portrait .pixel-character'),EXPECTED)
  # A second body/clothing profile is independent, including after another start.
  page.reload();page.get_by_role('button',name='새로 시작',exact=True).click();page.get_by_label('닉네임',exact=True).fill('남자아바타');select(page,'아바타','남자');select(page,'헤어','짧은 머리');select(page,'옷 종류','코트');select(page,'옷 색상','블루');select(page,'피부색','밝은 톤');male={'avatar':'male','hair':'short','clothing':'coat','outfit':'blue','skin':'light'};page.get_by_role('button',name='이 캐릭터로 시작',exact=True).click();traits(page.locator('.story-stage .pixel-character[data-avatar]'),male);intro(page);assert page.evaluate(READ,'slot:1')['game']['player']['appearance']==EXPECTED;assert page.evaluate(READ,'slot:2')['game']['player']['appearance']==male
  # Original hair/color/skin profiles retain their raw save and original fallback pixels.
  old=json.loads(json.dumps(first));old['game']['player']={'nickname':'옛캐릭터','appearance':{'hair':'long','outfit':'rose','skin':'deep'}};page.evaluate(WRITE,old);page.reload();page.get_by_role('button',name='저장 슬롯',exact=False).click();page.get_by_role('region',name='슬롯 3',exact=True).get_by_role('button',name='이 슬롯 이어하기',exact=True).click();nav.get_by_role('button',name='내 정보',exact=True).click();traits(page.locator('.player-character-portrait .pixel-character'),{'avatar':'male','clothing':'jacket','hair':'long','outfit':'rose','skin':'deep'});assert page.evaluate(READ,'slot:3')['game']['player']==old['game']['player']
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth') and not errors,errors;c.close();print(f'{w}x{h}: 5 customization groups/live types+garments, sticky preview, shared intro/info/action/event pixels, independent slots/reload, legacy profile PASS',flush=True)
 page=b.new_page(viewport={'width':1000,'height':500});cards=''.join('<div><h2>'+name+'</h2>'+svg+'</div>' for name,svg in gallery);page.set_content('<html lang="ko"><style>body{margin:0;background:#101923;color:#e6f1ed;font:14px sans-serif}.grid{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;padding:18px}.grid>div{background:#213a33;padding:10px;text-align:center;border-radius:12px}h2{font-size:14px}svg{width:96px;height:128px;image-rendering:pixelated}</style><div class="grid">'+cards+'</div></html>');page.screenshot(path='work/avatar-gallery.png',full_page=True);b.close()
