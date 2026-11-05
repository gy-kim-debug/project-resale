"""No money-making shortcuts; markets still trade and legacy zero-cost assets survive."""
import json,time
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
LEGACY=json.loads(Path('work/retired-income-fixture.json').read_text())
READ="""async()=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});return await new Promise(r=>{const q=db.transaction('saves').objectStore('saves').get('slot:1');q.onsuccess=()=>{db.close();r(q.result)}})}"""
WRITE="""async data=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});await new Promise(r=>{const tx=db.transaction('saves','readwrite');tx.objectStore('saves').put(data,'slot:1');tx.oncomplete=r});db.close()}"""
def read(page):return page.evaluate(READ)
def wait_saved(page,condition):
 deadline=time.monotonic()+5
 while time.monotonic()<deadline:
  d=read(page)
  if condition(d):return d
  page.wait_for_timeout(20)
 raise AssertionError('Save did not finish')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for w,h in [(320,568),(390,844),(430,932),(1024,768)]:
  c=b.new_context(viewport={'width':w,'height':h},reduced_motion='reduce');page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:4182');page.get_by_role('button',name='새로 시작',exact=True).click();page.get_by_label('닉네임',exact=True).fill('거래만');page.get_by_role('button',name='이 캐릭터로 시작',exact=True).click();page.get_by_role('button',name='스킵',exact=True).click();page.get_by_role('button',name='시작하기',exact=True).click();before=wait_saved(page,lambda d:d['game']['story']['active'] is None)
  for label in ['무료나눔','아르바이트','물건 수집']:expect(page.get_by_role('button',name=label,exact=True)).to_have_count(0)
  expect(page.get_by_role('heading',name='돈 벌기',exact=True)).to_have_count(0)
  for label in ['중고 장터','전자상가','악기시장','중고차시장','부동산 시장','고가 경매시장','즉시 판매','사업']:expect(page.locator('.activity-grid').get_by_role('button',name=label,exact=True)).to_have_count(1)
  assert before['game']['cash']==500000 and len(before['game']['inventory'])==0 and len(before['game']['board'])==72 and all(i['price']>0 for i in before['game']['board'])
  if w==390:page.screenshot(path='work/activities-without-income-390.png')
  page.get_by_role('button',name='우편함',exact=True).click();page.locator('.welcome-mail summary').click();text=page.locator('.welcome-letter').inner_text();assert all(s not in text for s in ['무료나눔','아르바이트','물건 수집']);page.get_by_role('navigation',name='주요 메뉴').get_by_role('button',name='활동',exact=True).click()
  page.locator('.activity-grid').get_by_role('button',name='중고 장터',exact=True).click();expect(page.locator('.item-row')).to_have_count(12);page.get_by_role('button',name='새 매물 탐색',exact=True).click();wait_saved(page,lambda d:d['game']['weekActions']==1);expect(page.locator('.action-layer')).to_have_count(0);assert all(i['price']>0 for i in read(page)['game']['board'])
  page.locator('.item-row').first.click();page.get_by_role('button',name='구매 내용 확인 ·',exact=False).click();page.get_by_role('button',name='지불·수령 확정',exact=True).click();paid=wait_saved(page,lambda d:len(d['game']['inventory'])==1);expect(page.locator('.action-layer')).to_have_count(0);assert paid['game']['inventory'][0]['acquiredFor']>0 and paid['game']['cash']==500000-paid['game']['inventory'][0]['acquiredFor'] and paid['game']['weekActions']==2
  page.get_by_role('navigation',name='주요 메뉴').get_by_role('button',name='보관함',exact=True).click();expect(page.locator('.item-row')).to_have_count(1)
  page.evaluate(WRITE,LEGACY);page.reload();expect(page.get_by_role('button',name='이어하기',exact=True)).to_have_count(0);expect(page.locator('.item-row')).to_have_count(1);expect(page.locator('.status-header')).to_contain_text('1,238,000 원');page.locator('.item-row').first.click();expect(page.locator('.sheet-content [data-field=cost]')).to_have_text('0 원');page.get_by_role('button',name='가치 확인 ·',exact=False).click();saved=wait_saved(page,lambda d:d['game']['inventory'][0]['checked']);expect(page.locator('.action-layer')).to_have_count(0);assert saved['game']['inventory'][0]['value']==LEGACY['game']['inventory'][0]['value'];assert saved['game']['stats']['earned']==38000 and all(i['price']>0 for i in saved['game']['board']) and any('창고 분류 완료' in l['text'] for l in saved['game']['logs'])
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth') and not errors,errors;c.close();print(f'{w}x{h}: no 3 shortcuts/group, all markets/assets retained, updated tutorial, no free stock after refresh, real paid purchase, automatic reload+legacy zero-cost asset/value/income preserved, no overflow/errors PASS',flush=True)
 b.close()
