import json
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
f=json.loads(Path('work/chat-fixtures.json').read_text())['basic']
WRITE="""async d=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result)});await new Promise(r=>{const tx=db.transaction('saves','readwrite');tx.objectStore('saves').put(d,'slot:1');tx.oncomplete=r});db.close();sessionStorage.setItem('resale:resume',JSON.stringify({version:1,screen:'game',slot:1,tab:'활동'}))}"""
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for w,h in [(320,568),(390,844),(430,932),(1024,768)]:
  c=b.new_context(viewport={'width':w,'height':h},is_mobile=w<500,has_touch=w<500,reduced_motion='reduce');page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:4182');expect(page.get_by_role('button',name='새로 시작',exact=True)).to_be_visible();page.evaluate(WRITE,f);page.reload();expect(page.get_by_role('heading',name='활동',exact=True)).to_be_visible()
  for market in ['중고 장터','전자상가']:
   page.get_by_role('button',name=market,exact=True).click();panel=page.locator('.market-fixed-filters');results=page.get_by_role('region',name='매물 목록',exact=True);expect(panel).to_be_visible();initial=panel.bounding_box();toolbar=page.locator('.sheet-toolbar').bounding_box();assert abs(initial['y']-toolbar['height'])<1
   for offset in [0,1,5,19,20,21,80,350,10000,40,0]:
    results.evaluate('(n,y)=>n.scrollTop=y',offset);page.wait_for_timeout(25);assert panel.bounding_box()==initial
    clip=results.bounding_box();assert abs(clip['y']-(initial['y']+initial['height']))<1
    assert page.evaluate("""()=>{const p=document.querySelector('.market-fixed-filters'),r=p.getBoundingClientRect();return [r.left+1,r.left+r.width/2,r.right-1].every(x=>p.contains(document.elementFromPoint(x,r.top+1)))}""")
   results.hover();page.mouse.wheel(0,900);page.wait_for_timeout(150);assert results.evaluate('(n)=>n.scrollTop')>0;assert panel.bounding_box()==initial
   page.get_by_label('매물 정렬',exact=True).select_option('low');page.get_by_role('checkbox',name='관심 매물만 보기').check();expect(page.get_by_role('heading',name='표시할 매물이 없습니다.',exact=True)).to_be_visible();assert panel.bounding_box()==initial;page.get_by_role('checkbox',name='관심 매물만 보기').uncheck()
   page.locator('.filters button').nth(1).click();page.locator('.filters button').first.click();results.evaluate('(n)=>n.scrollTop=n.scrollHeight');page.wait_for_timeout(50);saved=results.evaluate('(n)=>n.scrollTop');assert saved>0
   page.locator('.item-row').last.click();page.get_by_role('button',name='← 뒤로',exact=True).click();results=page.get_by_role('region',name='매물 목록',exact=True);assert abs(results.evaluate('(n)=>n.scrollTop')-saved)<2;assert panel.bounding_box()==initial
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
   if w==390 and market=='중고 장터':page.screenshot(path='work/market-scroll-fixed-390.png')
   page.get_by_role('button',name='활동으로 이동',exact=True).click()
  assert not errors,errors
  print(f'{w}x{h}: isolated list scroll 0/1/5/19/20/21/80/350/end+wheel, fixed filter geometry+top-edge hit tests, sort/favorites/category, detail-back scroll restoration, no overflow/errors PASS',flush=True);c.close()
 b.close()
