from playwright.sync_api import sync_playwright,expect
READ="""async()=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});const store=db.transaction('saves').objectStore('saves');const result=await Promise.all([new Promise(r=>{const q=store.getAllKeys();q.onsuccess=()=>r(q.result)}),new Promise(r=>{const q=store.getAll();q.onsuccess=()=>r(q.result)})]);db.close();return JSON.stringify(result)}"""
TITLES=['빠진 구성품','현장 재흥정','단골의 부탁','이름표 확인','추억이 담긴 물건','경쟁자의 제안','묶음 정리','채권자의 방문']
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width,height in [(320,568),(390,844),(568,320),(1024,768)]:
  context=b.new_context(viewport={'width':width,'height':height});page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:4182');expect(page.get_by_role('button',name='새로 시작',exact=True)).to_be_visible();before=page.evaluate(READ)
  assert page.evaluate('previewEvent()') is True;overlay=page.locator('[data-event-preview]');expect(overlay.get_by_role('heading',name='이벤트 미리보기',exact=True)).to_be_visible();assert page.evaluate('previewEnding()') is False;assert page.evaluate("previewEvent('bundle')") is False
  for title in TITLES:
   overlay.get_by_role('button',name=title,exact=True).click();expect(overlay.get_by_role('dialog',name=title,exact=True)).to_be_visible()
   frame=overlay.locator('.story-stage').bounding_box();heading=overlay.get_by_role('heading',name=title,exact=True).bounding_box();panel=overlay.locator('.story-player').bounding_box();skip=overlay.get_by_role('button',name='스킵',exact=True).bounding_box();assert abs(heading['x']+heading['width']/2-panel['x']-panel['width']/2)<1;assert skip['x']>heading['x']+heading['width']/2;expect(overlay.locator('.story-toolbar').get_by_role('button',name='닫기',exact=True)).to_have_count(0)
   overlay.get_by_role('button',name='다음',exact=True).click()
   if overlay.get_by_role('button',name='스킵',exact=True).count():overlay.get_by_role('button',name='스킵',exact=True).click()
   expect(overlay.locator('.story-choices button').first).to_be_visible();assert overlay.locator('.story-stage').bounding_box()==frame

   if title=='이름표 확인':overlay.get_by_role('button',name='모델 설명 더 듣기',exact=True).click();expect(overlay.get_by_role('button',name='모델 설명 더 듣기',exact=True)).to_have_count(0)
   for button in overlay.locator('.story-choices button').all():assert button.bounding_box()['height']>=44
   if title=='경쟁자의 제안':overlay.locator('.story-targets summary').click();expect(overlay.locator('.story-targets li')).to_have_count(2)
   assert overlay.locator('.story-stage').bounding_box()==frame
   if title=='묶음 정리' and width==390:page.screenshot(path='work/event-preview-bundle-390.png')
   overlay.locator('.story-choices button').first.click();expect(overlay.get_by_role('heading',name='이벤트 미리보기',exact=True)).to_be_visible();assert page.evaluate(READ)==before
  page.keyboard.press('Escape');expect(overlay).to_have_count(0);assert page.evaluate('document.body.style.overflow')=='';assert not page.locator('#root').evaluate('n=>n.inert')
  # Preserve a real, pending intro and its save while exercising direct names and both consoles.
  page.get_by_role('button',name='새로 시작',exact=True).click();page.get_by_label('닉네임',exact=True).fill('이벤트확인');page.get_by_role('button',name='이 캐릭터로 시작',exact=True).click();expect(page.get_by_role('heading',name='첫 정산까지',exact=True)).to_be_visible();before=page.evaluate(READ)
  for command in ["previewEvent('bundle')","previewEvent('묶음 정리')","previewEvent('model')"]:
   assert page.evaluate(command) is True;expect(overlay.locator('.story-line')).to_be_visible();page.keyboard.press('Escape');expect(overlay).to_have_count(0);assert page.evaluate(READ)==before;expect(page.get_by_role('heading',name='첫 정산까지',exact=True)).to_be_visible()
  assert page.evaluate("(()=>{try{previewEvent('unknown');return false}catch{return true}})()") is True;expect(overlay).to_have_count(0)
  assert page.evaluate('previewEnding()') is True;ending=page.locator('[data-ending-preview]');expect(ending.get_by_role('heading',name='남은 채무 0원',exact=True)).to_be_visible();assert page.evaluate('previewEvent()') is False;page.keyboard.press('Escape');expect(ending).to_have_count(0);assert page.evaluate(READ)==before
  page.reload();page.get_by_role('button',name='이어하기',exact=True).click();expect(page.locator('.story-line')).to_contain_text('작은 방');assert page.evaluate(READ)==before
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth') and not errors,errors
  print(f'{width}x{height}: centered title/right skip/no close, fixed scene through dialogue/choices/details, 8 events and save safety PASS',flush=True);context.close()
 b.close()
