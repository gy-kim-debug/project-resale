"""Listing price presets populate editable input without revealing unappraised values or spending actions."""
import json, os
from playwright.sync_api import sync_playwright, expect
BASE=os.getenv('SCREEN_BASE_URL','http://127.0.0.1:4182')
READ="""async()=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});return await new Promise(r=>{const q=db.transaction('saves').objectStore('saves').get('current');q.onsuccess=()=>{db.close();r(q.result)}})}"""
WRITE="""async data=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});await new Promise(r=>{const tx=db.transaction('saves','readwrite');tx.objectStore('saves').put(data,'current');tx.oncomplete=r});db.close()}"""
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for width in [320,375,390,430]:
  ctx=browser.new_context(viewport={'width':width,'height':844},is_mobile=True,has_touch=True)
  page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(BASE);page.get_by_role('heading',name='활동',exact=True).wait_for();page.wait_for_function('async()=>!!(await ('+READ+')())')
  fixture=page.evaluate(READ);g=fixture['game'];item=g['board'].pop(0)
  item.update({'checked':True,'acquiredFor':32000,'base':100000,'value':100000});g['inventory']=[item];g['marketFactor']=100;g['trend']=item['kind']
  iid=item['id']
  def read():return page.evaluate(READ)['game']
  def load(data):
   page.evaluate(WRITE,data);page.reload();page.get_by_role('heading',name='활동',exact=True).wait_for()
   page.get_by_role('navigation',name='주요 메뉴').get_by_role('button',name='보관함',exact=True).click()
   page.locator('.item-row').first.click();page.get_by_role('button',name='중고 장터에 판매 등록',exact=True).click()
  def layout():assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
  load(fixture);before=read();field=page.get_by_label('판매 가격 (원)',exact=True);submit=page.get_by_role('button',name='판매 글 등록 확정',exact=True);choices=page.locator('.price-options button')
  expect(choices).to_have_count(4);expect(submit).to_be_disabled()
  for index,amount in enumerate([120000,96000,144000,32000]):
   expect(choices.nth(index)).to_contain_text(f'{amount:,} 원');choices.nth(index).click();expect(field).to_have_value(str(amount));expect(choices.nth(index)).to_have_attribute('aria-pressed','true')
   assert read()==before and page.locator('.action-layer').count()==0;layout()
  field.fill('1050');expect(page.locator('.amount-form p')).to_contain_text('1,100 원');expect(page.locator('.price-options button[aria-pressed=true]')).to_have_count(0)
  field.fill('49');expect(submit).to_be_disabled();choices.first.click();expect(submit).to_be_enabled()
  assert page.locator('.price-options .action-cost').count()==0;expect(submit.locator('.action-cost')).to_have_attribute('data-action-cost','1')
  if width==390:page.screenshot(path='work/listing-price-presets-390.png',full_page=True)
  submit.click();expect(page.locator('.action-layer')).to_have_count(0)
  posted=read();assert posted['sales'][0]['price']==120000 and posted['weekActions']==before['weekActions']+1 and posted['minute']==before['minute']+480
  page.reload();page.get_by_role('heading',name='활동',exact=True).wait_for();assert read()==posted
  # Direct entry remains editable and posts the same hundred-won-rounded price.
  load(fixture);field.fill('1050');submit.click();expect(page.locator('.action-layer')).to_have_count(0);assert read()['sales'][0]['price']==1100
  # Unappraised goods reveal neither real value nor a ratio-derived price.
  unknown=json.loads(json.dumps(fixture));unknown['game']['inventory'][0]['checked']=False;load(unknown)
  expect(choices).to_have_count(4)
  for n in range(3):expect(choices.nth(n)).to_be_disabled();expect(choices.nth(n)).to_contain_text('미확인')
  assert '120,000 원' not in page.locator('.amount-form').inner_text()
  choices.nth(3).click();expect(field).to_have_value('32000');field.fill('42000');expect(submit).to_be_enabled();assert read()==unknown['game'];layout()
  unknown['game']['inventory'][0]['acquiredFor']=0;load(unknown);expect(choices).to_have_count(3);field.fill('100');expect(submit).to_be_enabled();layout()
  large=json.loads(json.dumps(fixture));large['game']['inventory'][0].update({'value':500000000000000,'acquiredFor':900000000000000});load(large)
  choices.nth(2).click();expect(field).to_have_value('720000000000000');layout()
  assert not errors,errors
  ctx.close();print(f'{width}px presets/current value/cost, editable input, no premature action, exact posting/reload, unknown/free/large values PASS',flush=True)
 browser.close()
