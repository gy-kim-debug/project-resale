"""Old neighbor proposals disappear from live UI and persist safely; repair proposals remain."""
import json
from playwright.sync_api import sync_playwright, expect
READ="""async()=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});return await new Promise(r=>{const q=db.transaction('saves').objectStore('saves').get('current');q.onsuccess=()=>{db.close();r(q.result)}})}"""
WRITE="""async data=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});await new Promise(r=>{const tx=db.transaction('saves','readwrite');tx.objectStore('saves').put(data,'current');tx.oncomplete=r});db.close()}"""
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in [320,375,390,430]:
  ctx=b.new_context(viewport={'width':width,'height':844},is_mobile=True,has_touch=True);page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto('http://127.0.0.1:4182');page.get_by_role('heading',name='활동',exact=True).wait_for();page.wait_for_function('async()=>!!(await ('+READ+')())')
  original=page.evaluate(READ);old=json.loads(json.dumps(original));g=old['game'];g['serial']+=2;arrival=g['serial'];g['event']={'id':'legacy-neighbor','type':'deal','title':'이사 정리 일손 제안','text':'보상 15,000 원','expires':2880};g['logs'].insert(0,{'id':arrival,'minute':0,'week':1,'text':'이웃에게 시간 제한이 있는 제안이 왔습니다.'});old['readNotificationIds']=[arrival]
  page.evaluate(WRITE,old);page.reload();page.get_by_role('heading',name='활동',exact=True).wait_for()
  expect(page.get_by_role('button',name='이사 정리 일손 제안',exact=False)).to_have_count(0)
  expect(page.locator('.header-cash')).to_contain_text('500,000 원');expect(page.locator('.status-clock')).to_contain_text('20/20')
  page.get_by_role('button',name='우편함',exact=True).click();expect(page.locator('.mailbox')).not_to_contain_text('이웃에게')
  page.get_by_role('button',name='모두 읽음',exact=True).click()
  page.wait_for_function('async()=>{const s=await ('+READ+')();return s.game.event===null}')
  saved=page.evaluate(READ)['game']
  for field in ['cash','principal','minute','weekActions','seed','inventory']:assert saved[field]==g[field]
  page.reload();page.get_by_role('heading',name='활동',exact=True).wait_for();expect(page.get_by_role('button',name='이사 정리 일손 제안',exact=False)).to_have_count(0)
  repair=json.loads(json.dumps(original));repair['game']['event']={'id':'keep-repair','type':'repair','title':'수리 전문가의 연락','text':'정비 교육','expires':2880};repair['game']['eventStage']=1
  page.evaluate(WRITE,repair);page.reload();page.get_by_role('heading',name='활동',exact=True).wait_for();expect(page.get_by_role('button',name='수리 전문가의 연락',exact=False)).to_be_visible()
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth') and not errors,errors
  ctx.close();print(f'{width}px legacy proposal/arrival removed, unchanged money/time/assets, save/reload, repair retained PASS',flush=True)
 b.close()
