from playwright.sync_api import sync_playwright,expect
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in [320,375,390,430]:
  c=b.new_context(viewport={'width':width,'height':844},is_mobile=True,has_touch=True);page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto('http://127.0.0.1:4182');page.get_by_role('heading',name='활동',exact=True).wait_for()
  page.locator('.activity-grid').get_by_role('button',name='아르바이트',exact=True).click();button=page.get_by_role('button',name='일하기',exact=True).first;button.click();expect(page.locator('.action-layer')).to_have_count(0);expect(page.locator('.toast')).to_be_visible()
  assert page.locator('.toast').get_attribute('role')=='status';assert page.locator('.toast button').count()==0 and page.locator('.result').count()==0
  assert page.locator('.toast').evaluate('(e)=>getComputedStyle(e).pointerEvents')=='none'
  button.focus();page.clock.install();page.clock.fast_forward(3300);expect(page.locator('.toast')).to_have_count(0);expect(button).to_be_focused()
  page.get_by_role('button',name='닫기',exact=True).click();page.get_by_role('button',name='설정',exact=True).click();page.get_by_role('button',name='저장·백업 관리',exact=True).click()
  page.on('dialog',lambda d:d.accept());file=page.locator('input[type=file]');bad={'name':'invalid.json','mimeType':'application/json','buffer':b'invalid'};file.set_input_files(bad);expect(page.locator('.toast.error')).to_be_visible();page.clock.fast_forward(3000);file.set_input_files(bad);page.clock.fast_forward(1700);expect(page.locator('.toast.error')).to_be_visible();page.clock.fast_forward(2900);expect(page.locator('.toast')).to_have_count(0)
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth') and not errors,errors
  c.close();print(f'{width}px success/error auto-dismiss, repeated notice reset, sheet toast, focus/touch PASS',flush=True)
 b.close()
