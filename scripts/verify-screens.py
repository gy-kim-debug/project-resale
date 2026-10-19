"""Run against npm run preview -- --port 4180. Requires Python Playwright + Chromium.
SCREEN_BASE_URL and CHROMIUM_PATH can override the local defaults.
"""
import json
import os
from playwright.sync_api import sync_playwright, expect

with sync_playwright() as pw:
    browser = pw.chromium.launch(executable_path=os.getenv('CHROMIUM_PATH', '/usr/bin/chromium'), args=['--no-sandbox'])
    results = []
    for width, height in [(320, 844), (375, 667), (390, 844), (430, 932)]:
        page = browser.new_page(viewport={'width': width, 'height': height})
        errors = []
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.on('console', lambda m: errors.append(m.text) if m.type == 'error' else None)
        page.goto(os.getenv('SCREEN_BASE_URL', 'http://127.0.0.1:4180'))
        nav = page.get_by_role('navigation', name='주요 메뉴')
        def click(name):
            page.get_by_role('button', name=name, exact=True).click()
        def tab(name):
            nav.get_by_role('button', name=name, exact=True).click()
        def layout():
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), page.locator('main').inner_text()
            assert page.locator('.game-header meter').count() == 3
            assert abs(page.locator('.game-header').bounding_box()['y']) < 1
        def activity(name):
            tab('활동')
            page.locator('.activity-option').filter(has_text=name).click()
            layout()
        assert nav.get_by_role('button').all_text_contents() == ['활동', '내 정보', '보관함', '상점', '채무']
        assert page.locator('meter').evaluate_all('(ms) => ms.map(m => m.getAttribute("aria-label"))') == ['포만감', '피로도', '체력']
        tab('보관함')
        expect(page.get_by_text('아직 보유한 물품이 없습니다.', exact=False)).to_be_visible()
        activity('무료나눔')
        click('글 없는 상황 보기')
        expect(page.get_by_text('현재 무료나눔 글이 없습니다.')).to_be_visible()
        click('예시 글 보기')
        page.get_by_role('button', name='생활용품 나눔 (예시)', exact=False).click()
        click('선택 확인 (목업)')
        click('보관함 확인')
        page.get_by_role('button', name='나눔 받은 생활용품 (예시)', exact=False).click()
        expect(page.get_by_text('미확인', exact=True)).to_have_count(2)
        click('별도 가치 확인 화면 (목업)')
        expect(page.get_by_text('1,000원 (확인 결과 예시)')).to_be_visible()
        layout()
        price = page.get_by_label('원하는 판매 가격 (원)')
        price.fill('9007199254740992')
        click('판매 글 등록 (목업)')
        expect(page.get_by_text('가격은 0 이상의 안전한 정수로 입력하세요.')).to_be_visible()
        price.fill('2000')
        click('판매 글 등록 (목업)')
        expect(page.get_by_label('원하는 판매 가격 (원)')).to_have_count(0)
        click('고물상·상점으로')
        page.get_by_role('button', name='고물상', exact=False).click()
        expect(page.get_by_role('button', name='나눔 받은 생활용품 (예시)', exact=False)).to_be_disabled()
        tab('보관함')
        click('구매 문의 상황 불러오기 (테스트 도구)')
        expect(page.get_by_role('heading', name='구매 문의')).to_be_visible()
        assert all(b.is_disabled() for b in nav.get_by_role('button').all())
        assert page.get_by_role('button', name='활동 홈으로').is_disabled()
        layout()
        click('거래 파토 · 판매 글과 모든 문의 종료')
        expect(page.get_by_label('원하는 판매 가격 (원)')).to_be_visible()
        page.get_by_label('원하는 판매 가격 (원)').fill('2500')
        click('판매 글 등록 (목업)')
        click('구매 문의 상황 불러오기 (테스트 도구)')
        page.get_by_role('button', name='거절', exact=True).first.click()
        expect(page.get_by_text('제안 2,500원 · 다시 제안')).to_be_visible()
        page.get_by_role('button', name='수락 · 한 번에 판매 (목업)', exact=True).first.click()
        expect(page.get_by_text('아직 보유한 물품이 없습니다.', exact=False)).to_be_visible()
        tab('내 정보')
        page.get_by_text('화면 검토 도구 (개발용)', exact=True).click()
        click('거래 확인용 예시 불러오기')
        activity('장터')
        click('디지털')
        assert page.locator('.listing').count() == 1
        click('전체')
        page.locator('#listing-radio').click()
        expect(page.get_by_text('1,000원 (확인 결과 예시)')).to_have_count(0)
        click('관심 매물로 저장')
        click('구매 전 확인')
        expect(page.get_by_role('button', name='확인 실행 · 조건 미정')).to_be_disabled()
        click('거래 선택으로 돌아가기')
        click('가격 협상')
        click('12,000원 제안')
        click('지불·수령 확정 (목업)')
        expect(page.get_by_role('button', name='지불·수령 확정 (목업)')).to_be_disabled()
        layout()
        tab('내 정보')
        expect(page.get_by_text('38,000원', exact=True)).to_be_visible()
        tab('보관함')
        expect(page.get_by_role('button', name='창고에서 찾은 오래된 라디오', exact=False).first).to_be_visible()
        activity('매각처')
        assert page.get_by_text('제시 가격', exact=False).count() == 0 # quotes hidden before visit
        page.get_by_role('button', name='중고 상점', exact=False).click()
        page.get_by_role('button', name='오래된 라디오 (예시)', exact=False).first.click()
        click('제시 가격으로 매각 (목업)')
        activity('물건 수집')
        click('조건과 결과 확인')
        for _ in range(4):
            click('선택 확인 (목업)')
            click('다시 선택')
        expect(page.get_by_text('보관함이 가득 찼습니다.', exact=False)).to_be_visible()
        tab('보관함')
        expect(page.get_by_text('보유 물품 4 / 4', exact=False)).to_be_visible()
        page.get_by_role('button', name='수집한 빈 병 (예시)', exact=False).first.click()
        click('물품 버리기')
        click('버리기 확인 (목업)')
        expect(page.get_by_text('보유 물품 3 / 4', exact=False)).to_be_visible()
        for name in ['아르바이트', '식사', '수면', '치료']:
            activity(name)
            if name == '아르바이트':
                page.get_by_role('button', name='물류 분류 (예시)', exact=False).click()
            elif name == '식사':
                click('무료 급식 · 항상 이용 가능')
            elif name == '수면':
                click('조건과 결과 확인')
            if name != '치료':
                click('선택 확인 (목업)')
                expect(page.get_by_role('heading', name='결과 화면 (목업)')).to_be_visible()
            layout()
        tab('상점'); layout()
        tab('채무'); layout()
        page.get_by_label('상환 희망 금액 (화면 예시)').fill('1000')
        click('상환 내용 확인')
        expect(page.get_by_text('상환 입력 화면만 연결했습니다.', exact=False)).to_be_visible()
        page.reload()
        tab('보관함')
        expect(page.get_by_text('아직 보유한 물품이 없습니다.', exact=False)).to_be_visible()
        expect(page.get_by_role('button', name='창고에서 찾은 오래된 라디오', exact=False).first).to_be_visible()
        layout()
        assert not errors, errors
        page.screenshot(path=f'work/foundation-{width}.png', full_page=True)
        results.append({'viewport': f'{width}x{height}', 'result': 'PASS'})
        page.close()
    browser.close()
    print(json.dumps(results))
