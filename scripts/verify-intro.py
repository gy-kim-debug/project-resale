"""Real creation/intro/resume/skip plus detached preview and reduced-motion QA."""
import json
from playwright.sync_api import sync_playwright,expect
SHOTS=['window','family','door','departure','child','contract','wake','debt','balance','listing','resolve','exit']
READ="""async()=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});return await new Promise(r=>{const q=db.transaction('saves').objectStore('saves').get('slot:1');q.onsuccess=()=>{db.close();r(q.result.game)}})}"""
def read(page):return page.evaluate(READ)
def stored(page,step):page.wait_for_function('async()=>{const g=await ('+READ+')();return g.story.active?.step==='+str(step)+'}')
def start(page):
 page.goto('http://127.0.0.1:4182');page.get_by_role('button',name='새로 시작',exact=True).click();page.get_by_label('닉네임',exact=True).fill('나래');page.get_by_role('radio',name='여자',exact=True).click();page.get_by_role('button',name='이 캐릭터로 시작',exact=True).click();expect(page.locator('[data-intro-shot=window]')).to_be_visible();stored(page,0)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for w,h in [(320,568),(390,844),(430,932),(1024,768)]:
  c=b.new_context(viewport={'width':w,'height':h});page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));start(page);before=read(page);bounds=None
  for step,shot in enumerate(SHOTS):
   stage=page.locator('[data-intro-shot]');expect(stage).to_have_attribute('data-intro-shot',shot);box=stage.bounding_box()
   if bounds is None:bounds=box
   assert abs(box['y']-bounds['y'])<1 and abs(box['height']-bounds['height'])<1,(shot,box,bounds)
   if shot=='window':
    expect(page.get_by_role('button',name='소리 켜기',exact=True)).to_have_attribute('aria-pressed','false');page.get_by_role('button',name='소리 켜기',exact=True).click();expect(page.get_by_role('button',name='소리 끄기',exact=True)).to_have_attribute('aria-pressed','true')
   if shot=='resolve':
    expect(page.get_by_role('button',name='다음',exact=True)).to_be_enabled();face=page.locator('.intro-face').bounding_box();assert min(face['x']+face['width'],box['x']+box['width'])-max(face['x'],box['x'])>box['width']*.25 and min(face['y']+face['height'],box['y']+box['height'])-max(face['y'],box['y'])>box['height']*.5,(face,box)
   if shot=='debt':expect(page.locator('.story-line')).to_contain_text('10,000,000,000원')
   if w==390 and shot in ['window','door','child','contract','wake','debt','resolve','exit']:
    # Capture after the finite entrance without advancing narrative.
    primary=page.get_by_role('button',name='시작하기' if step==11 else '다음',exact=True);expect(primary).to_be_enabled();page.screenshot(path='work/intro-'+shot+'-390.png')
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   if step==4:
    page.reload();page.get_by_role('button',name='이어하기',exact=True).click();expect(page.locator('[data-intro-shot=child]')).to_be_visible();assert read(page)['story']['active']['step']==4;expect(page.get_by_role('button',name='소리 켜기',exact=True)).to_be_visible()
   if step<11:
    page.get_by_role('button',name='다음',exact=True).click();stored(page,step+1)
   else:page.get_by_role('button',name='시작하기',exact=True).click()
  expect(page.locator('.story-player')).to_have_count(0);page.wait_for_function('async()=>!(await ('+READ+')()).story.active');after=read(page)
  for key in ['cash','principal','seed','minute','weekActions','inventory','board','stats']:assert before[key]==after[key],key
  stable=json.dumps(after,sort_keys=True);assert page.evaluate('previewIntro()') is True;expect(page.locator('[data-intro-preview] [data-intro-shot=window]')).to_be_visible();page.get_by_role('button',name='스킵',exact=True).click();expect(page.locator('[data-intro-shot=exit]')).to_be_visible();page.get_by_role('button',name='시작하기',exact=True).click();expect(page.locator('[data-intro-preview]')).to_have_count(0);assert json.dumps(read(page),sort_keys=True)==stable
  assert page.evaluate("previewEvent('missing')") is True;expect(page.locator('[data-event-preview] .story-stage')).to_be_visible();page.keyboard.press('Escape');expect(page.locator('[data-event-preview]')).to_have_count(0);assert json.dumps(read(page),sort_keys=True)==stable
  assert not errors,errors;c.close();print(f'{w}x{h}: real new slot, 12 cameras/fixed stage, custom female avatar, opt-in audio/reset, reload at child, no economic changes, preview+skip isolation, old event preview, no overflow/errors PASS',flush=True)
 c=b.new_context(viewport={'width':390,'height':844},reduced_motion='reduce');page=c.new_page();start(page)
 assert page.locator('[data-intro-shot] > svg').evaluate('n=>getComputedStyle(n).animationName')=='none';page.get_by_role('button',name='스킵',exact=True).click();expect(page.locator('[data-intro-shot=exit]')).to_be_visible();page.get_by_role('button',name='시작하기',exact=True).click();expect(page.locator('.story-player')).to_have_count(0);c.close();b.close();print('Reduced-motion static frames and real skip to home PASS',flush=True)
