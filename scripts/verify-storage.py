import json
from playwright.sync_api import sync_playwright,expect
from pathlib import Path
WRITE="""async data=>{const db=await new Promise((r,j)=>{const q=indexedDB.open('resale-game',2);q.onupgradeneeded=()=>q.result.createObjectStore('saves');q.onsuccess=()=>r(q.result);q.onerror=()=>j(q.error);});await new Promise(r=>{const tx=db.transaction('saves','readwrite');tx.objectStore('saves').put(data,'current');tx.oncomplete=r;});db.close();}"""
READ="""async key=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result);});return await new Promise(r=>{const q=db.transaction('saves').objectStore('saves').get(key);q.onsuccess=()=>{db.close();r(q.result);};});}"""
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 ctx=browser.new_context();page=ctx.new_page();page.goto('http://127.0.0.1:4182');page.get_by_role('heading',name='활동',exact=True).wait_for()
 bad={'version':2,'game':{'cash':'corrupt'},'favoriteIds':[]};page.evaluate(WRITE,bad);page.reload();expect(page.get_by_role('alert')).to_contain_text('자동 저장을 멈췄습니다')
 assert page.evaluate(READ,'current')==bad
 page.get_by_role('button',name='백업·저장 관리 열기',exact=True).click();expect(page.get_by_role('button',name='백업 파일 내보내기')).to_be_visible()
 # A validated import recovers from corrupt save without losing the original first.
 page.once('dialog',lambda d:d.accept());page.locator('input[type=file]').set_input_files('work/rich.json');expect(page.get_by_role('status')).to_contain_text('백업을 불러왔습니다')
 page.get_by_role('button',name='닫기',exact=True).click();page.reload();expect(page.locator('.status-top')).to_contain_text('500,000 원')
 ctx.close()
 # Legacy favorites-only data backed up before playable state creation.
 ctx=browser.new_context();page=ctx.new_page();page.goto('http://127.0.0.1:4182');page.get_by_role('heading',name='활동',exact=True).wait_for()
 legacy={'version':1,'favoriteIds':['radio']};page.evaluate(WRITE,legacy);page.reload();expect(page.get_by_role('heading',name='활동',exact=True)).to_be_visible();assert page.evaluate(READ,'legacy-v1')==legacy
 ctx.close()
 # Blocked IndexedDB and localStorage must not crash first render.
 ctx=browser.new_context();ctx.add_init_script("Object.defineProperty(window,'indexedDB',{get(){throw new Error('blocked')}});Object.defineProperty(window,'localStorage',{get(){throw new Error('blocked')}});")
 page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:4182');expect(page.get_by_role('alert')).to_contain_text('저장 데이터를 불러오지 못했습니다');page.get_by_role('button',name='백업·저장 관리 열기',exact=True).click();expect(page.get_by_role('button',name='백업 파일 내보내기')).to_be_visible();assert not errors,errors
 ctx.close();browser.close();print(json.dumps({'corrupt_preserved':True,'valid_import_recovers':True,'legacy_backup':True,'blocked_storage_no_crash':True}))
