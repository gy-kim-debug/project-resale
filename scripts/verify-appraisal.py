"""Persistent, non-blocking appraisal results; actual price, market price and cost remain distinct."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
DATA=json.loads(Path('work/appraisal-fixtures.json').read_text())
READ="""async()=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});return await new Promise(r=>{const q=db.transaction('saves').objectStore('saves').get('slot:1');q.onsuccess=()=>{db.close();r(q.result.game)}})}"""
WRITE="""async data=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});await new Promise(r=>{const tx=db.transaction('saves','readwrite');tx.objectStore('saves').put(data,'slot:1');tx.oncomplete=r});db.close()}"""
def load(page,key):
 page.evaluate(WRITE,DATA[key]);page.reload();page.get_by_role('button',name='이어하기',exact=True).click();page.get_by_role('navigation',name='주요 메뉴').get_by_role('button',name='보관함',exact=True).click();page.locator('.item-row').first.click()
def read(page):return page.evaluate(READ)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for w,h in [(320,568),(390,844),(430,932),(1024,768)]:
  c=b.new_context(viewport={'width':w,'height':h});page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:4182');expect(page.get_by_role('button',name='새로 시작',exact=True)).to_be_visible()
  for kind,amount,delta,tone in [('gain','30,000 원','+20,000 원','gain'),('loss','4,000 원','−6,000 원','loss'),('zero','0 원','0 원','even')]:
   load(page,kind);expect(page.locator('.appraisal-result')).to_have_count(0);before=read(page);page.get_by_role('button',name='가치 확인 ·',exact=False).click();expect(page.locator('.action-layer')).to_have_count(0);card=page.get_by_role('region',name='가치 확인 결과',exact=True);expect(card).to_be_visible();expect(card.locator('[data-appraisal=value]')).to_have_text(amount);expect(card.locator('[data-appraisal=difference]')).to_have_text(delta);assert card.evaluate('(n,t)=>n.classList.contains("appraisal-"+t)',tone);page.wait_for_function('document.activeElement?.classList.contains("appraisal-result")');after=read(page);fee=before['cash']-after['cash'];expect(card.locator('[data-appraisal=fee]')).to_have_text(f'{fee:,} 원');assert after['weekActions']==before['weekActions'] and after['minute']==before['minute'] and after['stats']['checks']==before['stats']['checks']+1
   assert card.locator('[data-appraisal=value]').evaluate('n=>parseFloat(getComputedStyle(n).fontSize)')>=25
   if kind=='loss':expect(card.locator('.appraisal-findings')).to_contain_text('가품');expect(card.locator('.appraisal-defect')).to_contain_text('작동하지')
   if kind=='gain' and w==390:page.screenshot(path='work/appraisal-result-390.png')
   # User proceeds directly, without an acknowledgement overlay or close button.
   page.get_by_role('button',name='중고 장터에 판매 등록',exact=True).click();expect(page.get_by_role('button',name='판매 글 등록 확정',exact=True)).to_be_visible();assert read(page)['cash']==after['cash']
   page.reload();page.get_by_role('button',name='이어하기',exact=True).click();page.get_by_role('navigation',name='주요 메뉴').get_by_role('button',name='보관함',exact=True).click();page.locator('.item-row').first.click();expect(page.locator('[data-appraisal=value]')).to_have_text(amount);expect(page.locator('[data-appraisal=fee]')).to_have_count(0);assert read(page)['stats']['checks']==after['stats']['checks'] and read(page)['cash']==after['cash']
  load(page,'large');card=page.locator('.appraisal-result');expect(card.locator('[data-appraisal=value]')).to_have_text('900,000,000,000,000 원');assert page.evaluate('document.documentElement.scrollWidth<=innerWidth') and not errors,errors
  c.close();print(f'{w}x{h}: gain/loss/zero/large, prominent value+cost+condition, paid fee/no actions, focus/scroll, no confirmation, reload without recharge PASS',flush=True)
 c=b.new_context(viewport={'width':390,'height':844},reduced_motion='reduce');page=c.new_page();page.goto('http://127.0.0.1:4182');expect(page.get_by_role('button',name='새로 시작',exact=True)).to_be_visible();load(page,'gain');page.get_by_role('button',name='가치 확인 ·',exact=False).click();expect(page.locator('.action-layer')).to_have_count(0);expect(page.locator('.appraisal-result')).to_be_visible();assert page.locator('.appraisal-result').evaluate('n=>getComputedStyle(n).animationName')=='none';c.close();b.close();print('Reduced motion static result PASS',flush=True)
