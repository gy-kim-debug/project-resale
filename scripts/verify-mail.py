"""Read/unread mailbox QA against the production preview on port 4182."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
BASE = os.getenv('SCREEN_BASE_URL', 'http://127.0.0.1:4182')
READ = """async()=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});return await new Promise(r=>{const q=db.transaction('saves').objectStore('saves').get('current');q.onsuccess=()=>{db.close();r(q.result)}})}"""
WRITE = """async data=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});await new Promise(r=>{const tx=db.transaction('saves','readwrite');tx.objectStore('saves').put(data,'current');tx.oncomplete=r});db.close()}"""
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
 for width in [320,375,390,430]:
  ctx=browser.new_context(viewport={'width':width,'height':844},is_mobile=True,has_touch=True)
  page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(BASE);page.get_by_role('heading',name='활동',exact=True).wait_for()
  data=page.evaluate(READ)
  data['game']['logs']=[{'id':10000+i,'minute':0,'text':f'거래 알림 {i}'} for i in range(3)]
  data.pop('readNotificationIds',None)
  page.evaluate(WRITE,data);page.reload();page.get_by_role('heading',name='활동',exact=True).wait_for()
  expect(page.locator('.mail-badge')).to_have_text('3')
  page.get_by_role('button',name='우편함',exact=True).click()
  expect(page.locator('.mail-unread')).to_have_count(3)
  expect(page.locator('.mail-badge')).to_have_text('3')
  before=page.evaluate(READ)['game']
  page.locator('.mail-entry').first.click()
  expect(page.locator('.mail-read')).to_have_count(1)
  expect(page.locator('.mail-read .mail-state')).to_have_text('읽음')
  expect(page.locator('.mail-unread')).to_have_count(2)
  expect(page.locator('.mail-badge')).to_have_text('2')
  expect(page.locator('.action-layer')).to_have_count(0)
  page.wait_for_function("""async()=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});return await new Promise(r=>{const q=db.transaction('saves').objectStore('saves').get('current');q.onsuccess=()=>{db.close();r(q.result.readNotificationIds?.length===1)}})}""")
  assert page.evaluate(READ)['game']==before
  page.reload();page.get_by_role('heading',name='활동',exact=True).wait_for()
  expect(page.locator('.mail-badge')).to_have_text('2')
  page.get_by_role('button',name='우편함',exact=True).click()
  expect(page.locator('.mail-read')).to_have_count(1)
  page.get_by_role('button',name='모두 읽음',exact=True).click()
  expect(page.locator('.mail-read')).to_have_count(3)
  expect(page.locator('.mail-badge')).to_have_count(0)
  expect(page.get_by_role('button',name='모두 읽음',exact=True)).to_be_disabled()
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.screenshot(path=f'work/mail-read-{width}.png',full_page=True)
  page.get_by_role('button',name='닫기',exact=True).click()
  page.locator('.activity-grid').get_by_role('button',name='아르바이트',exact=True).click()
  page.get_by_role('button',name='일하기',exact=True).first.click()
  expect(page.locator('.action-layer')).to_have_count(0)
  next_save=page.evaluate(READ)
  unread=sum(log['id'] not in next_save['readNotificationIds'] for log in next_save['game']['logs'][:20])
  assert unread>=1
  expect(page.locator('.mail-badge')).to_have_text(str(unread))
  page.get_by_role('button',name='우편함',exact=True).click()
  expect(page.locator('.mail-unread')).to_have_count(unread)
  expect(page.locator('.mail-read')).to_have_count(3)
  page.get_by_role('button',name='설정',exact=True).click()
  page.get_by_role('button',name='저장·백업 관리',exact=True).click()
  with page.expect_download() as download:
   page.get_by_role('button',name='백업 파일 내보내기',exact=True).click()
  backup=json.loads(Path(download.value.path()).read_text())
  assert len(backup['readNotificationIds'])==3
  assert not errors,errors
  print(json.dumps({'width':width,'read_unread_reload_backup_new_mail':'passed'}))
  ctx.close()
 browser.close()
