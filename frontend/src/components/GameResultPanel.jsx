import { useEffect, useState } from 'react'
import {
  getGameResults,
} from './GameResultStorage'
import './GameResultPanel.css'

const SNAIL_NAMES  = ['핑쿠루', '아쿠아', '골져스', '그린이', '퍼푸리', '오란줴줴이', '레드썬', '민트초코', '흰둥이', '스카이']
const SNAIL_COLORS = ['#ff4da6', '#00e5ff', '#ffd700', '#39ff14', '#b44fff', '#ff8c00', '#ff4444', '#44ff88', '#ffffff', '#88ffff']

function getItemColor(item) {
  if (item.gameType === 'odd-even') {
    return item.resultText === '홀' ? '#ff4da6' : '#00e5ff'
  }
  if (item.gameType === 'snail') {
    const name = item.resultText.replace(' 우승', '')
    const idx = SNAIL_NAMES.indexOf(name)
    if (idx !== -1) return SNAIL_COLORS[idx]
  }
  return null
}

export default function GameResultPanel({
  gameType = null,
  title = '게임 결과',
}) {
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const PANEL_LIMIT = 15

  const loadResults = async () => {
    const data = await getGameResults(gameType, PANEL_LIMIT)
    setResults(data.slice(0, PANEL_LIMIT))
  }

  useEffect(() => {
    loadResults()

    window.addEventListener('game-result-updated', loadResults)
    window.addEventListener('storage', loadResults)

    return () => {
      window.removeEventListener('game-result-updated', loadResults)
      window.removeEventListener('storage', loadResults)
    }
  }, [gameType])

  return (
    <>
      <button className="grp-toggle-btn" onClick={() => setOpen(o => !o)}>
        {open ? '✕' : '결과'}
      </button>

      {open && <div className="grp-backdrop" onClick={() => setOpen(false)} />}

      <aside className={`game-result-sidebar${open ? ' grp-open' : ''}`}>
        <div className="game-result-sidebar-header">
          <h2>{title}</h2>
          <button className="grp-close-btn" onClick={() => setOpen(false)}>✕</button>
        </div>

        <div className="game-result-sidebar-body">
          {results.length === 0 ? (
            <p className="game-result-empty">
              아직 표시할 결과가 없습니다.
            </p>
          ) : (
            <ul className="game-result-list">
              {results.map((item, index) => {
                const color = getItemColor(item)
                return (
                  <li
                    key={item.id}
                    className="game-result-item"
                    style={color ? {
                      borderColor: color,
                      backgroundColor: `${color}18`,
                      boxShadow: `2px 2px 0 #000, 0 0 6px ${color}44`,
                    } : undefined}
                  >
                    <span className="game-result-index">{index + 1}.</span>
                    <span className="game-result-value" style={color ? { color } : undefined}>
                      {item.resultText}
                      {item.gameType === 'snail' && item.details?.snail_count && (
                        <span className="game-result-multiplier">{item.details.snail_count}x</span>
                      )}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </aside>
    </>
  )
}
