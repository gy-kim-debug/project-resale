import { useLayoutEffect, useRef, useState } from 'react';
import { dialogueChoices, dialogueOpening } from '../domain/tradeDialogue';
import { canPurchaseOffer } from '../domain/purchaseBargaining';
import { won, type Item } from '../domain/game';
import type { DialogueTopic } from '../content/tradeDialogue';
import type { Act } from '../app/store';
import { TradeChat } from './TradeChat';
import { ItemArt } from './ItemArt';

const labels: Record<DialogueTopic, string> = {
  greet: '인사하기',
  condition: '상태 물어보기',
  contents: '구성품·자료',
  feature: '상품 특징',
  reason: '판매 이유',
  background: '사용 배경',
  detail: '더 자세히 묻기',
  thanks: '감사 인사',
  quickDeal: '빠른 거래 제안',
  eventAccept: '조건 확인했어요',
  eventDecline: '조금 더 살펴볼게요',
};
export function SellerConversation({
  item,
  act,
  onProduct,
}: {
  item: Item;
  act: Act;
  onProduct: () => void;
}) {
  const [panel, setPanel] = useState<'questions' | 'offers'>('questions');
  const root = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const container = root.current?.closest('.sheet-content');
    if (container) container.scrollTop = 0;
    const choices = root.current?.querySelector('.conversation-choices');
    if (choices) choices.scrollTop = 0;
  }, [item.chat?.length, panel]);
  const choices = dialogueChoices(item);
  const offers = canPurchaseOffer(item) ? item.offers : [];
  const pending = choices.some((c) => c.id === 'eventAccept');
  return (
    <section
      ref={root}
      className="seller-conversation"
      aria-label="판매자와 대화"
    >
      <header className="conversation-header">
        <span className="conversation-avatar" aria-hidden="true">
          {item.seller.slice(0, 1)}
        </span>
        <strong>{item.seller}</strong>
        <button type="button" onClick={onProduct}>
          상품 보기
        </button>
        {item.chat && !item.chatSettled && (
          <button
            className="conversation-end"
            type="button"
            onClick={() => act({ type: 'closeChat', id: item.id })}
          >
            대화 종료
          </button>
        )}
      </header>
      <div className="conversation-product">
        <ItemArt item={item} />
        <span>
          <strong>{item.title}</strong>
          <b>
            {item.price === 0
              ? '무료나눔'
              : won(item.negotiatedPrice ?? item.price)}
          </b>
        </span>
      </div>
      <TradeChat
        name={item.seller}
        messages={item.chat ?? dialogueOpening(item)}
      />
      <div className="conversation-composer">
        {(choices.length > 0 || offers.length > 0) && (
          <>
            <div
              className="conversation-tabs"
              role="group"
              aria-label="대화 메뉴"
            >
              <button
                type="button"
                aria-pressed={panel === 'questions'}
                onClick={() => setPanel('questions')}
              >
                질문{pending && <i aria-label="답변 대기" />}
              </button>
              <button
                type="button"
                aria-pressed={panel === 'offers'}
                onClick={() => setPanel('offers')}
              >
                가격 제안{offers.length > 0 && <span>{offers.length}</span>}
              </button>
            </div>
            <div className="conversation-choices">
              {panel === 'questions' ? (
                choices.length ? (
                  <div
                    className={`dialogue-options ${pending ? 'dialogue-response' : ''}`}
                    role="group"
                    aria-label="대화 선택지"
                  >
                    {choices.map((choice) => (
                      <button
                        type="button"
                        key={choice.id}
                        title={choice.text}
                        onClick={() =>
                          act({
                            type: 'dialogue',
                            id: item.id,
                            topic: choice.id,
                          })
                        }
                      >
                        {labels[choice.id]}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="conversation-empty">질문을 모두 나눴습니다.</p>
                )
              ) : offers.length ? (
                <div
                  className="offer-options"
                  role="group"
                  aria-label="가격 제안 선택지"
                >
                  {offers.map((price) => (
                    <button
                      type="button"
                      key={price}
                      onClick={() => act({ type: 'offer', id: item.id, price })}
                    >
                      {won(price)}
                      <small>제안하기</small>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="conversation-empty">
                  {item.negotiation === 'accepted'
                    ? '가격에 합의했습니다.'
                    : '제안할 수 있는 가격이 없습니다.'}
                </p>
              )}
            </div>
          </>
        )}
        {item.chatSettled && (
          <p className="chat-ended">
            {item.purchaseBargain?.walked
              ? '판매자가 거래를 종료했습니다.'
              : '대화 종료'}
          </p>
        )}
      </div>
    </section>
  );
}
