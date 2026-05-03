import { useEffect, useMemo, useState } from 'react'
import './AdminPanel.css'

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:9000'

const DEFAULT_SETTINGS = {
  oddeven_win_rate: 40,
  snail_win_rate_3: 30,
  snail_win_rate_5: 18,
  snail_win_rate_7: 12.85,
  snail_win_rate_10: 8,
}

const FILTERS = [
  { id: '', label: '전체' },
  { id: 'odd-even', label: '홀짝' },
  { id: 'snail', label: '달팽이' },
]

export default function AdminPanel({ onBack }) {
  const [password, setPassword] = useState('')
  const [adminKey, setAdminKey] = useState(sessionStorage.getItem('festival_admin_key') || '')
  const [summary, setSummary] = useState(null)
  const [gameResults, setGameResults] = useState([])
  const [resultFilter, setResultFilter] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [settingsEdits, setSettingsEdits] = useState(DEFAULT_SETTINGS)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [page, setPage] = useState(1)

  const PAGE_SIZE = 20

  const activeFilterLabel = useMemo(
    () => FILTERS.find(item => item.id === resultFilter)?.label || '전체',
    [resultFilter],
  )

  const totalPages = Math.max(1, Math.ceil(gameResults.length / PAGE_SIZE))
  const pagedResults = useMemo(
    () => gameResults.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [gameResults, page],
  )

  const request = async (path, options = {}) => {
    const res = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        'X-Admin-Key': adminKey || password,
        ...(options.headers || {}),
      },
    })
    if (!res.ok) {
      throw new Error(`admin request failed: ${res.status}`)
    }
    return res.json()
  }

  const loadSettings = async () => {
    if (!adminKey) return
    try {
      const data = await request('/admin/settings')
      setSettingsEdits({
        oddeven_win_rate: +(data.oddeven_win_rate * 100).toFixed(2),
        snail_win_rate_3: +(data.snail_win_rate_3 * 100).toFixed(2),
        snail_win_rate_5: +(data.snail_win_rate_5 * 100).toFixed(2),
        snail_win_rate_7: +(data.snail_win_rate_7 * 100).toFixed(2),
        snail_win_rate_10: +(data.snail_win_rate_10 * 100).toFixed(2),
      })
    } catch {
      // 설정 로드 실패 시 기본값 유지
    }
  }

  const saveSettings = async () => {
    setSettingsSaving(true)
    setError('')
    try {
      await request('/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          oddeven_win_rate: settingsEdits.oddeven_win_rate / 100,
          snail_win_rate_3: settingsEdits.snail_win_rate_3 / 100,
          snail_win_rate_5: settingsEdits.snail_win_rate_5 / 100,
          snail_win_rate_7: settingsEdits.snail_win_rate_7 / 100,
          snail_win_rate_10: settingsEdits.snail_win_rate_10 / 100,
        }),
      })
    } catch {
      setError('승률 저장에 실패했습니다.')
    } finally {
      setSettingsSaving(false)
    }
  }

  const loadSummary = async () => {
    if (!adminKey) return
    const data = await request('/admin/summary')
    setSummary(data)
  }

  const loadGameResults = async (gameType = resultFilter) => {
    if (!adminKey) return
    const params = new URLSearchParams({ limit: '10000' })
    if (gameType) params.set('game_type', gameType)
    const data = await request(`/results?${params.toString()}`)
    setGameResults(Array.isArray(data.results) ? data.results : [])
  }

  const loadAll = async (gameType = resultFilter) => {
    if (!adminKey) return
    setLoading(true)
    setError('')
    try {
      await Promise.all([
        loadSummary(),
        loadGameResults(gameType),
      ])
    } catch (err) {
      setError('관리자 데이터를 불러오지 못했습니다.')
      setAdminKey('')
      sessionStorage.removeItem('festival_admin_key')
    } finally {
      setLoading(false)
    }
  }

  const downloadCSV = () => {
    const filterLabel = FILTERS.find(f => f.id === resultFilter)?.label || '전체'
    const headers = ['시간', '게임', '배수', '결과', '선택', '승패', '상세']
    const rows = gameResults.map(item => {
      const multiplier = item.gameType === 'snail' && item.details?.snail_count
        ? `${item.details.snail_count}x`
        : '-'
      const detail = item.gameType === 'odd-even'
        ? `${item.details?.first_card ?? '?'}+${item.details?.second_card ?? '?'}=${item.details?.total ?? '?'}`
        : item.gameType === 'snail'
          ? `${item.details?.snail_count ?? '?'}마리`
          : ''
      return [item.createdAt, item.gameName, multiplier, item.resultText, item.userChoice || '-', item.isWin ? 'WIN' : 'LOSE', detail]
    })
    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `festival_${filterLabel}_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const login = async (event) => {
    event.preventDefault()
    setError('')
    try {
      const res = await fetch(`${API}/admin/login`, {
        method: 'POST',
        headers: { 'X-Admin-Key': password },
      })
      if (!res.ok) throw new Error('login failed')
      sessionStorage.setItem('festival_admin_key', password)
      setAdminKey(password)
      setPassword('')
    } catch (err) {
      setError('관리자 비밀번호가 올바르지 않습니다.')
    }
  }

  const changeFilter = async (gameType) => {
    setResultFilter(gameType)
    setPage(1)
    setLoading(true)
    setError('')
    try {
      await loadGameResults(gameType)
    } catch (err) {
      setError('게임별 결과를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const clearResults = async (gameType = '') => {
    const label = FILTERS.find(item => item.id === gameType)?.label || '전체'
    if (!window.confirm(`${label} 결과를 초기화할까요?`)) return
    setLoading(true)
    setError('')
    try {
      const qs = gameType ? `?game_type=${encodeURIComponent(gameType)}` : ''
      await request(`/admin/results${qs}`, { method: 'DELETE' })
      await loadAll(resultFilter)
      window.dispatchEvent(new Event('game-result-updated'))
    } catch (err) {
      setError('결과 초기화에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    sessionStorage.removeItem('festival_admin_key')
    setAdminKey('')
    setSummary(null)
    setGameResults([])
  }

  useEffect(() => {
    if (adminKey) {
      loadAll()
      loadSettings()
    }
  }, [adminKey])

  useEffect(() => {
    if (!adminKey) return undefined

    const intervalId = window.setInterval(() => {
      loadAll(resultFilter)
    }, 3000)

    return () => window.clearInterval(intervalId)
  }, [adminKey, resultFilter])

  if (!adminKey) {
    return (
      <main className="admin-page">
        <section className="admin-login">
          <h1>관리자 로그인</h1>
          <form onSubmit={login}>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="관리자 비밀번호"
              autoFocus
            />
            <button className="pixel-btn pixel-btn-cyan" type="submit">LOGIN</button>
          </form>
          {error && <p className="admin-error">{error}</p>}
          <button className="admin-text-btn" type="button" onClick={onBack}>메인으로</button>
        </section>
      </main>
    )
  }

  return (
    <main className="admin-page">
      <section className="admin-shell">
        <header className="admin-header">
          <div>
            <span>FESTIVAL ARCADE</span>
            <h1>관리자 페이지</h1>
          </div>
          <div className="admin-header-actions">
            <button className="pixel-btn pixel-btn-cyan" type="button" onClick={() => loadAll()} disabled={loading}>
              REFRESH
            </button>
            <button className="pixel-btn pixel-btn-pink" type="button" onClick={logout}>
              LOGOUT
            </button>
            <button className="pixel-btn pixel-btn-yellow" type="button" onClick={onBack}>
              MAIN
            </button>
          </div>
        </header>

        {error && <p className="admin-error">{error}</p>}

        <div className="admin-stat-grid">
          <article className="admin-stat">
            <span>총 플레이</span>
            <strong>{summary?.totalPlays ?? 0}</strong>
            <em>승률 {summary?.totalPlays
              ? Math.round((summary.byGame.reduce((s, g) => s + g.wins, 0) / summary.totalPlays) * 1000) / 10
              : 0}%</em>
          </article>
          {(summary?.byGame || []).map(game => (
            <article className="admin-stat" key={game.gameType}>
              <span>{game.gameType}</span>
              <strong>{game.plays}</strong>
              <em>승률 {game.winRate}%</em>
            </article>
          ))}
        </div>

        <section className="admin-settings">
          <h2>승률 설정</h2>
          <div className="admin-settings-grid">
            {[
              { key: 'oddeven_win_rate', label: '홀짝 게임' },
              { key: 'snail_win_rate_3', label: '달팽이 3마리' },
              { key: 'snail_win_rate_5', label: '달팽이 5마리' },
              { key: 'snail_win_rate_7', label: '달팽이 7마리' },
              { key: 'snail_win_rate_10', label: '달팽이 10마리' },
            ].map(({ key, label }) => (
              <label key={key} className="admin-settings-row">
                <span className="setting-label">{label}</span>
                <input
                  type="range"
                  min="0" max="100" step="0.1"
                  value={settingsEdits[key]}
                  onChange={(e) => setSettingsEdits(prev => ({ ...prev, [key]: +e.target.value }))}
                />
                <input
                  type="number"
                  min="0" max="100" step="0.1"
                  value={settingsEdits[key]}
                  onChange={(e) => setSettingsEdits(prev => ({ ...prev, [key]: +e.target.value }))}
                  className="setting-num-input"
                />
                <span className="setting-pct">%</span>
              </label>
            ))}
          </div>
          <div className="admin-settings-actions">
            <button
              className="pixel-btn pixel-btn-cyan"
              onClick={saveSettings}
              disabled={settingsSaving}
            >
              {settingsSaving ? 'SAVING...' : '승률 저장 SAVE'}
            </button>
            <button
              className="pixel-btn pixel-btn-pink"
              onClick={() => setSettingsEdits(DEFAULT_SETTINGS)}
              disabled={settingsSaving}
            >
              기본값으로 RESET
            </button>
          </div>
        </section>

        <div className="admin-actions">
          <button type="button" onClick={() => clearResults('odd-even')}>홀짝 결과 초기화</button>
          <button type="button" onClick={() => clearResults('snail')}>달팽이 결과 초기화</button>
          <button type="button" className="danger" onClick={() => clearResults()}>전체 결과 초기화</button>
        </div>

        <section className="admin-results">
          <div className="admin-results-head">
            <h2>{activeFilterLabel} 결과 보기</h2>

            <div className="admin-pagination">
              <button className="admin-page-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>◀</button>
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce((acc, p, idx, arr) => {
                  if (idx > 0 && p - arr[idx - 1] > 1) acc.push('…')
                  acc.push(p)
                  return acc
                }, [])
                .map((p, i) =>
                  p === '…'
                    ? <span key={`el-${i}`} className="admin-page-ellipsis">…</span>
                    : <button key={p} className={`admin-page-btn ${page === p ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                )}
              <button className="admin-page-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>▶</button>
              <span className="admin-page-info">{gameResults.length}건</span>
            </div>

            <button
              type="button"
              className="admin-download-btn"
              onClick={downloadCSV}
              disabled={gameResults.length === 0}
            >
              ⬇ 엑셀
            </button>

            <div className="admin-filter-tabs">
              {FILTERS.map(item => (
                <button
                  key={item.id}
                  type="button"
                  className={resultFilter === item.id ? 'active' : ''}
                  onClick={() => changeFilter(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="admin-result-list">
            {pagedResults.map(item => (
              <div className="admin-result-item" key={item.id}>
                <span>{item.createdAt}</span>
                <strong>
                  {item.gameName}
                  {item.gameType === 'snail' && item.details?.snail_count && (
                    <span className="admin-multiplier-badge">{item.details.snail_count}x</span>
                  )}
                </strong>
                <em>{item.resultText}</em>
                <small>{item.userChoice || '-'}</small>
                <b className={item.isWin ? 'win' : 'lose'}>{item.isWin ? 'WIN' : 'LOSE'}</b>
              </div>
            ))}
            {gameResults.length === 0 && (
              <p className="admin-empty">저장된 결과가 없습니다.</p>
            )}
          </div>
        </section>
      </section>
    </main>
  )
}
