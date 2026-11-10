"""Game buttons own layer navigation; browser history stays untouched."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
FIXTURE=json.loads(Path('work/chat-fixtures.json').read_text())['basic']
WRITE="""async d=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});await new Promise(r=>{const tx=db.transaction('saves','readwrite');tx.objectStore('saves').put(d,'slot:1');tx.oncomplete=r});db.close();sessionStorage.setItem('resale:resume',JSON.stringify({version:1,screen:'game',slot:1,tab:'활동'}))}"""
READ="""async()=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});return await new Promise(r=>{const q=db.transaction('saves').objectStore('saves').get('slot:1');q.onsuccess=()=>{db.close();r(q.result.game)}})}"""
SPY="""window.navigationCalls=[];for(const k of ['pushState','replaceState','back','forward','go']){const original=history[k].bind(history);history[k]=(...args)=>{navigationCalls.push(k);return original(...args)}};const originalAdd=window.addEventListener.bind(window);window.addEventListener=(type,...args)=>{if(type==='popstate')navigationCalls.push('listen:popstate');return originalAdd(type,...args)};"""
def nav(page,label):page.get_by_role('navigation',name='주요 메뉴').get_by_role('button',name=label,exact=True).click()
def restored(page):expect(page.locator('.sheet-layer')).to_have_count(0);expect(page.locator('.status-header')).to_be_visible()
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for w,h in [(320,568),(390,844),(430,932),(1024,768)]:
  c=b.new_context(viewport={'width':w,'height':h},reduced_motion='reduce');c.add_init_script(SPY);page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto('about:blank#before-game');page.goto('http://127.0.0.1:4182');expect(page.get_by_role('button',name='새로 시작',exact=True)).to_be_visible();page.evaluate(WRITE,FIXTURE);page.reload();expect(page.get_by_role('heading',name='활동',exact=True)).to_be_visible();length=page.evaluate('history.length');before=page.evaluate(READ)
  for label in ['보관함','일상','채무','채팅','활동']:nav(page,label)
  for repeat in range(3):
   page.get_by_role('button',name='내 정보',exact=True).click();page.get_by_role('button',name='닫기',exact=True).click();restored(page)
  page.get_by_role('button',name='설정',exact=True).click();page.get_by_role('button',name='저장·백업 관리',exact=True).click();expect(page.locator('#sheet-title')).to_have_text('저장 관리');page.get_by_role('button',name='← 뒤로',exact=True).click();expect(page.locator('#sheet-title')).to_have_text('설정');page.keyboard.press('Escape');restored(page)
  page.get_by_role('button',name='중고 장터',exact=True).click();results=page.locator('.market-results');results.evaluate('(n)=>n.scrollTop=n.scrollHeight');page.wait_for_timeout(60);saved=results.evaluate('(n)=>n.scrollTop');page.locator('.item-row').last.click();page.get_by_role('button',name='← 뒤로',exact=True).click();expect(page.locator('#sheet-title')).to_have_text('중고 장터');assert abs(results.evaluate('(n)=>n.scrollTop')-saved)<2;page.get_by_role('button',name='활동으로 이동',exact=True).click();restored(page)
  page.get_by_role('button',name='우편함',exact=True).click();page.get_by_role('button',name='닫기',exact=True).click();restored(page);assert page.evaluate(READ)==before
  nav(page,'일상');page.reload();expect(page.get_by_role('heading',name='일상',exact=True)).to_be_visible();assert page.evaluate('history.length')==length;assert page.evaluate('navigationCalls')==[]
  page.go_back();expect(page).to_have_url('about:blank#before-game');page.go_forward();expect(page.get_by_role('heading',name='일상',exact=True)).to_be_visible();assert not errors,errors;assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  print(f'{w}x{h}: tabs/root close/nested back/Escape/home/list scroll restore, zero History API or popstate calls, stable history length, unchanged game, reload tab, browser back leaves and forward resumes PASS',flush=True);c.close()
 b.close()
