const API = import.meta.env.VITE_API_URL ?? 'http://localhost:9000'

export async function getGameResults(gameType = null, limit = 30) {
  const params = new URLSearchParams({ limit: String(limit) })
  if (gameType) params.set('game_type', gameType)

  try {
    const res = await fetch(`${API}/results?${params.toString()}`)
    if (!res.ok) throw new Error(`results API error: ${res.status}`)
    const data = await res.json()
    return Array.isArray(data.results) ? data.results : []
  } catch (error) {
    console.error('게임 결과 조회 오류:', error)
    return []
  }
}

export function notifyGameResultUpdated() {
  window.dispatchEvent(new Event('game-result-updated'))
}

export async function clearGameResults() {
  console.warn('clearGameResults requires the admin page now.')
}
