"""Production browser QA. Start preview on 4182; Python Playwright + Chromium required."""
import json
import re
import os
import subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
subprocess.run(['node', 'scripts/prepare-browser-fixtures.mjs'], check=True)
BASE = os.getenv('SCREEN_BASE_URL', 'http://127.0.0.1:4182')
READ_SAVE = """async () => {const db=await new Promise((r,j)=>{const q=indexedDB.open('resale-game',2);q.onsuccess=()=>r(q.result);q.onerror=()=>j(q.error);});return await new Promise(r=>{const q=db.transaction('saves').objectStore('saves').get('current');q.onsuccess=()=>{db.close();r(q.result);};});}"""
WRITE_SAVE = """async data => {const db=await new Promise((r,j)=>{const q=indexedDB.open('resale-game',2);q.onupgradeneeded=()=>q.result.createObjectStore('saves');q.onsuccess=()=>r(q.result);q.onerror=()=>j(q.error);});await new Promise((r,j)=>{const tx=db.transaction('saves','readwrite');tx.objectStore('saves').put(data,'current');tx.oncomplete=r;tx.onerror=j;});db.close();}"""
with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH','/usr/bin/chromium'),args=['--no-sandbox'])
    results=[]
    for width,height in [(320,844),(375,667),(390,844),(430,932)]:
        context=browser.new_context(viewport={'width':width,'height':height},is_mobile=True,has_touch=True)
        page=context.new_page(); errors=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
        page.goto(BASE)
        page.get_by_role('heading',name='활동',exact=True).wait_for()
        nav=page.get_by_role('navigation',name='주요 메뉴')
        def click(name):
            page.get_by_role('button',name=re.compile('^'+re.escape(name)+'(?: ·.*)?$')).click()
            expect(page.locator('.action-layer')).to_have_count(0)
        def tab(name): nav.get_by_role('button',name=name,exact=True).click()
        def activity(name): page.locator('.activity-grid').get_by_role('button',name=name,exact=True).click()
        def layout():
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            assert abs(page.locator('.status-header').bounding_box()['y'])<1
            if page.locator('.sheet-layer').count():
                sheet=page.locator('.sheet-layer').bounding_box(); head=page.locator('.status-header').bounding_box()
                assert abs(sheet['y']-(head['y']+head['height']))<2
                assert abs(sheet['y']+sheet['height']-height)<2
        def saved(): return page.evaluate(READ_SAVE)
        def fixture(name):
            data=json.loads(Path(f'work/{name}.json').read_text())
            page.evaluate(WRITE_SAVE,data);page.reload();page.get_by_role('heading',name='활동',exact=True).wait_for();return data
        expect(page.get_by_role('button',name='플레이 안내',exact=True)).to_have_count(0)
        assert page.get_by_text('무료 급식은 언제나',exact=False).count()==0
        assert nav.get_by_role('button').all_text_contents()==['내 정보','채무','활동','보관함','상점']
        assert page.locator('.activity-grid button').all_text_contents()==['무료나눔','아르바이트','물건 수집','장터','매각처','식사','수면','치료']
        expect(page.locator('.header-debt')).to_contain_text('10,000,000,000 원')
        assert page.locator('meter').evaluate_all('(ms)=>ms.map(m=>m.getAttribute("aria-label"))')==['포만감','체력','피로도']
        layout();page.screenshot(path=f'work/playable-home-{width}.png',full_page=True)
        activity('아르바이트');layout()
        assert page.get_by_role('button',name=re.compile('^일하기')).all_text_contents()==['일하기 · 1시간','일하기 · 2시간','일하기 · 3시간']
        page.get_by_role('button',name='일하기 · 1시간',exact=True).first.click()
        expect(page.locator('.status-top')).to_contain_text('9,000 원')
        expect(page.locator('.status-top')).to_contain_text('10:00')
        click('닫기');activity('물건 수집');click('물건 수집하기');click('닫기');tab('보관함')
        page.locator('.item-row').first.click();expect(page.get_by_text('가치 미확인',exact=True)).to_be_visible()
        page.get_by_role('button',name='가치 확인 ·',exact=False).click()
        expect(page.get_by_text('현재 시장 기준',exact=False)).to_be_visible()
        click('장터에 판매 등록');page.get_by_label('판매 가격 (원)').fill('1');click('판매 글 등록 확정')
        expect(page.get_by_label('판매 가격 (원)')).to_have_count(0)
        for _ in range(8):
            if page.get_by_role('heading',name='문의',exact=True).count():break
            click('구매 문의 기다리기 · 1시간')
        expect(page.get_by_role('heading',name='문의',exact=True)).to_be_visible()
        assert page.get_by_role('button',name='닫기',exact=True).count()==0
        assert all(b.is_disabled() for b in page.locator('.bottom-nav button').all())
        page.screenshot(path=f'work/playable-inquiries-{width}.png',full_page=True);layout()
        # Pending response survives reload; offline time is never added.
        page.wait_for_function("async()=> (await ("+READ_SAVE+")())?.game?.inquiries?.length > 0")
        before=saved()['game'];page.reload();expect(page.get_by_role('heading',name='문의',exact=True)).to_be_visible()
        assert saved()['game']['minute']==before['minute']
        page.get_by_role('button',name='수락 (1시간)',exact=True).first.click()
        tab('보관함')
        expect(page.get_by_text('아직 보유한 물품이 없습니다.')).to_be_visible()
        # Real buy, negotiation, outlet and archive flows from a non-production fixture.
        fixture('rich');activity('장터');page.locator('.item-row').first.click();layout()
        expect(page.get_by_text('상태 미확인')).to_be_visible()
        page.get_by_role('button',name='구매 전 외관·작동 확인',exact=False).click()
        page.get_by_role('button',name=' 제안',exact=False).first.click()
        page.get_by_role('button',name='구매 내용 확인',exact=False).click();click('지불·수령 확정')
        click('받은 물품 확인');layout();page.screenshot(path=f'work/playable-item-{width}.png',full_page=True)
        click('매각처 방문');page.get_by_role('button',name='고물상 방문 · 1시간',exact=True).click()
        page.locator('.item-row').first.click();click('제시 가격으로 판매 확정')
        while page.get_by_role('button',name='← 뒤로',exact=True).count():click('← 뒤로')
        click('닫기')
        tab('내 정보');expect(page.get_by_role('heading',name='거래 감각',exact=False)).to_be_visible();layout()
        tab('상점');layout();tab('채무');layout()
        page.get_by_label('상환 금액').fill('100');click('입력 금액 상환')
        expect(page.locator('main')).to_contain_text('9,999,999,900 원')
        # Full state export and malformed import rejection, keeping existing progress.
        click('저장 관리')
        with page.expect_download() as download_info:click('백업 파일 내보내기')
        download=download_info.value;payload=json.loads(Path(download.path()).read_text());assert payload['version']==2
        page.once('dialog',lambda d:d.accept())
        page.locator('input[type=file]').set_input_files({'name':'bad.json','mimeType':'application/json','buffer':b'{"version":2,"game":{}}'})
        expect(page.get_by_role('status')).to_contain_text('저장 형식이 올바르지 않습니다.')
        assert saved()['game']['principal']==9_999_999_900
        click('닫기')
        # Recovery at zero, final death, final clear through actual UI commands.
        fixture('empty');activity('식사');page.get_by_role('button',name='먹기 · 1시간',exact=True).first.click()
        expect(page.locator('meter[aria-label="포만감"]')).to_have_attribute('value','20')
        click('닫기')
        fixture('death');activity('아르바이트');page.get_by_role('button',name='일하기 · 1시간',exact=True).first.click()
        expect(page.get_by_role('heading',name='이 이야기는 여기까지.')).to_be_visible()
        fixture('clear');tab('채무');page.get_by_role('button',name='가능한 만큼 상환',exact=False).click()
        expect(page.get_by_role('heading',name='드디어, 자유.')).to_be_visible();layout()
        # Restore a normal state before offline QA.
        fixture('rich')
        page.wait_for_function('!!navigator.serviceWorker.controller',timeout=15000)
        page.wait_for_function("async()=>{const keys=await caches.keys();return keys.some(k=>k.startsWith('resale-'));}")
        context.set_offline(True);page.reload();
        try: expect(page.get_by_role('heading',name='활동',exact=True)).to_be_visible()
        except Exception:
            print('OFFLINE DIAGNOSTICS',page.locator('body').inner_text(),errors,page.evaluate('async()=>{const keys=await caches.keys();return await Promise.all(keys.map(async k=>[k,(await (await caches.open(k)).keys()).map(r=>r.url)]));}'))
            raise
        activity('아르바이트');page.get_by_role('button',name='일하기 · 1시간',exact=True).first.click()
        expect(page.locator('.status-top')).to_contain_text('59,000 원')
        page.reload();expect(page.locator('.status-top')).to_contain_text('59,000 원')
        # Offline navigations deliberately log failed network fetches; they are expected.
        context.set_offline(False)
        assert not [e for e in errors if 'net::ERR_INTERNET_DISCONNECTED' not in e],errors
        results.append({'viewport':f'{width}x{height}','flows':'PASS','offline':'PASS'})
        context.close()
    browser.close()
    print(json.dumps(results))
