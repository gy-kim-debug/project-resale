"""End-to-end authored variants, optional questions, reactions and immutable console previews."""
from playwright.sync_api import sync_playwright,expect
READ="""async()=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});const store=db.transaction('saves').objectStore('saves');const result=await Promise.all([new Promise(r=>{const q=store.getAllKeys();q.onsuccess=()=>r(q.result)}),new Promise(r=>{const q=store.getAll();q.onsuccess=()=>r(q.result)})]);db.close();return JSON.stringify(result)}"""
def skip(root):
 button=root.get_by_role('button',name='스킵',exact=True)
 if button.count():button.click()
def same_frame(root,frame):
 actual=root.locator('.story-stage').bounding_box()
 for key in ['x','y','width','height']:assert abs(actual[key]-frame[key])<.1,(actual,frame)
def finish(root):
 for n in range(5):
  if root.get_by_role('heading',name='이벤트 미리보기',exact=True).count():return
  skip(root)
  next=root.get_by_role('button',name='계속하기',exact=True)
  if next.count():next.click()
  else:raise AssertionError('Expected event reaction')
 raise AssertionError('Reaction never closed')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for w,h in [(390,844),(320,568),(568,320),(1024,768)]:
  context=b.new_context(viewport={'width':w,'height':h});page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:4182');page.get_by_role('button',name='새로 시작',exact=True).click();page.get_by_label('닉네임',exact=True).fill('사건테스트');page.get_by_role('button',name='이 캐릭터로 시작',exact=True).click();expect(page.get_by_role('heading',name='첫 정산까지',exact=True)).to_be_visible();before=page.evaluate(READ)
  assert page.evaluate('previewEvent()') is True;root=page.locator('[data-event-preview]');expect(root.get_by_role('heading',name='이벤트 미리보기',exact=True)).to_be_visible();names=root.locator('.story-choices button').all_text_contents();assert len(names)==18
  count=0
  for variant in (range(3) if w==390 else range(1)):
   root.get_by_role('button',name=f'상황 {variant+1}',exact=True).click()
   for title in names:
    root.get_by_role('button',name=title,exact=True).click();expect(root.get_by_role('dialog',name=title,exact=True)).to_be_visible();frame=root.locator('.story-stage').bounding_box();header=root.get_by_role('heading',name=title,exact=True).bounding_box();panel=root.locator('.story-player').bounding_box();assert abs(header['x']+header['width']/2-panel['x']-panel['width']/2)<1
    skip(root);same_frame(root,frame)
    question=root.locator('.story-choices button').filter(has_text='묻기').first
    if question.count():question.click();expect(root.locator('.story-next')).to_be_visible();skip(root);same_frame(root,frame)
    if title=='경쟁자의 제안':root.locator('.story-targets summary').click();expect(root.locator('.story-targets li')).to_have_count(2);same_frame(root,frame)
    if title=='수상한 선입금 요구':choice=root.get_by_role('button',name='신고하고 거래 종료',exact=True)
    elif title=='예약 문의':choice=root.get_by_role('button',name='잠시 예약해 두기',exact=True)
    elif title=='채권자의 방문':choice=root.get_by_role('button',name='대화 마치기',exact=True)
    else:choice=root.locator('.story-choices button:has(.story-action)').first
    expect(choice).to_be_enabled();choice.scroll_into_view_if_needed();same_frame(root,frame)
    if w==390 and variant==1 and title=='예약 문의':page.screenshot(path='work/deep-reservation-390.png')
    choice.click()
    if title!='채권자의 방문':expect(root.get_by_role('button',name='다음',exact=True)).to_be_visible();same_frame(root,frame)
    finish(root);assert page.evaluate(READ)==before;count+=1
  page.keyboard.press('Escape');expect(root).to_have_count(0);expect(page.get_by_role('heading',name='첫 정산까지',exact=True)).to_be_visible();assert page.evaluate(READ)==before
  assert page.evaluate("previewEvent('예약 문의',2)") is True;expect(root.get_by_role('heading',name='예약 문의',exact=True)).to_be_visible();page.keyboard.press('Escape');expect(root).to_have_count(0);assert page.evaluate(READ)==before
  page.reload();page.get_by_role('button',name='이어하기',exact=True).click();expect(page.locator('.story-line')).to_contain_text('작은 방');assert page.evaluate(READ)==before
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth') and not errors,errors
  print(f'{w}x{h}: {count} variants/questions/actual decisions/reactions, stable stage and headers, no real-save changes or errors PASS',flush=True);context.close()
 b.close()
