"""Title menu, existing three-slot isolation and web preferences in real IndexedDB."""
import copy,json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
BASE=json.loads(Path('work/chat-fixtures.json').read_text())['basic']
WRITE="""async slots=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});await new Promise(r=>{const tx=db.transaction('saves','readwrite'),s=tx.objectStore('saves');s.clear();s.put(true,'slots-initialized');for(const [id,data] of Object.entries(slots)){s.put(data,'slot:'+id);s.put(Number(id)*100000000000,'slot-time:'+id)}tx.oncomplete=r});db.close();sessionStorage.setItem('resale:resume',JSON.stringify({version:1,screen:'menu'}))}"""
READ="""async()=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});const out={};for(const id of [1,2,3])out[id]=await new Promise(r=>{const q=db.transaction('saves').objectStore('saves').get('slot:'+id);q.onsuccess=()=>r(q.result??null)});db.close();return out}"""
def btn(page,name):return page.get_by_role('button',name=name,exact=True)
def slots(page):btn(page,'저장 데이터').click();expect(page.locator('.save-slot')).to_have_count(3)
def fits(page):assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for w,h in [(320,568),(390,844),(430,932),(1024,768)]:
  c=b.new_context(viewport={'width':w,'height':h},timezone_id='Asia/Seoul');page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:(errors.append('native dialog'),d.dismiss()));page.goto('http://127.0.0.1:4182');expect(btn(page,'이어하기')).to_be_disabled()
  expect(page.get_by_role('navigation',name='시작 메뉴').locator('button')).to_have_count(4)
  assert btn(page,'설정').bounding_box()['y']+btn(page,'설정').bounding_box()['height']<=h;fits(page)
  btn(page,'새로 시작').click();expect(page.locator('.create-slot-label')).to_have_text('슬롯 1');page.keyboard.press('Escape');expect(page.get_by_role('heading',name='저장 데이터',exact=True)).to_be_visible();page.keyboard.press('Escape')
  btn(page,'설정').click();page.get_by_role('switch',name='모션 간소화').click();expect(page.locator('html')).to_have_attribute('data-game-motion','reduced');page.get_by_role('switch',name='효과음').click();expect(page.get_by_role('switch',name='효과음')).to_have_attribute('aria-checked','true');page.reload();btn(page,'설정').click();expect(page.get_by_role('switch',name='효과음')).to_have_attribute('aria-checked','true');expect(page.get_by_role('switch',name='모션 간소화')).to_have_attribute('aria-checked','true');assert page.evaluate(READ)=={'1':None,'2':None,'3':None};btn(page,'← 뒤로').click()
  data={}
  for i in [1,2,3]:
   d=copy.deepcopy(BASE);d['game']['player']={'nickname':'플레이어'+str(i),'appearance':{'avatar':'male','clothing':'jacket','hair':'short','outfit':'mint','skin':'tan'}};d['game']['cash']=i*123456700;data[str(i)]=d
  data['3']['game']['status']='cleared';data['3']['game']['principal']=0;data['3']['game']['interest']=0
  page.evaluate(WRITE,data);page.reload();expect(btn(page,'이어하기')).to_contain_text('슬롯 2');slots(page);before=page.evaluate(READ);expect(page.locator('.save-slot[data-state="playing"]')).to_have_count(2);expect(page.locator('.save-slot[data-state="cleared"]')).to_have_count(1);fits(page)
  if w==390:page.screenshot(path='work/main-menu-slots-390.png',full_page=True)
  btn(page,'← 뒤로').click();btn(page,'새로 시작').click();expect(page.get_by_role('status')).to_have_text('사용 가능한 빈 슬롯이 없습니다.');assert page.evaluate(READ)==before
  card=page.get_by_role('region',name='슬롯 2',exact=True);card.get_by_role('button',name='슬롯 삭제',exact=True).click();expect(page.get_by_role('alertdialog')).to_be_visible();page.keyboard.press('Escape');expect(page.get_by_role('alertdialog')).to_have_count(0);assert page.evaluate(READ)==before
  card.get_by_role('button',name='슬롯 삭제',exact=True).click();btn(page,'삭제').click();expect(card.get_by_role('button',name='여기서 새로 시작',exact=True)).to_be_visible();after=page.evaluate(READ);assert after['2'] is None and after['1']==before['1'] and after['3']==before['3'];expect(page.locator('.slots-full')).to_have_count(0)
  btn(page,'← 뒤로').click();btn(page,'새로 시작').click();expect(page.locator('.create-slot-label')).to_have_text('슬롯 2');page.get_by_role('textbox',name='닉네임').fill('새주인공');btn(page,'이 캐릭터로 시작').click();expect(btn(page,'스킵')).to_be_visible();btn(page,'스킵').click();btn(page,'시작하기').click();expect(page.get_by_role('heading',name='활동',exact=True)).to_be_visible();btn(page,'설정').click();expect(page.get_by_role('switch',name='모션 간소화')).to_have_attribute('aria-checked','true');btn(page,'시작 화면으로').click();expect(btn(page,'이어하기')).to_contain_text('새주인공');after=page.evaluate(READ);assert after['1']==before['1'] and after['3']==before['3'] and after['2']['game']['player']['nickname']=='새주인공'
  page.reload();expect(btn(page,'이어하기')).to_contain_text('새주인공');btn(page,'이어하기').click();expect(page.get_by_role('heading',name='활동',exact=True)).to_be_visible();fits(page);assert not errors,errors
  print(f'{w}x{h}: four menu entries, empty/create/full, recent playing priority, isolated slot deletion/new/continue, save+reload, persistent shared settings, no native dialogs/overflow/errors PASS',flush=True);c.close()
 # Corrupt slot remains occupied; preferences cannot prevent loading.
 c=b.new_context();page=c.new_page();page.goto('http://127.0.0.1:4182');expect(btn(page,'새로 시작')).to_be_visible();page.evaluate(WRITE,{'1':{'broken':True}});page.evaluate("localStorage.setItem('resale:options','broken')");page.reload();btn(page,'새로 시작').click();expect(page.locator('.create-slot-label')).to_have_text('슬롯 2');assert page.evaluate(READ)['1']=={'broken':True};page.keyboard.press('Escape');expect(page.locator('.save-slot[data-state="error"]')).to_have_count(1);print('Corrupt slot protected, corrupt preferences recover PASS',flush=True);c.close();b.close()
