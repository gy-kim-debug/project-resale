import { useEffect, useState } from 'react';
import { useGameStore } from '../app/store';
import { SLOT_IDS, type SlotId } from '../storage/saveRepository';
import {
  DEFAULT_PLAYER,
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
  const [page, setPage] = useState<'home' | 'slots' | 'create'>('home');
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
  const recent = s.slots
    .filter((slot) => slot.data)
    .sort((a, b) => b.updatedAt - a.updatedAt)[0];
  const heroPlayer = recent?.data ? playerOf(recent.data.game) : DEFAULT_PLAYER;
  function chooseEmpty() {
    const free = SLOT_IDS.find(
      (id) =>
        !s.slots.some((slot) => slot.id === id && (slot.data || slot.error)),
    );
    if (free) {
      setTarget(free);
      setPage('create');
    } else setPage('slots');
  }
  return (
    <main className="start-screen" aria-busy={s.slotBusy}>
      {page === 'home' ? (
        <>
          <div className="start-hero">
            <div className="start-city" aria-hidden="true" />
            <PixelCharacter appearance={heroPlayer.appearance} scale={4} />
            <h1 tabIndex={-1}>시작하기</h1>
          </div>
          {recent?.data && (
            <section className="resume-summary">
              <strong>{heroPlayer.nickname}</strong>
              <span>
                슬롯 {recent.id} · {weekOf(recent.data.game)}주차
              </span>
              <b>{won(recent.data.game.cash)}</b>
            </section>
          )}
          <div className="start-actions">
            <button
              className="action-button primary"
              disabled={!recent || s.slotBusy}
              onClick={() => recent && void s.continueSlot(recent.id)}
            >
              이어하기
            </button>
            <button
              className="action-button"
              disabled={s.slotBusy}
              onClick={chooseEmpty}
            >
              새로 시작
            </button>
            <button
              className="start-secondary"
              disabled={s.slotBusy}
              onClick={() => setPage('slots')}
            >
              저장 슬롯{' '}
              <span>
                {s.slots.filter((slot) => slot.data || slot.error).length}/3
              </span>
            </button>
          </div>
        </>
      ) : page === 'slots' ? (
        <>
          <header className="start-heading">
            <button
              onClick={() => {
                setPage('home');
                setDeleting(null);
              }}
              disabled={s.slotBusy}
            >
              ← 뒤로
            </button>
            <h1 tabIndex={-1}>저장 슬롯</h1>
          </header>
          <div className="save-slots">
            {SLOT_IDS.map((id) => {
              const slot = s.slots.find((slot) => slot.id === id);
              const saved = slot?.data;
              const p = saved ? playerOf(saved.game) : DEFAULT_PLAYER;
              return (
                <section
                  className="save-slot"
                  key={id}
                  aria-label={`슬롯 ${id}`}
                >
                  <div className="slot-top">
                    <span>슬롯 {id}</span>
                    {saved && (
                      <small>
                        {saved.game.status === 'playing'
                          ? '진행 중'
                          : saved.game.status === 'cleared'
                            ? '상환 완료'
                            : '종료'}
                      </small>
                    )}
                  </div>
                  {saved ? (
                    <>
                      <div className="slot-summary">
                        <PixelCharacter appearance={p.appearance} scale={2} />
                        <div>
                          <h2>{p.nickname}</h2>
                          <p>
                            {weekOf(saved.game)}주차 · {won(saved.game.cash)}
                          </p>
                          <small>
                            남은 채무{' '}
                            {won(saved.game.principal + saved.game.interest)}
                          </small>
                        </div>
                      </div>
                      {slot.updatedAt > 0 && (
                        <time dateTime={new Date(slot.updatedAt).toISOString()}>
                          {new Date(slot.updatedAt).toLocaleString('ko-KR')}
                        </time>
                      )}
                      <button
                        className="action-button primary"
                        disabled={s.slotBusy}
                        onClick={() => void s.continueSlot(id)}
                      >
                        이 슬롯 이어하기
                      </button>
                    </>
                  ) : slot?.error ? (
                    <p className="warning">{slot.error}</p>
                  ) : (
                    <>
                      <p className="slot-empty">비어 있는 슬롯</p>
                      <button
                        className="action-button"
                        disabled={s.slotBusy}
                        onClick={() => {
                          setTarget(id);
                          setPage('create');
                        }}
                      >
                        여기서 새로 시작
                      </button>
                    </>
                  )}
                  {(saved || slot?.error) &&
                    (deleting === id ? (
                      <div className="slot-delete-confirm">
                        <p>
                          슬롯 {id}
                          {saved ? ` · ${p.nickname}` : ''}의 진행을 삭제할까요?
                        </p>
                        <button
                          className="action-button danger"
                          disabled={s.slotBusy}
                          onClick={async () => {
                            if (await s.deleteSlot(id)) setDeleting(null);
                          }}
                        >
                          슬롯 {id} 삭제 확정
                        </button>
                        <button
                          className="start-secondary"
                          disabled={s.slotBusy}
                          onClick={() => setDeleting(null)}
                        >
                          취소
                        </button>
                      </div>
                    ) : (
                      <button
                        className="slot-delete"
                        disabled={s.slotBusy}
                        onClick={() => setDeleting(id)}
                      >
                        슬롯 삭제
                      </button>
                    ))}
                </section>
              );
            })}
          </div>
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
              if (isPlayer(player)) await s.createSlot(target, player);
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
            {(['hair', 'outfit', 'skin'] as const).map((key) => {
              const options =
                key === 'hair'
                  ? Object.entries(HAIRSTYLES).map(([id, label]) => ({
                      id,
                      label,
                    }))
                  : Object.entries(key === 'outfit' ? OUTFITS : SKINS).map(
                      ([id, palette]) => ({ id, label: palette.label }),
                    );
              return (
                <fieldset key={key} disabled={s.slotBusy}>
                  <legend>
                    {key === 'hair'
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
                        <span>{option.label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              );
            })}
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
    </main>
  );
}
