import { useEffect, useState } from 'react'
import { getGameResults } from './GameResultStorage.js'
import './OddEvenRateBar.css'

export default function OddEvenRateBar() {
  const [results, setResults] = useState([])

  const loadResults = async () => {
    const data = await getGameResults('odd-even', 10000)
    setResults(data)
  }

  useEffect(() => {
    loadResults()

    window.addEventListener('game-result-updated', loadResults)

    return () => {
      window.removeEventListener('game-result-updated', loadResults)
    }
  }, [])

  const total = results.length
  const oddCount = results.filter(item => item.resultText === '홀').length
  const evenCount = results.filter(item => item.resultText === '짝').length

  const oddRate = total === 0 ? 0 : Math.round((oddCount / total) * 100)
  const evenRate = total === 0 ? 0 : Math.round((evenCount / total) * 100)

  return (
    <div className="odd-even-rate-box">
      <div className="rate-title">
        결과 비율
      </div>

      <div className="rate-row">
        <span className="rate-label">홀</span>

        <div className="rate-bar">
          <div
            className="rate-fill odd"
            style={{ width: `${oddRate}%` }}
          />
        </div>

        <span className="rate-text">
          {oddRate}%
        </span>
      </div>

      <div className="rate-row">
        <span className="rate-label">짝</span>

        <div className="rate-bar">
          <div
            className="rate-fill even"
            style={{ width: `${evenRate}%` }}
          />
        </div>

        <span className="rate-text">
          {evenRate}% 
        </span>
      </div>
    </div>
  )
}
