"""A real new slot receives one optional, readable tutorial; reading changes no game state."""
import time
from playwright.sync_api import sync_playwright,expect
READ="""async()=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});return await new Promise(r=>{const q=db.transaction('saves').objectStore('saves').get('slot:1');q.onsuccess=()=>{db.close();r(q.result)}})}"""
def read(page):return page.evaluate(READ)
def wait_saved(page,condition):
 deadline=time.monotonic()+5
 while time.monotonic()<deadline:
  data=read(page)
  if condition(data):return data
  page.wait_for_timeout(20)
 raise AssertionError('Save did not finish')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for w,h in [(320,568),(390,844),(430,932),(1024,768)]:
  c=b.new_context(viewport={'width':w,'height':h},reduced_motion='reduce');page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:4182');page.get_by_role('button',name='새로 시작',exact=True).click();page.get_by_label('닉네임',exact=True).fill('새출발');page.get_by_role('button',name='이 캐릭터로 시작',exact=True).click();page.get_by_role('button',name='스킵',exact=True).click();page.get_by_role('button',name='시작하기',exact=True).click();expect(page.locator('.story-player')).to_have_count(0)
  before=wait_saved(page,lambda d:d['game']['story']['active'] is None);assert len([l for l in before['game']['logs'] if l.get('letter')=='getting-started'])==1
  page.get_by_role('button',name='우편함',exact=True).click();expect(page.locator('.welcome-mail')).to_have_count(1);expect(page.locator('.welcome-mail summary')).to_contain_text('안 읽음');expect(page.locator('.welcome-letter')).not_to_be_visible();page.locator('.welcome-mail summary').click();expect(page.locator('.welcome-letter')).to_be_visible();expect(page.locator('.welcome-mail summary')).to_contain_text('읽음');expect(page.locator('.welcome-mail summary')).not_to_contain_text('안 읽음')
  letter=page.get_by_role('article',name='첫 거래를 시작하는 당신에게');expect(letter.locator('h3')).to_have_count(6);expect(letter).to_contain_text('행동은 20회');expect(letter).to_contain_text('60%');expect(letter).to_contain_text('납부하지 못하면 게임이 끝납니다')
  after=wait_saved(page,lambda d:len(d.get('readNotificationIds',[]))==1);assert before['game']==after['game'],(before['game']['story'],after['game']['story']);assert len(after['readNotificationIds'])==1
  if w==390:page.screenshot(path='work/welcome-mail-390.png')
  letter.locator('h3').last.scroll_into_view_if_needed();expect(letter.locator('h3').last).to_be_visible();assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.locator('.welcome-mail summary').click();expect(letter).not_to_be_visible();page.locator('.welcome-mail summary').click();expect(letter).to_be_visible();assert read(page)['game']==before['game']
  page.reload();page.get_by_role('button',name='이어하기',exact=True).click();page.get_by_role('button',name='우편함',exact=True).click();expect(page.locator('.welcome-mail')).to_have_count(1);expect(page.locator('.mail-read .welcome-mail')).to_have_count(1);expect(page.get_by_role('button',name='모두 읽음',exact=True)).to_be_disabled();assert read(page)['game']==before['game'];assert not errors,errors
  c.close();print(f'{w}x{h}: one new-slot tutorial, optional expansion, six readable sections, read/unread persistence, repeat open/reload no duplicate or game mutation, no overflow/errors PASS',flush=True)
 b.close()
