"""Action feedback QA against the production preview (Python Playwright + Chromium)."""
import os
import time
import json
from playwright.sync_api import sync_playwright, expect
BASE=os.getenv('SCREEN_BASE_URL','http://127.0.0.1:4182')
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
    results=[]
    for width,height in [(320,844),(375,667),(390,844),(430,932)]:
        context=browser.new_context(viewport={'width':width,'height':height},is_mobile=True,has_touch=True)
        page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(BASE);page.get_by_role('heading',name='활동',exact=True).wait_for()
        nav=page.get_by_role('navigation',name='주요 메뉴')
        nav.get_by_role('button',name='내 정보',exact=True).click()
        assert page.locator('.action-layer').count()==0
        nav.get_by_role('button',name='활동',exact=True).click()
        page.locator('.activity-grid').get_by_role('button',name='아르바이트',exact=True).click()
        assert page.locator('.action-layer').count()==0
        start=time.monotonic();page.get_by_role('button',name='일하기',exact=True).first.click()
        expect(page.locator('.action-layer')).to_be_visible()
        expect(page.locator('.action-time')).to_contain_text('1일째 09:00')
        expect(page.locator('.action-time')).to_contain_text('1일째 10:00')
        expect(page.locator('.status-top')).to_contain_text('현금 0 원')
        assert page.locator('.game-scene').get_attribute('inert') is not None
        assert page.evaluate('document.activeElement.classList.contains("action-layer")')
        page.keyboard.press('Escape');page.keyboard.press('Tab')
        expect(page.locator('.action-layer')).to_be_visible()
        # Programmatic events also hit the store guard, not just the blocking layer.
        page.locator('.game-scene button').filter(has_text='일하기').first.evaluate('(button)=>button.click()')
        page.screenshot(path=f'work/action-progress-{width}.png')
        expect(page.locator('.action-layer')).to_have_count(0)
        elapsed=time.monotonic()-start
        assert elapsed>=0.5
        expect(page.locator('.status-top')).to_contain_text('9,000 원')
        expect(page.locator('.status-top')).to_contain_text('10:00')
        assert page.locator('.status-header .stat-changed').count()>=3
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        # A refresh during presentation restores the committed action, with no replay.
        page.get_by_role('button',name='일하기',exact=True).first.click()
        expect(page.locator('.action-layer')).to_be_visible()
        page.wait_for_function("async()=>{const db=await new Promise(r=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result);});return await new Promise(r=>{const q=db.transaction('saves').objectStore('saves').get('current');q.onsuccess=()=>{db.close();r(q.result?.game?.cash===18000);};});}")
        page.reload();expect(page.locator('.status-top')).to_contain_text('18,000 원')
        expect(page.locator('.status-top')).to_contain_text('11:00')
        assert page.locator('.action-layer').count()==0
        page.locator('.activity-grid').get_by_role('button',name='수면',exact=True).click()
        page.get_by_role('button',name='잠자기',exact=True).click()
        expect(page.locator('.action-time')).to_contain_text('2일째 09:00')
        expect(page.locator('.action-layer')).to_have_count(0)
        expect(page.locator('.status-top')).to_contain_text('2일째 09:00')
        assert not errors,errors
        results.append({'viewport':f'{width}x{height}','presentation':'PASS','double_input':'PASS','reload_mid_action':'PASS','observed_seconds':round(elapsed,2)})
        context.close()
    context=browser.new_context(reduced_motion='reduce');page=context.new_page();page.goto(BASE)
    page.locator('.activity-grid').get_by_role('button',name='아르바이트',exact=True).click()
    page.get_by_role('button',name='일하기',exact=True).first.click();expect(page.locator('.action-layer')).to_be_visible()
    assert page.locator('.action-progress-track span').evaluate('(e)=>getComputedStyle(e).animationName')=='none'
    expect(page.locator('.action-layer')).to_have_count(0)
    expect(page.locator('.status-top')).to_contain_text('9,000 원')
    context.close();browser.close();print(json.dumps({'mobile':results,'reduced_motion':'PASS'}))
