"""Expanded markets/categories/cases and legacy saves in real mobile UI."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
BASE=os.getenv('SCREEN_BASE_URL','http://127.0.0.1:4182')
DATA=json.loads(Path('work/content-fixtures.json').read_text());LEGACY=json.loads(Path('tests/fixtures/legacy-catalog-v2.json').read_text())
WRITE="""async data=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});await new Promise(r=>{const tx=db.transaction('saves','readwrite');tx.objectStore('saves').put(data,'current');tx.oncomplete=r});db.close()}"""
READ="""async()=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});return await new Promise(r=>{const q=db.transaction('saves').objectStore('saves').get('current');q.onsuccess=()=>{db.close();r(q.result)}})}"""
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
 for width in [320,375,390,430]:
  c=b.new_context(viewport={'width':width,'height':844},is_mobile=True,has_touch=True);page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(BASE);page.get_by_role('heading',name='활동',exact=True).wait_for();page.evaluate(WRITE,DATA['save']);page.reload();page.get_by_role('heading',name='활동',exact=True).wait_for();expect(page.locator('.tier-label')).to_have_count(0)
  for market in DATA['markets']:
   page.locator('.activity-grid').get_by_role('button',name=market['name'],exact=True).click();rows=page.locator('.sheet-layer .item-row');expect(rows).to_have_count(12);expect(rows.locator('svg')).to_have_count(12)
   categories=list(dict.fromkeys(p['category'] for p in market['products']))
   for category in categories:
    label=DATA['categories'][category]['label'];page.locator('.filters').get_by_role('button',name=label,exact=True).click();expected=[i for i in DATA['save']['game']['board'] if i.get('marketId')==market['id'] and i['price']>0 and i['category']==category];expect(rows).to_have_count(len(expected))
    if expected:
     rows.first.click();item=expected[0];expect(page.get_by_role('heading',name=item['title'],exact=True)).to_be_visible();expect(page.locator('.item-findings')).to_have_count(0)
     if item['caseId']!='normal':expect(page.locator('.case-tag')).to_contain_text(DATA['cases'][item['caseId']]['label'])
     expect(page.locator('.sheet-layer')).to_contain_text(DATA['cases'][item['caseId']]['description'])
     assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
     if width==390 and market['id']=='instruments' and category=='keys':page.screenshot(path='work/expanded-piano-390.png')
     page.get_by_role('button',name='← 뒤로',exact=True).click();expect(page.locator('.filters').get_by_role('button',name=label,exact=True)).to_have_attribute('aria-pressed','true')
   page.locator('.filters').get_by_role('button',name='전체',exact=True).click();expect(rows).to_have_count(12)
   if width==390 and market['id'] in ['street','computers']:page.screenshot(path=f"work/expanded-{market['id']}-390.png")
   page.get_by_role('button',name='닫기',exact=True).click()
  assert page.evaluate(READ)['game']==DATA['save']['game'],'viewing/filtering must remain free'
  nav=page.get_by_role('navigation',name='주요 메뉴');nav.get_by_role('button',name='보관함',exact=True).click();page.get_by_role('button',name='아이템 도감',exact=True).click();expect(page.locator('.codex-locked')).to_have_count(240);page.get_by_role('button',name='닫기',exact=True).click()
  page.evaluate(WRITE,LEGACY);page.reload();page.get_by_role('heading',name='활동',exact=True).wait_for();nav.get_by_role('button',name='보관함',exact=True).click();expect(page.locator('.item-row')).to_have_count(1);page.locator('.item-row').first.click();expect(page.get_by_role('heading',name=LEGACY['game']['inventory'][0]['title'],exact=True)).to_be_visible();expect(page.locator('.case-tag')).to_have_count(0)
  page.get_by_role('button',name='활동으로 이동',exact=True).click();page.locator('.activity-grid').get_by_role('button',name='전자상가',exact=True).click();page.get_by_role('button',name='새 매물 탐색',exact=True).click();expect(page.locator('.action-layer')).to_have_count(0);expect(page.locator('.sheet-layer .item-row')).to_have_count(12)
  saved=page.evaluate(READ);assert saved['game']['cash']==LEGACY['game']['cash'] and saved['game']['inventory']==LEGACY['game']['inventory'] and saved['game']['discoveredItems']==LEGACY['game']['discoveredItems'];page.reload();page.get_by_role('heading',name='활동',exact=True).wait_for();assert page.evaluate(READ)['game']==saved['game']
  assert not errors,errors
  c.close();print(f'{width}px 6 markets/12 items, 36 category filters, public case tags/descriptions, hidden findings, dot art, 240-entry codex, legacy refresh/reload preservation PASS',flush=True)
 b.close()
