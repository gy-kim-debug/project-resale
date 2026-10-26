"""Acquisition comparison and header utility browser QA against production build."""
import json
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
BASE=os.getenv('SCREEN_BASE_URL','http://127.0.0.1:4182')
WRITE="""async data=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});await new Promise(r=>{const tx=db.transaction('saves','readwrite');tx.objectStore('saves').put(data,'current');tx.oncomplete=r});db.close()}"""
def money(n):return f'{n:,} 원'
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
 results=[]
 for width in [320,375,390,430]:
  ctx=browser.new_context(viewport={'width':width,'height':844},is_mobile=True,has_touch=True)
  page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(BASE);page.get_by_role('heading',name='활동',exact=True).wait_for()
  data=json.loads(Path('work/inventory-comparison.json').read_text());g=data['game']
  page.evaluate(WRITE,data);page.reload();page.get_by_role('heading',name='활동',exact=True).wait_for()
  tools=page.locator('.header-tools')
  assert tools.get_by_role('button').count()==2
  for b in tools.get_by_role('button').all():
   box=b.bounding_box();assert box['width']>=44 and box['height']>=44
  tools.get_by_role('button',name='우편함',exact=True).click()
  expect(page.get_by_role('heading',name='우편함',exact=True)).to_be_visible()
  expect(page.locator('.sheet-layer .journal')).to_contain_text(g['logs'][0]['text'])
  assert page.locator('.action-layer').count()==0
  tools.get_by_role('button',name='설정',exact=True).click()
  expect(page.get_by_role('heading',name='설정',exact=True)).to_be_visible()
  page.get_by_role('button',name='저장·백업 관리',exact=True).click()
  expect(page.get_by_role('button',name='백업 파일 내보내기',exact=True)).to_be_visible()
  page.get_by_role('button',name='← 뒤로',exact=True).click()
  page.get_by_role('button',name='닫기',exact=True).click()
  page.locator('.activity-grid').get_by_role('button',name='아르바이트',exact=True).click()
  page.get_by_role('button',name='일하기 · 행동 1회',exact=True).first.click()
  expect(page.locator('.action-layer')).to_be_visible()
  assert tools.locator('button:disabled').count()==2
  expect(page.locator('.action-layer')).to_have_count(0)
  assert tools.locator('button:enabled').count()==2
  page.get_by_role('button',name='닫기',exact=True).click()
  page.evaluate(WRITE,data);page.reload();page.get_by_role('heading',name='활동',exact=True).wait_for()
  page.get_by_role('navigation',name='주요 메뉴').get_by_role('button',name='보관함',exact=True).click()
  comparisons=page.locator('main .item-comparison')
  assert comparisons.count()==3
  for idx,item in enumerate(g['inventory']):
   cost=item.get('acquiredFor',item['negotiatedPrice'] if item['negotiatedPrice'] is not None else item['price'])
   comp=comparisons.nth(idx)
   expect(comp.locator('[data-field=cost]')).to_have_text(money(cost))
   if item['checked']:
    value=(item['value']*(g['marketFactor']+(20 if item['kind']==g['trend'] else 0))+5000)//10000*100
    delta=value-cost
    expect(comp.locator('[data-field=value]')).to_have_text(money(value))
    expect(comp.locator('[data-field=difference]')).to_have_text(('+' if delta>0 else '−' if delta<0 else '')+money(abs(delta)))
   else:
    expect(comp.locator('[data-field=value]')).to_have_text('미확인')
    expect(comp.locator('[data-field=difference]')).to_have_text('미확인')
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.screenshot(path=f'work/inventory-comparison-{width}.png',full_page=True)
  page.locator('.item-row').first.click()
  expect(page.locator('.sheet-layer .item-comparison [data-field=cost]')).to_have_text(money(g['inventory'][0]['acquiredFor']))
  page.screenshot(path=f'work/inventory-detail-{width}.png',full_page=True)
  # Live appraisals reveal comparison values, while acquisition cost remains unchanged.
  page.get_by_role('button',name='닫기',exact=True).click()
  page.locator('.item-row').nth(1).click()
  before=g['inventory'][1]['acquiredFor']
  page.get_by_role('button',name='가치 확인 ·',exact=False).click()
  expect(page.locator('.action-layer')).to_have_count(0)
  expect(page.locator('.sheet-layer .item-comparison [data-field=value]')).not_to_have_text('미확인')
  expect(page.locator('.sheet-layer .item-comparison [data-field=cost]')).to_have_text(money(before))
  # Large integers fit both the header and compact comparison rows.
  large=json.loads(json.dumps(data));large['game']['cash']=10**15;large['game']['inventory'][0]['acquiredFor']=10**15
  page.evaluate(WRITE,large);page.reload();page.get_by_role('heading',name='활동',exact=True).wait_for()
  page.get_by_role('navigation',name='주요 메뉴').get_by_role('button',name='보관함',exact=True).click()
  expect(page.locator('main .item-comparison [data-field=cost]').first).to_have_text(money(10**15))
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.locator('.header-tools').get_by_role('button',name='우편함',exact=True).click()
  sheet=page.locator('.sheet-layer').bounding_box();head=page.locator('.status-header').bounding_box()
  assert abs(sheet['y']-head['height'])<2
  assert not errors,errors
  results.append({'width':width,'inventory_list_detail':'PASS','legacy_exact_cost':'PASS','appraisal_no_cost_overwrite':'PASS','header_mail_settings':'PASS','large_amounts':'PASS'})
  ctx.close()
 browser.close();print(json.dumps(results))
