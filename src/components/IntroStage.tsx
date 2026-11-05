import type { PlayerAppearance } from '../content/player';
import type { IntroShot } from '../content/intro';
import { PixelCharacter } from './PixelCharacter';

function Basement() {
  return (
    <>
      <rect width="240" height="128" fill="#20272b" />
      <rect y="95" width="240" height="33" fill="#272729" />
      <path
        d="M0 94h240M0 115h240M38 95v33M148 95v33"
        stroke="#3b3834"
        strokeWidth="2"
      />
      <path
        d="M14 0v33h8v18M225 0v60h-8v20"
        fill="none"
        stroke="#444c45"
        strokeWidth="5"
      />
      {[12, 27, 58, 179, 193, 217].map((x, n) => (
        <rect
          key={x}
          x={x}
          y={n % 2 ? 73 : 82}
          width={n % 2 ? 12 : 7}
          height={n % 2 ? 14 : 9}
          fill="#343b2e"
        />
      ))}
      <rect x="83" y="6" width="74" height="29" fill="#525c56" />
      <rect x="87" y="10" width="66" height="21" fill="#687578" />
      <path d="M87 20h66M120 10v21" stroke="#303c3d" strokeWidth="3" />
      <rect x="13" y="87" width="83" height="16" fill="#55564b" />
      <rect x="17" y="101" width="7" height="13" fill="#34352f" />
      <rect x="20" y="81" width="24" height="9" fill="#777367" />
      <rect x="42" y="83" width="48" height="15" fill="#4c5c5d" />
      <rect x="172" y="76" width="52" height="6" fill="#6c5743" />
      <path d="M178 82v30M216 82v30" stroke="#453d32" strokeWidth="4" />
      <rect x="193" y="71" width="15" height="3" fill="#8a826a" />
      <rect x="5" y="106" width="8" height="11" fill="#5a5d56" />
      <path d="M5 106h8" stroke="#93958b" strokeWidth="2" />
    </>
  );
}
function Home({ open = false }: { open?: boolean }) {
  return (
    <>
      <rect width="240" height="128" fill="#454139" />
      <rect y="99" width="240" height="29" fill="#342e2c" />
      <rect x="143" y="9" width="59" height="93" fill="#1c2227" />
      <rect
        x={open ? 181 : 147}
        y="13"
        width={open ? 17 : 51}
        height="89"
        fill="#74634b"
      />
      {open && <path d="M145 102h52l36 26H100z" fill="#bba57b" opacity=".22" />}
      <rect x={open ? 183 : 187} y="57" width="3" height="5" fill="#c8b17b" />
      <rect x="14" y="18" width="68" height="48" fill="#5a574b" />
      <rect x="18" y="22" width="60" height="40" fill="#2b3539" />
      <path d="M48 22v40M18 43h60" stroke="#696757" strokeWidth="3" />
      <rect x="18" y="83" width="48" height="21" fill="#5d5144" />
    </>
  );
}
function Phone({ shot }: { shot: IntroShot }) {
  return (
    <>
      <rect width="240" height="128" fill="#151c24" />
      <path
        d="M0 104L48 81l38 18 49 29H0zM240 104l-42-24-32 27-21 21h95z"
        fill="#ad8060"
      />
      <g
        className={
          shot === 'debt' || shot === 'listing' ? 'intro-phone-ring' : ''
        }
      >
        <rect x="49" y="3" width="142" height="128" rx="8" fill="#45515d" />
        <rect x="54" y="8" width="132" height="118" fill="#111b29" />
        <rect x="103" y="9" width="34" height="3" fill="#4e5a64" />
        <text x="64" y="28" fill="#a5b4c4" fontSize="8">
          {shot === 'debt'
            ? '채권자'
            : shot === 'balance'
              ? '계좌 잔액'
              : '중고거래 알림'}
        </text>
        {shot === 'debt' ? (
          <>
            <rect
              className="intro-message intro-message-one"
              x="62"
              y="36"
              width="115"
              height="28"
              fill="#30313a"
            />
            <text
              className="intro-message intro-message-one"
              x="68"
              y="47"
              fill="#c7b9b6"
              fontSize="7"
            >
              남은 채무
            </text>
            <text
              className="intro-message intro-message-one"
              x="68"
              y="58"
              fill="#ffb09b"
              fontSize="9"
            >
              10,000,000,000원
            </text>
            <g className="intro-message intro-message-two">
              <rect x="62" y="69" width="115" height="17" fill="#30313a" />
              <text x="68" y="80" fill="#e0d6d0" fontSize="7">
                이번 주 상환 기한을 잊지 마세요.
              </text>
            </g>
            <g className="intro-message intro-message-three">
              <rect x="62" y="91" width="115" height="22" fill="#30313a" />
              <text x="68" y="101" fill="#cbbfb8" fontSize="7">
                유예 기간 이후
              </text>
              <text x="68" y="110" fill="#cbbfb8" fontSize="7">
                납부액이 늘어납니다.
              </text>
            </g>
          </>
        ) : shot === 'balance' ? (
          <>
            <text
              x="120"
              y="65"
              textAnchor="middle"
              fill="#e1e6df"
              fontSize="18"
              fontWeight="700"
            >
              500,000원
            </text>
            <path d="M65 80h110" stroke="#354047" />
            <rect x="67" y="92" width="46" height="5" fill="#26313d" />
            <rect x="146" y="92" width="26" height="5" fill="#26313d" />
          </>
        ) : (
          <g className="intro-listing-card">
            <rect x="62" y="37" width="115" height="78" fill="#223c37" />
            <rect x="69" y="46" width="32" height="28" fill="#7c654c" />
            <path d="M69 53h32M85 46v28" stroke="#bd9e72" strokeWidth="3" />
            <text x="107" y="53" fill="#8ee4bf" fontSize="8">
              급처
            </text>
            <text x="107" y="67" fill="#e6e9df" fontSize="8">
              이사 정리
            </text>
            <text x="69" y="88" fill="#e6e9df" fontSize="8">
              이사 때문에 급하게
            </text>
            <text x="69" y="100" fill="#e6e9df" fontSize="8">
              정리합니다.
            </text>
          </g>
        )}
      </g>
    </>
  );
}
export function IntroStage({
  shot,
  appearance,
}: {
  shot: IntroShot;
  appearance: PlayerAppearance;
}) {
  const child = (
    <g transform="translate(68 70) scale(1.1)">
      <PixelCharacter appearance={appearance} scale={1} />
    </g>
  );
  return (
    <div
      key={shot}
      className={`story-stage intro-stage intro-shot-${shot}`}
      data-intro-shot={shot}
      aria-hidden="true"
    >
      <svg viewBox="0 0 240 128" shapeRendering="crispEdges" focusable="false">
        {['debt', 'balance', 'listing'].includes(shot) ? (
          <Phone shot={shot} />
        ) : shot === 'window' ? (
          <>
            <rect width="240" height="128" fill="#1c252a" />
            <rect x="25" y="20" width="190" height="67" fill="#536363" />
            <rect x="30" y="25" width="180" height="57" fill="#74878b" />
            <g className="intro-passer">
              <path
                d="M50 20v29l-8 12h24l-4-12V20M110 20v31l-3 10h25l-10-12V20"
                fill="#2d383d"
              />
            </g>
            <g className="intro-traffic">
              <circle cx="175" cy="55" r="19" fill="#263039" />
              <circle cx="175" cy="55" r="10" fill="#697379" />
              <rect x="150" y="19" width="83" height="13" fill="#394950" />
            </g>
            <path d="M120 25v57M30 53h180" stroke="#34454a" strokeWidth="5" />
            <g className="intro-rain" stroke="#b6c7c8" opacity=".5">
              {[38, 67, 93, 141, 166, 192].map((x) => (
                <path key={x} d={`M${x} 26l-5 18m2 10l-5 18`} />
              ))}
            </g>
            <rect y="89" width="240" height="39" fill="#222b2d" />
            <path
              d="M3 0v72h11v19"
              fill="none"
              stroke="#3b4945"
              strokeWidth="6"
            />
            <rect
              className="intro-drip"
              x="12"
              y="96"
              width="2"
              height="4"
              fill="#b1beb8"
            />
          </>
        ) : ['family', 'departure', 'child'].includes(shot) ? (
          <>
            <Home open={shot !== 'family'} />
            <g className={shot === 'child' ? 'intro-lonely-child' : ''}>
              {child}
            </g>
            {shot !== 'child' && (
              <g
                className={
                  shot === 'departure' ? 'intro-parents-leave' : 'intro-parents'
                }
              >
                <g transform="translate(123 36) scale(2)">
                  <PixelCharacter variant="trader" scale={1} />
                </g>
                <g transform="translate(177 40) scale(1.85)">
                  <PixelCharacter
                    appearance={{
                      ...appearance,
                      avatar: 'female',
                      hair: 'long',
                      clothing: 'coat',
                      outfit: 'amber',
                    }}
                    scale={1}
                  />
                </g>
                <rect x="170" y="88" width="14" height="17" fill="#574b40" />
                <path
                  d="M173 88v-4h8v4"
                  fill="none"
                  stroke="#aa9271"
                  strokeWidth="2"
                />
              </g>
            )}
            {shot === 'child' && (
              <rect width="240" height="128" fill="#030913" opacity=".58" />
            )}
          </>
        ) : shot === 'door' ? (
          <>
            <rect width="240" height="128" fill="#2e302f" />
            <g className="intro-knock-door">
              <rect x="46" y="-8" width="148" height="142" fill="#695844" />
              <path d="M56 0v128M184 0v128" stroke="#403b33" strokeWidth="4" />
              <rect x="164" y="59" width="9" height="16" fill="#ad9467" />
              <rect x="96" y="27" width="48" height="7" fill="#352f2c" />
            </g>
            <path
              d="M0 120l63-30 17 38M240 120l-55-30-19 38"
              fill="#0a1019"
              opacity=".7"
            />
            <text
              className="intro-knock-word"
              x="119"
              y="78"
              textAnchor="middle"
              fill="#dfd2b7"
              fontSize="24"
              fontWeight="700"
            >
              쿵.
            </text>
          </>
        ) : shot === 'contract' ? (
          <>
            <rect width="240" height="128" fill="#41382f" />
            <path d="M0 17h240M0 98h240" stroke="#51463a" strokeWidth="2" />
            <g transform="rotate(-5 120 64)">
              <rect x="58" y="9" width="128" height="112" fill="#cbc0a4" />
              <text x="76" y="28" fill="#4b443b" fontSize="9">
                채무 상환 약정서
              </text>
              <path
                d="M73 40h94M73 49h84M73 58h90M73 67h66M73 95h68"
                stroke="#958b78"
                strokeWidth="2"
              />
              <path
                className="intro-signature"
                d="M83 88l8-10 4 12 7-8 6 9 6-13 6 11h17"
                fill="none"
                stroke="#353f4c"
                strokeWidth="2"
              />
              <g className="intro-stamp">
                <rect
                  x="141"
                  y="79"
                  width="27"
                  height="27"
                  fill="none"
                  stroke="#974b43"
                  strokeWidth="2"
                />
                <path
                  d="M147 85h15v15h-15zM154 85v15M147 92h15"
                  fill="none"
                  stroke="#974b43"
                  strokeWidth="2"
                />
              </g>
            </g>
            <path
              className="intro-pen"
              d="M192 118l-48-37-8 2 2 7 44 38"
              fill="#b48c69"
            />
            <path d="M140 82l-21-20 4-3 22 20" fill="#273649" />
          </>
        ) : shot === 'resolve' ? (
          <>
            <rect width="240" height="128" fill="#101b24" />
            <g className="intro-face" transform="translate(48 -8) scale(6)">
              <PixelCharacter appearance={appearance} scale={1} />
            </g>
            <path d="M46 128l20-36h108l20 36" fill="#69bea6" opacity=".18" />
            <rect x="90" y="99" width="62" height="35" fill="#52796f" />
            <rect x="95" y="103" width="52" height="29" fill="#99dec3" />
          </>
        ) : (
          <>
            <g className={shot === 'wake' ? 'intro-wake-camera' : ''}>
              <Basement />
              {shot === 'wake' ? (
                <g className="intro-waking">
                  <g transform="translate(48 30) scale(2)">
                    <PixelCharacter appearance={appearance} scale={1} />
                  </g>
                </g>
              ) : (
                <g className="intro-hero-exit">
                  <g transform="translate(106 37) scale(2)">
                    <PixelCharacter
                      appearance={appearance}
                      animated
                      scale={1}
                    />
                  </g>
                </g>
              )}
              {shot === 'exit' && (
                <>
                  <rect x="222" y="31" width="18" height="65" fill="#b6cbbe" />
                  <path
                    className="intro-door-light"
                    d="M222 96L112 128h128V31z"
                    fill="#b6cbbe"
                    opacity=".25"
                  />
                </>
              )}
            </g>
          </>
        )}
      </svg>
      <div className="intro-vignette" />
      <span className="intro-scene-caption">
        {['family', 'door', 'departure', 'child'].includes(shot)
          ? '십여 년 전'
          : shot === 'contract'
            ? '그 후, 어느 날'
            : ''}
      </span>
    </div>
  );
}
