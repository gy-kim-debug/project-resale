"""Shared sprite rendering in character creation, story, info, action and reload."""
from datetime import datetime,timedelta,timezone
from playwright.sync_api import sync_playwright,expect
EXPECTED={'avatar':'female','clothing':'hoodie','hair':'ponytail','outfit':'cream','skin':'deep'}
def select(page,group,text):page.get_by_role('group',name=group,exact=True).locator('label').filter(has_text=text).click()
def traits(svg):
 for key,value in EXPECTED.items():expect(svg).to_have_attribute('data-'+key,value)
def nav(page,label):page.get_by_role('navigation',name='주요 메뉴').get_by_role('button',name=label,exact=True).click()
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for w,h in [(320,568),(390,844),(430,932),(1024,768)]:
  c=b.new_context(viewport={'width':w,'height':h},is_mobile=w<500,has_touch=w<500,reduced_motion='reduce');page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:4182');page.get_by_role('button',name='새로 시작',exact=True).click();page.get_by_label('닉네임',exact=True).fill('도트확인');svg=page.locator('.create-preview .pixel-character')
  for label,count in [('아바타',2),('헤어',5),('옷 종류',5),('옷 색상',6),('피부색',3)]:
   radios=page.get_by_role('group',name=label,exact=True).get_by_role('radio');expect(radios).to_have_count(count)
   for i in range(count):radios.nth(i).check();expect(svg).to_be_visible();expect(svg).to_have_attribute('viewBox','0 0 48 64');assert 'NaN' not in svg.inner_html()
  for group,text in [('아바타','여자'),('헤어','묶은 머리'),('옷 종류','후드'),('옷 색상','크림'),('피부색','짙은 톤')]:select(page,group,text)
  traits(svg);pixels=svg.inner_html();page.get_by_role('button',name='이 캐릭터로 시작',exact=True).click();page.get_by_role('button',name='스킵',exact=True).click();story=page.locator('.story-stage .pixel-character[data-avatar]');traits(story);assert story.inner_html()==pixels;page.get_by_role('button',name='시작하기',exact=True).click();expect(page.locator('.story-layer')).to_have_count(0)
  page.get_by_role('button',name='내 정보',exact=True).click();portrait=page.locator('.player-character-portrait .pixel-character');traits(portrait);assert portrait.inner_html()==pixels
  if w==390:page.screenshot(path='work/polished-character-info-390.png')
  page.get_by_role('button',name='닫기',exact=True).click();nav(page,'일상');page.clock.install();page.clock.pause_at(datetime.now(timezone.utc)+timedelta(seconds=1));page.locator('.daily-row').filter(has_text='아르바이트').click();page.locator('.confirmation-submit').click();actor=page.locator('.action-layer .scene-player .pixel-character');traits(actor);assert actor.inner_html()==pixels;page.clock.run_for(800);expect(page.locator('.action-layer')).to_have_count(0);page.clock.resume();page.reload();expect(page.get_by_role('heading',name='일상',exact=True)).to_be_visible();nav(page,'활동');page.get_by_role('button',name='내 정보',exact=True).click();traits(page.locator('.player-character-portrait .pixel-character'));assert page.locator('.player-character-portrait .pixel-character').inner_html()==pixels;assert page.evaluate('document.documentElement.scrollWidth<=innerWidth');assert not errors,errors
  print(f'{w}x{h}: all avatar/hair/clothing/color/skin options, 48x64 SD canvas, identical creation/story/info/action pixels, profile persistence+reload, no overflow/errors PASS',flush=True);c.close()
 b.close()
