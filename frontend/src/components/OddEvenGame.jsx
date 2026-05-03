import { useState } from 'react'
import './OddEvenGame.css'
import GameResultPanel from './GameResultPanel'
import { notifyGameResultUpdated } from './GameResultStorage.js'
import OddEvenRateBar from './OddEvenRateBar'
import ArcadeFrame from './ArcadeFrame'
import StarField from './StarField'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:9000'

// ─────────────────────────────────────────────────────────
// 이미지 설정: frontend/public/ 폴더에 파일을 넣고 경로를 지정하세요.
// null 이면 기본 스타일 사용
const CARD_BACK_IMAGE = '/CardBack.jpg'   // 카드 뒷면
const SCREEN_BG       = 'https://i.pinimg.com/736x/57/0b/dc/570bdc37ee2a4fa26e6196af13182a24.jpg'              // 게임 화면 배경 (예: '/oddeven-bg.jpg')
// ─────────────────────────────────────────────────────────

const PHASES = {
  DEAL: 'deal',
  FLIP_FIRST: 'flip_first',
  GUESS: 'guess',
  FLIP_SECOND: 'flip_second',
  RESULT: 'result',
}

const SUITS = ['♠', '♥', '♦', '♣']

function randomSuit() { return SUITS[Math.floor(Math.random() * SUITS.length)] }
function randomSuitExcluding(exclude) {
  const opts = SUITS.filter(s => s !== exclude)
  return opts[Math.floor(Math.random() * opts.length)]
}

function CardBack() {
  if (CARD_BACK_IMAGE) {
    return (
      <div className="card card-back" style={{
        backgroundImage: `url(${CARD_BACK_IMAGE})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }} />
    )
  }
  return (
    <div className="card card-back">
      <div className="card-pattern">
        {Array.from({ length: 16 }).map((_, i) => (
          <span key={i}>★</span>
        ))}
      </div>
    </div>
  )
}

function CardFront({ value, suit }) {
  const isRed = suit === '♥' || suit === '♦'
  const display = value === 1 ? 'A' : value

  return (
    <div className={`card card-front ${isRed ? 'red' : 'black'}`}>
      <div className="card-corner top-left">
        <div>{display}</div>
        <div>{suit}</div>
      </div>

      <div className="card-center-suit">{suit}</div>

      <div className="card-corner bottom-right">
        <div>{display}</div>
        <div>{suit}</div>
      </div>
    </div>
  )
}

function ResultDialog({ open, result, cards, guess, onRetry }) {
  if (!open || !result) return null
  const displayVal = v => v === 1 ? 'A' : v
  return (
    <div className="result-dialog-backdrop">
      <div className={`result-dialog ${result.win ? 'win' : 'lose'}`}>
        <div className="result-emoji">{result.win ? '🎉' : '💥'}</div>
        <div className="result-title">{result.win ? 'WIN!' : 'GAME OVER'}</div>
        <div className="result-detail">
          {displayVal(cards[0])} + {displayVal(cards[1])} = {result.total}
          <br />
          <span style={{ color: result.result === 'odd' ? 'var(--yellow)' : 'var(--cyan)' }}>
            {result.result === 'odd' ? '홀수 ODD' : '짝수 EVEN'}
          </span>
        </div>
        <div className="result-detail" style={{ fontSize: '11px', color: '#aaa' }}>
          내 예측: <span style={{ color: '#fff' }}>{guess === 'odd' ? '홀수 ODD' : '짝수 EVEN'}</span>
        </div>
        <div className="result-actions">
          <button className="pixel-btn pixel-btn-yellow" onClick={onRetry}>
            다시하기 RETRY
          </button>
        </div>
      </div>
    </div>
  )
}

export default function OddEvenGame({ onBack }) {
  const [phase, setPhase] = useState(PHASES.DEAL)
  const [cards, setCards] = useState([null, null])
  const [flipped, setFlipped] = useState([false, false])
  const [guess, setGuess] = useState(null)
  const [result, setResult] = useState(null)
  const [firstCard, setFirstCard] = useState(null)
  const [cardSuits, setCardSuits] = useState([null, null])
  const [busy, setBusy] = useState(false)
  const [gameId, setGameId] = useState(null)

  const deal = () => {
    setCards([null, null])
    setFlipped([false, false])
    setGuess(null)
    setResult(null)
    setFirstCard(null)
    setCardSuits([null, null])
    setBusy(false)
    setGameId(null)
    setPhase(PHASES.FLIP_FIRST)
  }

  const flipFirst = async (idx) => {
    if (phase !== PHASES.FLIP_FIRST || busy) return

    setBusy(true)

    try {
      const res = await fetch(`${API}/oddeven/first`)
      const data = await res.json()

      setGameId(data.game_id)

      setCards(prev => {
        const next = [...prev]
        next[idx] = data.card
        return next
      })

      setFirstCard(idx)

      const firstSuit = randomSuit()
      setCardSuits(prev => { const next = [...prev]; next[idx] = firstSuit; return next })

      setFlipped(prev => {
        const next = [...prev]
        next[idx] = true
        return next
      })

      setPhase(PHASES.GUESS)
    } catch (error) {
      console.error('첫 번째 카드 조회 오류:', error)
    } finally {
      setBusy(false)
    }
  }

  const makeGuess = (g) => {
    if (phase !== PHASES.GUESS) return

    setGuess(g)
    setPhase(PHASES.FLIP_SECOND)
  }

  const flipSecond = async (idx) => {
    if (phase !== PHASES.FLIP_SECOND || busy || idx === firstCard || !gameId) return

    setBusy(true)

    try {
      const res = await fetch(`${API}/oddeven/second`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game_id: gameId,
          guess,
        }),
      })

      const data = await res.json()

      setCards(prev => {
        const next = [...prev]
        next[idx] = data.card
        return next
      })

      const secondSuit = randomSuitExcluding(cardSuits[firstCard])
      setCardSuits(prev => { const next = [...prev]; next[idx] = secondSuit; return next })

      setFlipped([true, true])

      setTimeout(() => {
        setResult(data)

        notifyGameResultUpdated()

        setPhase(PHASES.RESULT)
        setBusy(false)
      }, 700)
    } catch (error) {
      console.error('두 번째 카드 조회 오류:', error)
      setBusy(false)
    }
  }

  const reset = () => {
    setPhase(PHASES.DEAL)
    setCards([null, null])
    setFlipped([false, false])
    setGuess(null)
    setResult(null)
    setFirstCard(null)
    setCardSuits([null, null])
    setBusy(false)
    setGameId(null)
  }

  return (
    <div className="game-page-layout">
      <StarField />
      <main className="game-play-area">
        <ArcadeFrame
          title="🃏 홀짝 게임"
          titleColor="var(--yellow)"
          accentColor="#b80000"
          screenBg={SCREEN_BG}
          onBack={onBack}
          bottomSlot={phase === PHASES.DEAL && (
            <button className="pixel-btn pixel-btn-yellow start-btn af-start-btn" onClick={deal}>
              ▶ GAME START
            </button>
          )}
        >
          <div className="instruction-bar">
            {phase === PHASES.DEAL && '[ 게임 시작 버튼을 눌러주세요 ]'}
            {phase === PHASES.FLIP_FIRST && '[ 카드 한 장을 선택해 뒤집으세요 ]'}
            {phase === PHASES.GUESS && '[ 홀수? 짝수? 예측하세요! ]'}
            {phase === PHASES.FLIP_SECOND && '[ 나머지 카드를 뒤집으세요 ]'}
            {phase === PHASES.RESULT && '[ 결과를 확인하세요! ]'}
          </div>

          <div className="cards-area">
            {[0, 1].map(idx => (
              <div
                key={idx}
                className={[
                  'card-wrapper',
                  phase === PHASES.FLIP_FIRST && !busy ? 'clickable pulse' : '',
                  phase === PHASES.FLIP_SECOND && idx !== firstCard && !busy ? 'clickable pulse' : '',
                  flipped[idx] ? 'flipped' : '',
                ].join(' ')}
                onClick={() => {
                  if (phase === PHASES.FLIP_FIRST) flipFirst(idx)
                  else if (phase === PHASES.FLIP_SECOND) flipSecond(idx)
                }}
              >
                <div className={`card-flip-inner ${flipped[idx] ? 'do-flip' : ''}`}>
                  <div className="card-face card-face-back"><CardBack /></div>
                  <div className="card-face card-face-front">
                    {cards[idx] !== null && <CardFront value={cards[idx]} suit={cardSuits[idx]} />}
                  </div>
                </div>
                {phase === PHASES.FLIP_FIRST && !busy && <div className="card-hint">클릭!</div>}
                {phase === PHASES.FLIP_SECOND && idx !== firstCard && !busy && <div className="card-hint">클릭!</div>}
              </div>
            ))}
          </div>

          <OddEvenRateBar />

          {phase === PHASES.GUESS && (
            <div className="guess-area">
              <div className="guess-label">두 카드의 합은?</div>
              <div className="guess-btns">
                <button
                  className={`pixel-btn guess-btn ${guess === 'odd' ? 'pixel-btn-yellow selected' : 'pixel-btn-purple'}`}
                  onClick={() => makeGuess('odd')}
                >홀수 ODD</button>
                <button
                  className={`pixel-btn guess-btn ${guess === 'even' ? 'pixel-btn-yellow selected' : 'pixel-btn-cyan'}`}
                  onClick={() => makeGuess('even')}
                >짝수 EVEN</button>
              </div>
            </div>
          )}

        </ArcadeFrame>
      </main>

      <GameResultPanel gameType="odd-even" title="최근 15회 게임 결과" />
      <ResultDialog open={phase === PHASES.RESULT} result={result} cards={cards} guess={guess} onRetry={reset} />
    </div>
  )
}
