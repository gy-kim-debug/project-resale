"""Per-category appraisal/repair costs, meaningful condition labels and preserved counterfeit identity."""
import json, subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
subprocess.run(['node','scripts/prepare-item-profile-fixtures.mjs'],check=True)
READ="""async()=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});return await new Promise(r=>{const q=db.transaction('saves').objectStore('saves').get('current');q.onsuccess=()=>{db.close();r(q.result)}})}"""
WRITE="""async data=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});await new Promise(r=>{const tx=db.transaction('saves','readwrite');tx.objectStore('saves').put(data,'current');tx.oncomplete=r});db.close()}"""
labels={'생활':'고장','디지털':'고장','가구':'파손','수집품':'파손','악기':'연주 불가','자동차':'정비 필요','부동산':'큰 하자'}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in [320,375,390,430]:
  ctx=b.new_context(viewport={'width':width,'height':844},is_mobile=True,has_touch=True);page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto('http://127.0.0.1:4182');page.get_by_role('heading',name='활동',exact=True).wait_for()
  for case in json.loads(Path('work/item-profile-ui.json').read_text()):
   page.evaluate(WRITE,case['save']);page.reload();page.get_by_role('heading',name='활동',exact=True).wait_for()
   page.get_by_role('navigation',name='주요 메뉴').get_by_role('button',name='보관함',exact=True).click();page.locator('.item-row').first.click()
   expect(page.get_by_text('상태: '+labels[case['kind']],exact=True)).to_be_visible()
   check=page.get_by_role('button',name=f"가치 확인 · {case['checkFee']:,} 원",exact=True);expect(check.locator('.action-cost')).to_have_count(0);check.click();expect(page.locator('.action-layer')).to_have_count(0)
   saved=page.evaluate(READ)['game'];assert saved['cash']==500000-case['checkFee'] and saved['minute']==0 and saved['weekActions']==0 and saved['inventory'][0]['value']==case['value']
   expect(page.locator('.sheet-layer .details')).to_contain_text(case['defect'])
   dismiss=page.get_by_role('button',name='확인',exact=True)
   if dismiss.count():dismiss.click()
   expect(page.get_by_text(f"비용 {case['repairFee']:,} 원",exact=True)).to_be_visible()
   repair=page.get_by_role('button',name='수리하기',exact=True);expect(repair.locator('.action-cost')).to_have_count(0)
   repair.scroll_into_view_if_needed()
   if width==390 and case['kind']=='부동산':page.screenshot(path='work/item-profile-property-390.png',full_page=True)
   repair.click();expect(page.locator('.action-layer')).to_have_count(0);done=page.evaluate(READ)['game']
   assert done['cash']==500000-case['checkFee']-case['repairFee'] and done['minute']==0 and done['weekActions']==0 and done['inventory'][0]['value']==done['inventory'][0]['base'] and done['inventory'][0]['condition']=='양호'
   expect(page.locator('.sheet-layer .details')).to_contain_text(case['repairedDescription'])
   if case.get('fake'):expect(page.locator('.item-findings')).to_contain_text('가품');assert not done['inventory'][0]['listing']['facts']['authentic']
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  assert not errors,errors
  ctx.close();print(f'{width}px seven category fees/condition labels/repair, zero-action care, counterfeit preservation PASS',flush=True)
 b.close()
