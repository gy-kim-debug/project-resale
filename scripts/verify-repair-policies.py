"""Unsupported repair panels are omitted; supported repair still spends the quote once."""
import json,time,re,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
F=json.loads(Path('work/repair-policy-fixtures.json').read_text())
WRITE="""async d=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});await new Promise(r=>{const tx=db.transaction('saves','readwrite');tx.objectStore('saves').put(d,'slot:1');tx.oncomplete=r});db.close();sessionStorage.setItem('resale:resume',JSON.stringify({version:1,screen:'game',slot:1,tab:'보관함'}))}"""
READ="""async()=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});return await new Promise(r=>{const q=db.transaction('saves').objectStore('saves').get('slot:1');q.onsuccess=()=>{db.close();r(q.result.game)}})}"""
def read(page):return page.evaluate(READ)
def load(page,key):page.evaluate(WRITE,F[key]);page.reload();expect(page.get_by_role('heading',name=re.compile('^보관함 '))).to_be_visible();page.locator('.item-row').first.click()
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for w,h in [(320,568),(390,844),(430,932),(1024,768)]:
  c=b.new_context(viewport={'width':w,'height':h},reduced_motion='reduce');page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:(errors.append('Unexpected native dialog'),d.dismiss()));page.goto(os.getenv('SCREEN_BASE_URL','http://127.0.0.1:4182'));expect(page.get_by_role('button',name='새로 시작',exact=True)).to_be_visible()
  for key in ['blocked','allowed']:
   load(page,key);before=read(page);button=page.get_by_role('button',name='수리하기',exact=True);text=page.locator('.sheet-content').inner_text();assert all(s not in text for s in ['수리 가능합니다','수리 대상','수리 불가','성공률','성공 시'])
   if key=='blocked':
    expect(button).to_have_count(0);assert '비용 10,000 원' not in text;assert read(page)==before;page.reload();page.locator('.item-row').first.click();expect(button).to_have_count(0);assert read(page)==before
    if w==390:page.screenshot(path='work/repair-panel-omitted-390.png')
   else:
    expect(button).to_be_enabled();expect(button.locator('..')).to_contain_text('비용 10,000 원');button.click();expect(page.locator('.action-layer')).to_have_count(0)
    expect(page.locator('.grade-result strong')).to_have_text('A');expect(page.get_by_role('button',name='수리하기',exact=True)).to_have_count(0)
    deadline=time.monotonic()+8
    while time.monotonic()<deadline:
     after=read(page)
     if after['inventory'][0]['repaired']:break
     page.wait_for_timeout(25)
    assert after['cash']==before['cash']-10000 and after['weekActions']==before['weekActions'] and after['minute']==before['minute'];assert after['stats']['repairs']==before['stats']['repairs']+1 and after['marketExperience']['street']==4
    page.reload();expect(page.get_by_role('heading',name=re.compile('^보관함 '))).to_be_visible();page.locator('.item-row').first.click();expect(page.get_by_role('button',name='수리하기',exact=True)).to_have_count(0);expect(page.locator('.grade-result strong')).to_have_text('A')
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  assert not errors,errors;print(f'{w}x{h}: unsupported panel absent across reload with unchanged save, supported quote present, no extra labels/forecasts, allowed fee+grade+XP without action, reload retry guard, no overflow/errors PASS',flush=True);c.close()
 b.close()
