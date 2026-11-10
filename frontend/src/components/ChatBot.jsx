import { useEffect, useRef, useState } from 'react'
import './ChatBot.css'

// ─────────────────────────────────────────────────────────
// 규칙 기반 챗봇: 게임 방법 안내 + 보유 코인 기준 배팅 추천
// ─────────────────────────────────────────────────────────

// 배팅 추천 비율 (보유 코인 대비)
const BET_TIERS = [
  { key: 'safe', label: '안정형', ratio: 0.1, color: 'var(--green)' },
  { key: 'normal', label: '보통형', ratio: 0.15, color: 'var(--yellow)' },
  { key: 'bold', label: '도전형', ratio: 0.2, color: 'var(--pink)' },
]

const GUIDES = {
  oddeven: [
    '🃏 홀짝 게임 방법',
    '1. [게임 시작]을 누르면 카드 2장이 뒤집힌 채로 나와요.',
    '2. 카드 1장을 골라 클릭하면 앞면이 공개돼요.',
    '3. 두 카드 숫자의 합이 홀수일지 짝수일지 골라요.',
    '4. 나머지 카드를 클릭해 공개하면 결과가 나와요.',
    '5. 예측이 맞으면 WIN! 카드 숫자는 A(1)~10이에요.',
  ].join('\n'),
  snail: [
    '🐌 룰렛 달팽이 방법',
    '1. [게임 시작]을 누르면 룰렛이 돌아가요.',
    '2. 룰렛 결과(3x / 5x / 7x / 10x)만큼 달팽이가 나와요.',
    '3. 우승할 것 같은 달팽이 1마리를 클릭해서 골라요.',
    '4. [RACE START]를 누르면 경주가 시작돼요.',
    '5. 고른 달팽이가 1등이면 WIN! 배당률이 높을수록 달팽이가 많아서 맞히기 어려워요.',
  ].join('\n'),
}

const MAIN_OPTIONS = [
  { id: 'guide', label: '🎮 게임 방법' },
  { id: 'bet', label: '🪙 배팅 추천' },
]

const GUIDE_OPTIONS = [
  { id: 'guide_oddeven', label: '🃏 홀짝 게임' },
  { id: 'guide_snail', label: '🐌 룰렛 달팽이' },
  { id: 'home', label: '↩ 처음으로' },
]

const AFTER_OPTIONS = [
  { id: 'guide', label: '🎮 게임 방법' },
  { id: 'bet', label: '🪙 배팅 추천' },
]

const WELCOME = {
  from: 'bot',
  text: '안녕하세요! FESTIVAL ARCADE 도우미예요 🤖\n무엇을 도와드릴까요?',
  options: MAIN_OPTIONS,
}

function betRecommendation(coins) {
  const lines = BET_TIERS.map(t => {
    const amount = Math.max(1, Math.floor(coins * t.ratio))
    return { ...t, amount }
  })
  return {
    from: 'bot',
    text: `보유 코인 ${coins}개 기준 추천 배팅이에요.`,
    bets: lines,
    footer: '💡 한 판에 너무 많이 걸지 말고, 여러 판 나눠서 즐겨보세요!',
    options: AFTER_OPTIONS,
  }
}

// 자유 입력 키워드 → 동작
function matchIntent(text) {
  const t = text.replace(/\s/g, '').toLowerCase()
  if (/홀|짝|카드|oddeven/.test(t)) return 'guide_oddeven'
  if (/달팽이|룰렛|snail|경주|레이스/.test(t)) return 'guide_snail'
  if (/배팅|베팅|추천|코인|얼마|금액|bet/.test(t)) return 'bet'
  if (/방법|규칙|룰|어떻게|설명|guide|help/.test(t)) return 'guide'
  if (/처음|메뉴|home/.test(t)) return 'home'
  return null
}

export default function ChatBot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([WELCOME])
  const [input, setInput] = useState('')
  const [awaitingCoins, setAwaitingCoins] = useState(false)
  const bodyRef = useRef(null)

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight
  }, [messages, open])

  const push = (...msgs) => setMessages(prev => [...prev, ...msgs])

  const respond = (actionId) => {
    switch (actionId) {
      case 'guide':
        setAwaitingCoins(false)
        return { from: 'bot', text: '어떤 게임 방법이 궁금하세요?', options: GUIDE_OPTIONS }
      case 'guide_oddeven':
        setAwaitingCoins(false)
        return { from: 'bot', text: GUIDES.oddeven, options: GUIDE_OPTIONS }
      case 'guide_snail':
        setAwaitingCoins(false)
        return { from: 'bot', text: GUIDES.snail, options: GUIDE_OPTIONS }
      case 'bet':
        setAwaitingCoins(true)
        return { from: 'bot', text: '지금 가지고 있는 코인이 몇 개인가요?\n숫자로 입력해 주세요. (예: 30)' }
      case 'home':
      default:
        setAwaitingCoins(false)
        return { ...WELCOME, text: '무엇을 도와드릴까요?' }
    }
  }

  const handleOption = (opt) => {
    push({ from: 'user', text: opt.label }, respond(opt.id))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const text = input.trim()
    if (!text) return
    setInput('')

    const num = Number(text.replace(/[^0-9]/g, ''))
    const isNumberOnly = /^\s*\d[\d,]*\s*(개|코인)?\s*$/.test(text)

    if (awaitingCoins && isNumberOnly) {
      if (num <= 0) {
        push({ from: 'user', text }, { from: 'bot', text: '코인이 1개 이상 있어야 배팅할 수 있어요. 다시 입력해 주세요!' })
        return
      }
      setAwaitingCoins(false)
      push({ from: 'user', text }, betRecommendation(num))
      return
    }

    const intent = matchIntent(text)
    if (intent) {
      push({ from: 'user', text }, respond(intent))
      return
    }

    push(
      { from: 'user', text },
      awaitingCoins
        ? { from: 'bot', text: '보유 코인 수를 숫자로 입력해 주세요. (예: 30)' }
        : { from: 'bot', text: '잘 모르겠어요 😅 아래에서 골라 주세요!', options: MAIN_OPTIONS },
    )
  }

  return (
    <>
      {open && (
        <div className="chatbot-window" role="dialog" aria-label="게임 도우미 챗봇">
          <div className="chatbot-header">
            <span>🤖 ARCADE HELPER</span>
            <button className="chatbot-close" onClick={() => setOpen(false)} aria-label="닫기">✕</button>
          </div>

          <div className="chatbot-body" ref={bodyRef}>
            {messages.map((m, i) => {
              const isLast = i === messages.length - 1
              return (
                <div key={i} className={`chatbot-msg ${m.from}`}>
                  <div className="chatbot-bubble">
                    {m.text}
                    {m.bets && (
                      <div className="chatbot-bets">
                        {m.bets.map(b => (
                          <div key={b.key} className="chatbot-bet-row">
                            <span style={{ color: b.color }}>{b.label}</span>
                            <span className="chatbot-bet-ratio">{Math.round(b.ratio * 100)}%</span>
                            <span className="chatbot-bet-amount">{b.amount}코인</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {m.footer && <div className="chatbot-footer-note">{m.footer}</div>}
                  </div>
                  {m.options && isLast && (
                    <div className="chatbot-options">
                      {m.options.map(opt => (
                        <button key={opt.id} className="chatbot-option" onClick={() => handleOption(opt)}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <form className="chatbot-input" onSubmit={handleSubmit}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={awaitingCoins ? '보유 코인 수 입력' : '질문을 입력하세요'}
              inputMode={awaitingCoins ? 'numeric' : 'text'}
            />
            <button type="submit" className="pixel-btn pixel-btn-cyan">전송</button>
          </form>
        </div>
      )}

      <button
        className={`chatbot-fab ${open ? 'open' : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-label={open ? '챗봇 닫기' : '챗봇 열기'}
      >
        {open ? '✕' : '💬'}
      </button>
    </>
  )
}
