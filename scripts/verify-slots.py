"""Production IndexedDB QA: start menu, per-slot profiles/progress, migration, deletion and recovery."""
import json,os
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
BASE=os.getenv('SCREEN_BASE_URL','http://127.0.0.1:4182')
READ="""async key=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});try{return await new Promise(r=>{const q=db.transaction('saves').objectStore('saves').get(key);q.onsuccess=()=>r(q.result??null)})}finally{db.close()}}"""
LEGACY="""async data=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});await new Promise(r=>{const t=db.transaction('saves','readwrite');t.objectStore('saves').clear();t.objectStore('saves').put(data,'current');t.oncomplete=r});db.close()}"""
with sync_playwright() as p:
 b=p.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
 for width,height in [(320,568),(375,667),(390,844),(430,932)]:
  c=b.new_context(viewport={'width':width,'height':height},is_mobile=True,has_touch=True);page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(BASE);expect(page.get_by_role('heading',name='시작하기',exact=True)).to_be_visible();expect(page.get_by_role('button',name='이어하기',exact=True)).to_be_disabled();assert page.evaluate(READ,'slot:1') is None
  def create(name,hair='모자',outfit='로즈',skin='짙은 톤'):
   page.get_by_label('닉네임',exact=True).fill(name);page.get_by_label(hair,exact=True).check();page.get_by_label(outfit,exact=True).check();page.get_by_label(skin,exact=True).check()
   if width==390 and name=='거래왕':page.screenshot(path='work/character-create-390.png',full_page=True)
   page.get_by_role('button',name='이 캐릭터로 시작',exact=True).click();expect(page.get_by_role('heading',name='활동',exact=True)).to_be_visible()
  def menu():
   page.get_by_role('button',name='설정',exact=True).click();page.get_by_role('button',name='시작 화면으로',exact=True).click();expect(page.get_by_role('heading',name='시작하기',exact=True)).to_be_visible()
  def slots():page.get_by_role('button',name='저장 슬롯',exact=False).click();expect(page.get_by_role('heading',name='저장 슬롯',exact=True)).to_be_visible()
  def region(n):return page.get_by_role('region',name=f'슬롯 {n}',exact=True)
  page.get_by_role('button',name='새로 시작',exact=True).click();expect(page.get_by_role('button',name='이 캐릭터로 시작',exact=True)).to_be_disabled();create('거래왕')
  page.locator('.activity-grid').get_by_role('button',name='아르바이트',exact=True).click();page.get_by_role('button',name='일하기',exact=True).first.click();expect(page.locator('.action-scene.scene-work')).to_be_visible();assert page.locator('.scene-player rect[fill="#d99fae"]').count()>0;
  if width==390:page.screenshot(path='work/custom-player-action-390.png',full_page=True)
  expect(page.locator('.action-layer')).to_have_count(0);menu();first=page.evaluate(READ,'slot:1');assert first['game']['weekActions']==1 and first['game']['player']['nickname']=='거래왕'
  if width==390:page.screenshot(path='work/start-menu-390.png',full_page=True)
  slots();region(2).get_by_role('button',name='여기서 새로 시작',exact=True).click();create('두번째','긴 머리','블루','밝은 톤');second=page.evaluate(READ,'slot:2');assert second['game']['cash']==500000 and second['game']['weekActions']==0;assert page.evaluate(READ,'slot:1')==first
  page.reload();expect(page.get_by_role('heading',name='시작하기',exact=True)).to_be_visible();page.get_by_role('button',name='이어하기',exact=True).click();expect(page.get_by_role('heading',name='활동',exact=True)).to_be_visible();page.get_by_role('navigation',name='주요 메뉴').get_by_role('button',name='내 정보',exact=True).click();expect(page.get_by_role('heading',name='두번째',exact=True)).to_be_visible();assert page.locator('.player-character-portrait svg rect[fill="#8dadd3"]').count()>0
  menu();slots();region(1).get_by_role('button',name='이 슬롯 이어하기',exact=True).click();expect(page.locator('.status-top')).to_contain_text('남은 행동 19/20');page.get_by_role('navigation',name='주요 메뉴').get_by_role('button',name='내 정보',exact=True).click();expect(page.get_by_role('heading',name='거래왕',exact=True)).to_be_visible();assert page.locator('.player-character-portrait svg rect[fill="#d99fae"]').count()>0
  if width==390:page.screenshot(path='work/custom-player-info-390.png',full_page=True)
  menu();slots();region(3).get_by_role('button',name='여기서 새로 시작',exact=True).click();create('세번째','짧은 머리','앰버','중간 톤');menu();page.get_by_role('button',name='새로 시작',exact=True).click();expect(page.get_by_role('heading',name='저장 슬롯',exact=True)).to_be_visible();assert page.locator('.save-slot').count()==3
  if width==390:page.screenshot(path='work/save-slots-390.png',full_page=True)
  third=page.evaluate(READ,'slot:3');region(3).get_by_role('button',name='슬롯 삭제',exact=True).click();region(3).get_by_role('button',name='취소',exact=True).click();assert page.evaluate(READ,'slot:3')==third
  region(3).get_by_role('button',name='슬롯 삭제',exact=True).click();region(3).get_by_role('button',name='슬롯 3 삭제 확정',exact=True).click();expect(region(3)).to_contain_text('비어 있는 슬롯');assert page.evaluate(READ,'slot:1')['game']==first['game'];assert page.evaluate(READ,'slot:2')['game']==second['game'];page.reload();slots();expect(region(3)).to_contain_text('비어 있는 슬롯')
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth') and not errors,errors;c.close();print(f'{width}x{height} fresh menu, live customization, three isolated slots, resume/reload, full-slot protection, cancel/delete PASS',flush=True)
 # Two already-open setup pages must not overwrite the same slot.
 c=b.new_context(viewport={'width':390,'height':844});one=c.new_page();two=c.new_page()
 for page,name in [(one,'선착순'),(two,'나중사람')]:
  page.goto(BASE);page.get_by_role('button',name='새로 시작',exact=True).click();page.get_by_label('닉네임',exact=True).fill(name)
 one.get_by_role('button',name='이 캐릭터로 시작',exact=True).click();expect(one.get_by_role('heading',name='활동',exact=True)).to_be_visible();two.get_by_role('button',name='이 캐릭터로 시작',exact=True).click();expect(two.get_by_role('alert')).to_contain_text('이미 사용 중인 슬롯');assert two.evaluate(READ,'slot:1')['game']['player']['nickname']=='선착순';assert two.evaluate(READ,'slot:2') is None;two.get_by_role('button',name='← 뒤로',exact=True).click();expect(two.get_by_role('region',name='슬롯 1',exact=True)).to_contain_text('선착순');c.close();print('stale second-tab create rejected without overwriting occupied slot; refreshed slot list PASS',flush=True)
 # Migration of an actual old snapshot, including deletion without resurrecting its recovery copy.
 c=b.new_context(viewport={'width':390,'height':844});page=c.new_page();page.goto(BASE);expect(page.get_by_role('heading',name='시작하기',exact=True)).to_be_visible();old=json.loads(Path('tests/fixtures/legacy-catalog-v2.json').read_text());page.evaluate(LEGACY,old);page.reload();expect(page.get_by_role('button',name='이어하기',exact=True)).to_be_enabled();migrated=page.evaluate(READ,'slot:1');assert migrated['game']==old['game'];assert page.evaluate(READ,'current')==old;page.get_by_role('button',name='저장 슬롯',exact=False).click();slot=page.get_by_role('region',name='슬롯 1',exact=True);slot.get_by_role('button',name='슬롯 삭제',exact=True).click();slot.get_by_role('button',name='슬롯 1 삭제 확정',exact=True).click();expect(slot).to_contain_text('비어 있는 슬롯');page.reload();expect(page.get_by_role('button',name='이어하기',exact=True)).to_be_disabled();assert page.evaluate(READ,'slot:1') is None and page.evaluate(READ,'current')==old;c.close();print('legacy current -> slot 1 atomic migration, original recovery copy, no resurrection after deletion PASS',flush=True)
 # Corrupt data remains visible and intact while another slot can be used.
 c=b.new_context(viewport={'width':390,'height':844});page=c.new_page();page.goto(BASE);expect(page.get_by_role('heading',name='시작하기',exact=True)).to_be_visible();bad={'version':2,'game':'corrupt'};page.evaluate(LEGACY,bad);page.reload();page.get_by_role('button',name='저장 슬롯',exact=False).click();expect(page.get_by_role('region',name='슬롯 1',exact=True)).to_contain_text('저장 데이터를 읽을 수 없습니다.');page.get_by_role('region',name='슬롯 2',exact=True).get_by_role('button',name='여기서 새로 시작',exact=True).click();page.get_by_label('닉네임',exact=True).fill('복구후시작');page.get_by_role('button',name='이 캐릭터로 시작',exact=True).click();expect(page.get_by_role('heading',name='활동',exact=True)).to_be_visible();assert page.evaluate(READ,'slot:1')==bad and page.evaluate(READ,'current')==bad and page.evaluate(READ,'slot:2')['game']['player']['nickname']=='복구후시작';c.close();print('corrupt legacy data preserved; independent empty-slot creation PASS',flush=True)
 b.close()
