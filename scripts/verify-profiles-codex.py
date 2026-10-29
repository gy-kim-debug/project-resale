"""Profile/codex integration QA; prepare fixture via node scripts/prepare-profiles-codex.mjs."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
BASE=os.getenv('SCREEN_BASE_URL','http://127.0.0.1:4182')
DATA=json.loads(Path('work/profile-fixtures.json').read_text())
WRITE="""async data=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});await new Promise(r=>{const tx=db.transaction('saves','readwrite');tx.objectStore('saves').put(data,'slot:1');tx.oncomplete=r});db.close()}"""
READ="""async()=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});return await new Promise(r=>{const q=db.transaction('saves').objectStore('saves').get('slot:1');q.onsuccess=()=>{db.close();r(q.result)}})}"""
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
 for width in [320,375,390,430]:
  c=b.new_context(viewport={'width':width,'height':844},is_mobile=True,has_touch=True);page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(BASE);page.get_by_role('heading',name='시작하기',exact=True).wait_for();page.evaluate(WRITE,DATA['initial']);page.reload();page.get_by_role('button',name='이어하기',exact=True).click();page.get_by_role('heading',name='활동',exact=True).wait_for()
  nav=page.get_by_role('navigation',name='주요 메뉴');nav.get_by_role('button',name='내 정보',exact=True).click();expect(page.get_by_role('button',name='아이템 도감',exact=True)).to_have_count(0);nav.get_by_role('button',name='보관함',exact=True).click();page.get_by_role('button',name='아이템 도감',exact=True).click()
  expect(page.locator('.codex-locked')).to_have_count(DATA['codexSize']);expect(page.locator('.codex-toggle')).to_have_count(0);expect(page.locator('.sheet-layer')).not_to_contain_text(DATA['flex']['title']);page.get_by_role('button',name='닫기',exact=True).click()
  nav.get_by_role('button',name='활동',exact=True).click();page.locator('.activity-grid').get_by_role('button',name='중고 장터',exact=True).click()
  rows=[i for i in DATA['initial']['game']['board'] if i.get('marketId','street')=='street' and i['price']>0]
  for key in ['firm','flex']:
   item=DATA[key];index=next(n for n,i in enumerate(rows) if i['id']==item['id']);page.locator('.sheet-layer .item-row').nth(index).click();profile=page.get_by_role('region',name='판매자 프로필');expect(profile).to_contain_text(item['seller']);expect(profile).to_contain_text('@'+item['traderId']);expect(profile).to_contain_text('세');expect(profile).to_contain_text('가격 고정' if key=='firm' else '유연한 흥정')
   expect(page.locator('.item-findings')).to_have_count(0);page.get_by_role('button',name='판매자와 채팅',exact=True).click();page.get_by_role('button',name='가격 제안',exact=False).first.click();offers=page.locator('.offer-options button')
   if key=='firm':expect(offers).to_have_count(0);page.get_by_role('button',name='← 뒤로',exact=True).click()
   else:
    expect(offers).to_have_count(2);offers.last.click();expect(page.locator('.status-top')).to_contain_text('남은 행동 20/20')
    if width==390:
     page.locator('.sheet-content').evaluate('(e)=>e.scrollTop=0');page.screenshot(path='work/trader-profile-390.png',full_page=True)
    page.get_by_role('button',name='구매 내용 확인',exact=False).click();page.get_by_role('button',name='지불·수령 확정',exact=True).click();expect(page.locator('.action-layer')).to_have_count(0)
  saved=page.evaluate(READ);assert saved['game']['weekActions']==1 and saved['game']['discoveredItems']==[DATA['key']] and not saved['game']['inventory'][0]['checked']
  page.reload();page.get_by_role('button',name='이어하기',exact=True).click();page.get_by_role('heading',name='활동',exact=True).wait_for();nav.get_by_role('button',name='내 정보',exact=True).click();expect(page.get_by_role('button',name='아이템 도감',exact=True)).to_have_count(0);nav.get_by_role('button',name='보관함',exact=True).click();page.get_by_role('button',name='아이템 도감',exact=True).click();expect(page.locator('.codex-toggle')).to_have_count(1);expect(page.locator('.codex-locked')).to_have_count(DATA['codexSize']-1)
  page.get_by_role('button',name=DATA['flex']['kind'],exact=True).click();page.locator('.codex-toggle').click();expect(page.locator('.codex-detail')).to_contain_text('참고 시세');expect(page.locator('.codex-detail')).to_contain_text('시장 동향');expect(page.locator('.codex-detail ul li').first).to_be_visible()
  if width==390:page.screenshot(path='work/item-codex-390.png',full_page=True)
  page.get_by_role('button',name='전체',exact=True).click();expect(page.locator('.codex-toggle')).to_have_count(1)
  page.evaluate(WRITE,DATA['inquiries']);page.reload();page.get_by_role('button',name='이어하기',exact=True).click();expect(page.get_by_role('region',name='구매자 프로필')).to_have_count(2)
  for q in DATA['inquiries']['game']['inquiries']:expect(page.locator('.sheet-layer')).to_contain_text('@'+q['traderId'])
  if width==390:page.screenshot(path='work/buyer-profile-390.png',full_page=True)
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth') and not errors,errors
  c.close();print(f'{width}px seller/buyer identity, firm/flexible negotiation, locked codex, acquisition unlock, filters/details/reload PASS',flush=True)
 b.close()
