import { useEffect, useMemo, useState } from 'react';
import { TitleScene } from './TitleScene';
import { GameOptions } from './GameOptions';
import { ActionConfirmation } from './ActionConfirmation';
import { preparePreferredAudio } from '../app/gameOptions';
import { useGameStore } from '../app/store';
import { SLOT_IDS, type SlotId } from '../storage/saveRepository';
import {
  DEFAULT_PLAYER,
  AVATARS,
  CLOTHING,
  HAIRSTYLES,
  OUTFITS,
  SKINS,
  type PlayerAppearance,
} from '../content/player';
import { isPlayer, playerOf } from '../domain/player';
import { weekOf, won } from '../domain/game';
import { PixelCharacter } from './PixelCharacter';

export function StartMenu() {
  const s = useGameStore();
  const [page, setPage] = useState<'home' | 'slots' | 'create' | 'settings'>(
    'home',
  );
  const [noSpace, setNoSpace] = useState(false);
  const [target, setTarget] = useState<SlotId>(1);
  useEffect(() => {
    window.scrollTo(0, 0);
    document.querySelector<HTMLElement>('.start-screen h1')?.focus();
  }, [page]);
  const [deleting, setDeleting] = useState<SlotId | null>(null);
  const [nickname, setNickname] = useState('');
  const [appearance, setAppearance] = useState<PlayerAppearance>({
    ...DEFAULT_PLAYER.appearance,
  });
  const player = { nickname: nickname.trim().normalize('NFKC'), appearance };
  const byRecency = s.slots
    .filter((slot) => slot.data)
    .sort((a, b) => b.updatedAt - a.updatedAt);
  const recent =
    byRecency.find((slot) => slot.data?.game.status === 'playing') ??
    byRecency[0];
  const heroPlayer = recent?.data ? playerOf(recent.data.game) : DEFAULT_PLAYER;
  function beginNew(id: SlotId) {
    setTarget(id);
    setNickname('');
    setAppearance({ ...DEFAULT_PLAYER.appearance });
    setPage('create');
  }
  function chooseEmpty() {
    const free = SLOT_IDS.find(
      (id) =>
        !s.slots.some((slot) => slot.id === id && (slot.data || slot.error)),
    );
    if (free) beginNew(free);
    else {
      setNoSpace(true);
      setPage('slots');
    }
  }
  function back() {
    setDeleting(null);
    setPage(page === 'create' ? 'slots' : 'home');
  }
  const deletePrompt = useMemo(() => {
    if (deleting === null) return null;
    const record = s.slots.find((slot) => slot.id === deleting);
    const name = record?.data
      ? playerOf(record.data.game).nickname
      : '저장 데이터';
    return {
      title: `슬롯 ${deleting} 삭제`,
      detail: `${name}의 진행을 삭제할까요?`,
      label: '삭제',
      tone: 'danger' as const,
    };
  }, [deleting, s.slots]);

  return (
    <main
      className={`start-screen${page === 'home' ? ' start-home' : ''}`}
      aria-busy={s.slotBusy}
      onKeyDown={(event) => {
        if (
          event.key === 'Escape' &&
          page !== 'home' &&
          !s.slotBusy &&
          deleting === null
        ) {
          event.preventDefault();
          back();
        }
      }}
    >
      {page === 'home' ? (
        <>
          <div className="start-hero">
            <TitleScene appearance={heroPlayer.appearance} />
            <h1 tabIndex={-1}>시작하기</h1>
          </div>
          <nav className="start-actions" aria-label="시작 메뉴">
            <button
              className="start-menu-button primary"
              aria-label="이어하기"
              disabled={!recent || s.slotBusy}
              onClick={() => {
                preparePreferredAudio();
                if (recent) void s.continueSlot(recent.id);
              }}
            >
              <span className="start-menu-marker" aria-hidden="true">
                ▶
              </span>
              <span>
                <strong>이어하기</strong>
                {recent?.data && (
                  <small>
                    슬롯 {recent.id} · {heroPlayer.nickname} ·{' '}
                    {weekOf(recent.data.game)}주차
                  </small>
                )}
              </span>
              <span className="start-menu-arrow" aria-hidden="true">
                ›
              </span>
            </button>
            <button
              className="start-menu-button"
              disabled={s.slotBusy}
              onClick={chooseEmpty}
            >
              <span className="start-menu-marker" aria-hidden="true">
                ＋
              </span>
              <strong>새로 시작</strong>
              <span className="start-menu-arrow" aria-hidden="true">
                ›
              </span>
            </button>
            <button
              className="start-menu-button"
              aria-label="저장 데이터"
              disabled={s.slotBusy}
              onClick={() => {
                setNoSpace(false);
                setPage('slots');
              }}
            >
              <span className="start-menu-marker" aria-hidden="true">
                ▤
              </span>
              <strong>저장 데이터</strong>
              <small className="start-slot-count">
                {s.slots.filter((slot) => slot.data || slot.error).length} / 3
              </small>
            </button>
            <button
              className="start-menu-button"
              disabled={s.slotBusy}
              onClick={() => setPage('settings')}
            >
              <span className="start-menu-marker" aria-hidden="true">
                ⚙
              </span>
              <strong>설정</strong>
              <span className="start-menu-arrow" aria-hidden="true">
                ›
              </span>
            </button>
          </nav>
        </>
      ) : page === 'slots' ? (
        <>
          <header className="start-heading">
            <button onClick={back} disabled={s.slotBusy}>
              ← 뒤로
            </button>
            <h1 tabIndex={-1}>저장 데이터</h1>
            <span className="slot-capacity">3개 슬롯</span>
          </header>
          {noSpace && (
            <p className="slots-full" role="status">
              사용 가능한 빈 슬롯이 없습니다.
            </p>
          )}
          <div className="save-slots">
            {SLOT_IDS.map((id) => {
              const slot = s.slots.find((slot) => slot.id === id);
              const saved = slot?.data;
              const p = saved ? playerOf(saved.game) : DEFAULT_PLAYER;
              const status = saved
                ? saved.game.status === 'playing'
                  ? '진행 중'
                  : saved.game.status === 'cleared'
                    ? '상환 완료'
                    : '종료'
                : slot?.error
                  ? '확인 필요'
                  : '비어 있음';
              return (
                <section
                  className="save-slot"
                  key={id}
                  aria-label={`슬롯 ${id}`}
                  data-state={
                    saved?.game.status ?? (slot?.error ? 'error' : 'empty')
                  }
                >
                  <div className="slot-top">
                    <span>슬롯 {String(id).padStart(2, '0')}</span>
                    <small>{status}</small>
                  </div>
                  {saved ? (
                    <>
                      <div className="slot-summary">
                        <div className="slot-portrait">
                          <PixelCharacter appearance={p.appearance} scale={2} />
                        </div>
                        <div>
                          <h2>{p.nickname}</h2>
                          <p>{weekOf(saved.game)}주차</p>
                        </div>
                      </div>
                      <dl className="slot-finances">
                        <div>
                          <dt>현금</dt>
                          <dd>{won(saved.game.cash)}</dd>
                        </div>
                        <div>
                          <dt>남은 채무</dt>
                          <dd>
                            {won(saved.game.principal + saved.game.interest)}
                          </dd>
                        </div>
                      </dl>
                      {slot.updatedAt > 0 && (
                        <time dateTime={new Date(slot.updatedAt).toISOString()}>
                          마지막 저장 ·{' '}
                          {new Intl.DateTimeFormat('ko-KR', {
                            timeZone: 'Asia/Seoul',
                            year: '2-digit',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false,
                          }).format(slot.updatedAt)}
                        </time>
                      )}
                      <button
                        className="action-button primary"
                        disabled={s.slotBusy}
                        onClick={() => {
                          preparePreferredAudio();
                          void s.continueSlot(id);
                        }}
                      >
                        이 슬롯 이어하기
                      </button>
                    </>
                  ) : slot?.error ? (
                    <p className="warning">{slot.error}</p>
                  ) : (
                    <div className="empty-slot-body">
                      <span aria-hidden="true">＋</span>
                      <p className="slot-empty">비어 있는 슬롯</p>
                      <button
                        className="action-button"
                        disabled={s.slotBusy}
                        onClick={() => beginNew(id)}
                      >
                        여기서 새로 시작
                      </button>
                    </div>
                  )}
                  {(saved || slot?.error) && (
                    <button
                      className="slot-delete"
                      disabled={s.slotBusy}
                      onClick={() => setDeleting(id)}
                    >
                      슬롯 삭제
                    </button>
                  )}
                </section>
              );
            })}
          </div>
        </>
      ) : page === 'settings' ? (
        <>
          <header className="start-heading">
            <button disabled={s.slotBusy} onClick={back}>
              ← 뒤로
            </button>
            <h1 tabIndex={-1}>설정</h1>
          </header>
          <GameOptions />
        </>
      ) : (
        <>
          <header className="start-heading">
            <button disabled={s.slotBusy} onClick={() => setPage('slots')}>
              ← 뒤로
            </button>
            <h1 tabIndex={-1}>새 캐릭터</h1>
          </header>
          <p className="create-slot-label">슬롯 {target}</p>
          <div className="create-preview" aria-label="캐릭터 미리보기">
            <PixelCharacter appearance={appearance} scale={4} />
            <strong>{player.nickname || '나의 캐릭터'}</strong>
          </div>
          <form
            className="character-form"
            onSubmit={async (e) => {
              e.preventDefault();
              if (isPlayer(player)) {
                preparePreferredAudio();
                await s.createSlot(target, player);
              }
            }}
          >
            <label>
              닉네임
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={12}
                placeholder="닉네임 입력"
                autoComplete="off"
                required
                disabled={s.slotBusy}
                aria-describedby="nickname-help"
              />
            </label>
            <small id="nickname-help">1~12자 · 문자, 숫자, 공백, _ . -</small>
            {(['avatar', 'hair', 'clothing', 'outfit', 'skin'] as const).map(
              (key) => {
                const options: { id: string; label: string; color?: string }[] =
                  ['avatar', 'hair', 'clothing'].includes(key)
                    ? Object.entries(
                        key === 'avatar'
                          ? AVATARS
                          : key === 'clothing'
                            ? CLOTHING
                            : HAIRSTYLES,
                      ).map(([id, label]) => ({
                        id,
                        label,
                      }))
                    : Object.entries(key === 'outfit' ? OUTFITS : SKINS).map(
                        ([id, palette]) => ({
                          id,
                          label: palette.label,
                          color: palette.main,
                        }),
                      );
                return (
                  <fieldset key={key} disabled={s.slotBusy}>
                    <legend>
                      {key === 'avatar'
                        ? '아바타'
                        : key === 'clothing'
                          ? '옷 종류'
                          : key === 'hair'
                            ? '헤어'
                            : key === 'outfit'
                              ? '옷 색상'
                              : '피부색'}
                    </legend>
                    <div className="appearance-options">
                      {options.map((option) => (
                        <label key={option.id}>
                          <input
                            type="radio"
                            name={key}
                            value={option.id}
                            checked={appearance[key] === option.id}
                            onChange={() =>
                              setAppearance({ ...appearance, [key]: option.id })
                            }
                          />
                          <span>
                            {option.color && (
                              <i
                                className="appearance-swatch"
                                aria-hidden="true"
                                style={{ backgroundColor: option.color }}
                              />
                            )}
                            {option.label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                );
              },
            )}
            <button
              className="action-button primary"
              type="submit"
              disabled={s.slotBusy || !isPlayer(player)}
            >
              이 캐릭터로 시작
            </button>
          </form>
        </>
      )}
      {s.saveError && (
        <p className="warning" role="alert">
          {s.saveError}
        </p>
      )}
      <p className="start-local">이 기기에 저장됩니다</p>
      <ActionConfirmation
        confirmation={{
          pending: deletePrompt,
          cancel: () => setDeleting(null),
          confirm: async () => {
            const id = deleting;
            setDeleting(null);
            if (id !== null && (await s.deleteSlot(id))) setNoSpace(false);
          },
        }}
      />
    </main>
  );
}
