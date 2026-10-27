"""Production UI checks for probabilistic claims and post-purchase findings."""
import json
import os
import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
subprocess.run(['node','scripts/prepare-tag-fixtures.mjs'],check=True)
BASE=os.getenv('SCREEN_BASE_URL','http://127.0.0.1:4182')
READ="""async()=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});return await new Promise(r=>{const q=db.transaction('saves').objectStore('saves').get('current');q.onsuccess=()=>{db.close();r(q.result)}})}"""
WRITE="""async data=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});await new Promise(r=>{const tx=db.transaction('saves','readwrite');tx.objectStore('saves').put(data,'current');tx.oncomplete=r});db.close()}"""
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
 for width in [320,375,390,430]:
  ctx=browser.new_context(viewport={'width':width,'height':844},is_mobile=True,has_touch=True)
  page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(BASE);page.get_by_role('heading',name='활동',exact=True).wait_for()
  def load(name):
   data=json.loads(Path(f'work/tag-{name}.json').read_text())
   page.evaluate(WRITE,data);page.reload();page.get_by_role('heading',name='활동',exact=True).wait_for();return data
  def market():page.locator('.activity-grid').get_by_role('button',name='중고 장터',exact=True).click()
  def buy_and_check(expected):
   page.get_by_role('button',name='구매 내용 확인').click()
   page.get_by_role('button',name='지불·수령 확정',exact=True).click()
   expect(page.locator('.action-layer')).to_have_count(0)
   page.get_by_role('button',name='← 뒤로',exact=True).click()
   page.get_by_role('button',name='닫기',exact=True).click()
   page.get_by_role('navigation',name='주요 메뉴').get_by_role('button',name='보관함',exact=True).click()
   page.locator('.item-row').first.click()
   expect(page.locator('.item-findings')).to_have_count(0)
   page.get_by_role('button',name='가치 확인 ·',exact=False).click()
   expect(page.locator('.item-findings')).to_contain_text(expected)
   expect(page.locator('.action-layer')).to_have_count(0)
  data=load('false-limited');market()
  expect(page.locator('.item-row .item-tag')).to_have_count(3)
  expect(page.locator('.item-row .item-tags')).to_contain_text('#한정판')
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.screenshot(path=f'work/tag-market-{width}.png',full_page=True)
  page.locator('.item-row').first.click()
  expect(page.locator('.sheet-layer .item-tags')).to_contain_text('#한정판')
  expect(page.locator('.item-findings')).to_have_count(0)
  expect(page.get_by_text('일반판 · 한정판 아님',exact=True)).to_have_count(0)
  assert 'truthChance' not in page.locator('body').inner_text()
  buy_and_check('일반판 · 한정판 아님')
  saved=page.evaluate(READ);facts=saved['game']['inventory'][0]['listing']
  assert facts==data['game']['board'][0]['listing']
  assert saved['game']['minute']==data['game']['minute']+480
  assert saved['game']['inventory'][0]['acquiredFor']==data['game']['board'][0]['price']
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  page.screenshot(path=f'work/tag-finding-{width}.png',full_page=True)
  page.reload();page.get_by_role('heading',name='활동',exact=True).wait_for()
  page.get_by_role('navigation',name='주요 메뉴').get_by_role('button',name='보관함',exact=True).click();page.locator('.item-row').first.click()
  expect(page.locator('.item-findings')).to_contain_text('일반판 · 한정판 아님')
  assert page.evaluate(READ)['game']['inventory'][0]['listing']==facts
  page.get_by_role('button',name='설정',exact=True).click();page.get_by_role('button',name='저장·백업 관리',exact=True).click()
  with page.expect_download() as download:page.get_by_role('button',name='백업 파일 내보내기',exact=True).click()
  backup=json.loads(Path(download.value.path()).read_text());assert backup['game']['inventory'][0]['listing']==facts
  data=load('false-authentic');market();page.locator('.item-row').first.click()
  expect(page.locator('.item-tags')).to_contain_text('#정품주장')
  expect(page.locator('.item-findings')).to_have_count(0)
  buy_and_check('가품')
  data=load('true-limited');market();page.locator('.item-row').first.click();buy_and_check('한정판 확인')
  data=load('true-urgent');market();page.locator('.item-row').first.click()
  expect(page.locator('.item-tags')).to_contain_text('#급처')
  assert (data['game']['board'][0]['expires']-data['game']['minute'])//480==2
  # Older saves retain prices and progress, with a category-only fallback.
  legacy=json.loads(json.dumps(data));del legacy['game']['board'][0]['listing']
  page.evaluate(WRITE,legacy);page.reload();page.get_by_role('heading',name='활동',exact=True).wait_for();market()
  expect(page.locator('.item-tag')).to_have_count(1)
  assert page.evaluate(READ)['game']['board'][0]['price']==legacy['game']['board'][0]['price']
  assert not errors,errors
  print(json.dumps({'width':width,'claims_hidden_findings_reload_backup_legacy':'PASS'}),flush=True)
  ctx.close()
 browser.close()
