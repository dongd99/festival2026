import { useState, useEffect, useRef } from 'react'
import './SnailRacing.css'
import { notifyGameResultUpdated } from './GameResultStorage'
import GameResultPanel from './GameResultPanel'
import ArcadeFrame from './ArcadeFrame'
import StarField from './StarField'
const API = import.meta.env.VITE_API_URL ?? 'http://localhost:9000'

// ─────────────────────────────────────────────────────────
// 이미지 설정: frontend/public/ 폴더에 파일을 넣고 경로를 지정하세요.
// null 이면 기본 스타일 사용
const SCREEN_BG = 'https://i.pinimg.com/736x/ac/8b/02/ac8b023583e668ac5503ca4f01f432ca.jpg'   // 게임 화면 배경 (예: '/snail-bg.jpg')
// ─────────────────────────────────────────────────────────
const SNAIL_COLORS = ['#ff4da6', '#00e5ff', '#ffd700', '#39ff14', '#b44fff', '#ff8c00', '#ff4444', '#44ff88', '#ffffff', '#88ffff']
const SNAIL_NAMES = ['핑쿠루', '아쿠아', '골져스', '그린이', '퍼푸리', '오란줴줴이', '레드썬', '민트초코', '흰둥이', '스카이']

const ROULETTE_SEGMENTS = [3, 5, 7, 10, 3, 5, 7, 10]
const SEG_COLORS = ['#ff4da6', '#b44fff', '#00e5ff', '#ffd700', '#ff4da6', '#b44fff', '#00e5ff', '#ffd700']
const SEG_ANGLE = 360 / ROULETTE_SEGMENTS.length

// ── Roulette wheel ──────────────────────────────────────────────────────────
// BUG FIX: result is passed in BEFORE spinning starts, so animation knows
//          where to stop from the very first frame.
// BUG FIX: Single conic-gradient on the wheel div instead of stacked segment
//          divs that were all covering each other.
function Roulette({ spinning, result }) {
  const fromAngleRef = useRef(0)
  const [displayAngle, setDisplayAngle] = useState(0)
  const animRef = useRef(null)

  useEffect(() => {
    if (!spinning || result === null) return

    cancelAnimationFrame(animRef.current)

    const segIndex = ROULETTE_SEGMENTS.indexOf(result)
    // Spin clockwise: bring center of segment `segIndex` to the top pointer
    const targetDelta = 360 * 6 + (360 - segIndex * SEG_ANGLE - SEG_ANGLE / 2)
    const startAngle = fromAngleRef.current
    const duration = 4000
    let startTime = null

    const animate = (ts) => {
      if (!startTime) startTime = ts
      const elapsed = ts - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 4)
      const current = startAngle + targetDelta * eased
      setDisplayAngle(current)
      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate)
      } else {
        fromAngleRef.current = startAngle + targetDelta
      }
    }

    animRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animRef.current)
  }, [spinning, result])

  const gradient = SEG_COLORS
    .map((c, i) => `${c} ${i * SEG_ANGLE}deg ${(i + 1) * SEG_ANGLE}deg`)
    .join(', ')

  return (
    <div className="roulette-wrapper">
      <div className="roulette-pointer">▼</div>
      <div
        className="roulette-wheel"
        style={{
          background: `conic-gradient(${gradient})`,
          transform: `rotate(${displayAngle}deg)`,
        }}
      >
        {ROULETTE_SEGMENTS.map((val, i) => (
          <div
            key={i}
            className="wheel-label"
            style={{ transform: `rotate(${i * SEG_ANGLE + SEG_ANGLE / 2}deg) translateY(-65px)` }}
          >
            {val}x
          </div>
        ))}
        <div className="roulette-center">GO!</div>
      </div>
    </div>
  )
}

// ── Snail track ─────────────────────────────────────────────────────────────
function SnailTrack({ snails, chosen, racing, timeline, onSelect, phase, onRaceEnd }) {
  const [positions, setPositions] = useState([])
  const [finishOrder, setFinishOrder] = useState([])

  useEffect(() => {
    if (!racing) {
      setPositions(snails.map(() => 0))
      setFinishOrder([])
      return
    }

    if (!timeline?.frames?.length) return

    let frameIndex = 0
    const interval = setInterval(() => {
      const frame = timeline.frames[frameIndex]
      setPositions(frame.positions)
      setFinishOrder(frame.finish_order || [])

      frameIndex += 1
      if (frameIndex >= timeline.frames.length) {
        clearInterval(interval)
        setTimeout(() => onRaceEnd?.(), 250)
      }
    }, timeline.tick_ms || 80)

    return () => clearInterval(interval)
  }, [racing, timeline, snails.length])

  return (
    <div className="snail-tracks">
      {snails.map((_, i) => (
        <div
          key={i}
          className={`snail-track ${chosen === i ? 'chosen' : ''} ${phase === 'pick' ? 'pickable' : ''}`}
          style={{
            backgroundColor: chosen === i && phase === 'racing'
              ? `${SNAIL_COLORS[i]}cc`
              : `${SNAIL_COLORS[i]}22`,
            borderColor: chosen === i && phase === 'racing'
              ? `${SNAIL_COLORS[i]}ff`
              : `${SNAIL_COLORS[i]}88`,
            boxShadow: chosen === i
              ? `0 0 18px ${SNAIL_COLORS[i]}aa`
              : `0 0 8px ${SNAIL_COLORS[i]}44`
          }}
          onClick={() => phase === 'pick' && onSelect(i)}
        >
          <div className="track-row">
            <div className="track-label">
              <span className="track-name" style={{ color: SNAIL_COLORS[i] }}>{SNAIL_NAMES[i]}</span>
            </div>

            <div
              className="track-lane"
              style={{
                backgroundColor: chosen === i && phase === 'racing'
                  ? `${SNAIL_COLORS[i]}99`
                  : `${SNAIL_COLORS[i]}18`,
                borderColor: chosen === i && phase === 'racing'
                  ? `${SNAIL_COLORS[i]}ff`
                  : `${SNAIL_COLORS[i]}66`
              }}
            >
              <div className="finish-line" />

              <div
                className="snail-runner"
                style={{ '--progress': positions[i] ?? 0 }}
              >
                <span className="snail-emoji">🐌</span>

                {finishOrder.indexOf(i) === 0 && <span className="rank-tag">🏆1st</span>}
                {finishOrder.indexOf(i) === 1 && <span className="rank-tag">🥈2nd</span>}
                {finishOrder.indexOf(i) === 2 && <span className="rank-tag">🥉3rd</span>}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}



function RouletteDialog({ open, multiplier }) {
  if (!open) return null
  return (
    <div className="result-dialog-backdrop">
      <div className="roulette-dialog">
        <div className="roulette-dialog-title">🎰 배당률 추첨!</div>
        <Roulette spinning={true} result={multiplier} />
        <div className="roulette-dialog-hint">룰렛이 멈추면 게임이 시작됩니다</div>
      </div>
    </div>
  )
}

function ResultDialog({ open, win, chosen, winner, onRetry, onBack }) {
  if (!open) return null

  return (
    <div className="result-dialog-backdrop">
      <div className={`result-dialog ${win ? 'win' : 'lose'}`}>
        <div className="result-emoji">{win ? '🏆' : '💀'}</div>

        <div className="result-title">
          {win ? 'YOU WIN!' : 'GAME OVER'}
        </div>

        <div className="result-detail">
          {win
            ? `${SNAIL_NAMES[chosen]} 달팽이가 1등!`
            : `1등: ${winner !== null ? SNAIL_NAMES[winner] : '?'} 달팽이`}
        </div>

        <div className="result-actions">
          <button
            className="pixel-btn pixel-btn-yellow"
            onClick={onRetry}
          >
            다시하기 RETRY
          </button>

          {/* <button
            className="pixel-btn pixel-btn-cyan"
            onClick={onBack}
          >
            메뉴로 MENU
          </button> */}
        </div>
      </div>
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────
const PHASES = { START: 'start', SPINNING: 'spinning', PICK: 'pick', RACING: 'racing', RESULT: 'result' }

export default function SnailRacing({ onBack }) {
  const [phase, setPhase] = useState(PHASES.START)
  const [multiplier, setMultiplier] = useState(null)
  const [snails, setSnails] = useState([])
  const [chosen, setChosen] = useState(null)
  const [winner, setWinner] = useState(null)
  const [win, setWin] = useState(false)
  const [gameId, setGameId] = useState(null)
  const [raceTimeline, setRaceTimeline] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // BUG FIX: fetch result BEFORE setting SPINNING phase so that
  //          the Roulette component receives `result` on its first render
  //          with spinning=true and can animate to the correct segment.
  const startSpin = async () => {
    try{
      console.log('spin start')
    const res = await fetch(`${API}/snail/spin`)
    if (!res.ok) {
      throw new Error(`spin API error: ${res.status}`)
    }
    const data = await res.json()
     console.log('spin result:', data)
     if (![3, 5, 7, 10].includes(data.multiplier)) {
      throw new Error(`invalid multiplier: ${data.multiplier}`)
    }
    setGameId(data.game_id)
    setMultiplier(data.multiplier)   // set FIRST
    setPhase(PHASES.SPINNING)        // then start animation
    setTimeout(() => {
      setSnails(Array.from({ length: data.multiplier }))
      setPhase(PHASES.PICK)
    }, 4500)
  }catch(err){
    console.log('룰렛 시작 실패:', err)
  }
  }

  const startRace = async () => {
    if (!gameId || submitting) return
    setSubmitting(true)
    try {
      const res = await fetch(`${API}/snail/race`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game_id: gameId, chosen })
      })
      if (!res.ok) throw new Error(`race error: ${res.status}`)
      const data = await res.json()
      setWinner(data.winner)
      setWin(data.win)
      setRaceTimeline(data.timeline)
      setPhase(PHASES.RACING)
    } catch (err) {
      console.error('레이스 실패:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const reset = () => {
    setPhase(PHASES.START)
    setMultiplier(null)
    setSnails([])
    setChosen(null)
    setWinner(null)
    setWin(false)
    setGameId(null)
    setRaceTimeline(null)
  }

return (
  <div className="game-page-layout">
    <StarField />
    <main className="game-play-area">
      <ArcadeFrame
        title="🐌 룰렛 달팽이"
        titleColor="var(--cyan)"
        accentColor="#003580"
        screenBg={SCREEN_BG}
        onBack={onBack}
        bottomSlot={phase === PHASES.START && (
          <button className="pixel-btn pixel-btn-yellow start-btn af-start-btn" onClick={startSpin}>
            ▶ GAME START
          </button>
        )}
      >
        <div className="instruction-bar">
          {phase === PHASES.START && '[ 게임 시작 버튼을 눌러주세요 ]'}
          {phase === PHASES.SPINNING && '[ 룰렛이 돌아가고 있습니다... ]'}
          {phase === PHASES.PICK && `[ ${multiplier}마리 달팽이 소환! 1마리를 선택하세요 ]`}
          {phase === PHASES.RACING && '[ 달팽이 레이싱 시작! ]'}
          {phase === PHASES.RESULT && '[ 결과를 확인하세요! ]'}
        </div>

        {(phase === PHASES.PICK || phase === PHASES.RACING || phase === PHASES.RESULT) && (
          <>
            {phase === PHASES.PICK && (
              <div className="pick-actions">
                <div className="pick-hint">
                  {chosen !== null
                    ? `${SNAIL_NAMES[chosen]}을(를) 선택했습니다!`
                    : '달팽이를 클릭해서 선택하세요'}
                </div>
                <button
                  className="pixel-btn pixel-btn-yellow start-btn"
                  onClick={startRace}
                  disabled={chosen === null || submitting}
                  style={{ opacity: chosen === null || submitting ? 0.4 : 1 }}
                >
                  ▶ RACE START!
                </button>
              </div>
            )}

            <div className="multiplier-badge">
              <span className="mult-num">{multiplier}x</span>
              <span className="mult-label">달팽이 {multiplier}마리!</span>
            </div>

            <SnailTrack
              snails={snails}
              chosen={chosen}
              racing={phase === PHASES.RACING}
              timeline={raceTimeline}
              onSelect={setChosen}
              phase={phase}
              onRaceEnd={() => {
                notifyGameResultUpdated()
                setPhase(PHASES.RESULT)
              }}
            />
          </>
        )}

      </ArcadeFrame>
    </main>

    <GameResultPanel gameType="snail" title="최근 15회 게임 결과" />
    <RouletteDialog open={phase === PHASES.SPINNING} multiplier={multiplier} />
    <ResultDialog open={phase === PHASES.RESULT} win={win} chosen={chosen} winner={winner} onBack={onBack} onRetry={reset}  />
  </div>
)
  
}
