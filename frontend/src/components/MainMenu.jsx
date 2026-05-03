import './MainMenu.css'

const STARS = Array.from({ length: 40 }, (_, i) => ({
  id: i,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: Math.random() * 3 + 1,
  delay: Math.random() * 2,
}))

const GAMES = [
  {
    id: 'oddeven',
    title: '홀짝',
    subtitle: 'ODD & EVEN',
    icon: '🃏',
    desc: ['카드 두 장의 합이', '홀수? 짝수?', '맞춰봐!'],
    marqueeColor: '#b80000',
    marqueeBorder: '#ff3a1a',
    titleColor: '#ffd700',
    screenBg: '#0f0000',
    btnClass: 'pixel-btn-yellow',
  },
  {
    id: 'snail',
    title: '룰렛 달팽이',
    subtitle: 'SNAIL RACING',
    icon: '🐌',
    desc: ['룰렛을 돌려 달팽이를', '소환하고 1등을', '골라봐!'],
    marqueeColor: '#003580',
    marqueeBorder: '#0077ff',
    titleColor: '#00e5ff',
    screenBg: '#00050f',
    btnClass: 'pixel-btn-cyan',
  },
]

function MenuGameCard({ game, onClick }) {
  return (
    <div className="mgc-wrap">
      <div
        className="mgc-marquee"
        style={{
          background: `linear-gradient(180deg, ${game.marqueeColor} 0%, #000 100%)`,
          borderColor: game.marqueeBorder,
        }}
      >
        <div className="mgc-stars">★ ★ ★ ★ ★ ★ ★ ★ ★ ★</div>
        <div className="mgc-title" style={{ color: game.titleColor }}>{game.title}</div>
        <div className="mgc-sub">{game.subtitle}</div>
        <div className="mgc-stars">★ ★ ★ ★ ★ ★ ★ ★ ★ ★</div>
      </div>

      <div className="mgc-screen" style={{ background: game.screenBg }}>
        <div className="crt-lines" />
        <div className="mgc-icon">{game.icon}</div>
        <div className="mgc-desc">
          {game.desc.map((line, i) => <div key={i}>{line}</div>)}
        </div>
      </div>

      <div className="mgc-foot" style={{ borderColor: game.marqueeBorder }}>
        <button className={`pixel-btn ${game.btnClass} mgc-play-btn`} onClick={onClick}>
          PLAY →
        </button>
      </div>
    </div>
  )
}

function LegacyMainMenu({ onSelect }) {
  return (
    <div className="main-menu">
      {STARS.map(s => (
        <div key={s.id} className="star"
          style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.size, height: s.size, animationDelay: `${s.delay}s` }}
        />
      ))}

      <div className="big-arcade">
        {/* LED strip */}
        <div className="big-cab-leds">
          {Array.from({ length: 18 }).map((_, i) => (
            <div key={i} className="big-cab-led"
              style={{ background: i % 2 === 0 ? '#ffd700' : '#ff4da6', animationDelay: `${i * 0.09}s` }}
            />
          ))}
        </div>

        {/* Marquee */}
        <div className="big-cab-marquee">
          <div className="big-marquee-name">Comso_pparK</div>
          <div className="big-marquee-arcade">ARCADE</div>
        </div>

        {/* Mid: side ears + screen */}
        <div className="big-cab-mid">
          <div className="big-cab-ear">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="ear-detail" />)}
          </div>

          <div className="big-cab-screen">
            <div className="crt-lines" />
            <div className="menu-game-cards">
              {GAMES.map(g => (
                <MenuGameCard key={g.id} game={g} onClick={() => onSelect(g.id)} />
              ))}
            </div>
          </div>

          <div className="big-cab-ear">
            {Array.from({ length: 5 }).map((_, i) => <div key={i} className="ear-detail" />)}
          </div>
        </div>

        {/* Control panel */}
        <div className="big-cab-controls">
          <div className="joystick-wrap">
            <div className="joy-base" />
            <div className="joy-shaft" />
            <div className="joy-ball" style={{ background: '#ff0000' }} />
          </div>
                    <div className="joystick-wrap">
            <div className="joy-base" />
            <div className="joy-shaft" />
            <div className="joy-ball" style={{ background: '#2b00ff' }} />
          </div>
          <div className="insert-coin">▶ Choice Game ◀</div>
                    <div className="joystick-wrap">
            <div className="joy-base" />
            <div className="joy-shaft" />
            <div className="joy-ball" style={{ background: '#00ffb3' }} />
          </div>
          <div className="joystick-wrap">
            <div className="joy-base" />
            <div className="joy-shaft" />
            <div className="joy-ball" style={{ background: '#00ff37' }} />
            
          </div>
        </div>

        {/* Coin area */}
        <div className="big-cab-coin-area">
          <div className="coin-slot" />
          <span className="coin-label">── Good Luck! ──</span>
          <div className="coin-slot" />
        </div>

        {/* Base / legs */}
        <div className="big-cab-base">
          <div className="big-cab-leg" />
          <div className="big-cab-leg" />
        </div>
      </div>

      <div className="footer-text">© 2025 FESTIVAL ARCADE · Depf : ComputerSoftWare</div>
    </div>
  )
}

const MENU_STARS = Array.from({ length: 48 }, (_, i) => ({
  id: i,
  x: (i * 29) % 100,
  y: (i * 47) % 100,
  size: (i % 3) + 1,
  delay: (i % 7) * 0.22,
}))

const MENU_GAMES = [
  {
    id: 'oddeven',
    title: '홀짝 게임',
    subtitle: 'ODD & EVEN',
    icon: '◆',
    desc: '카드 합의 홀짝을 맞춰보세요',
    accent: '#ff3d88',
    glow: 'rgba(255, 61, 136, 0.55)',
  },
  {
    id: 'snail',
    title: '룰렛 달팽이',
    subtitle: 'SNAIL RACING',
    icon: '🐌',
    desc: '룰렛 배당과 달팽이 경주를 즐겨보세요',
    accent: '#00e5ff',
    glow: 'rgba(0, 229, 255, 0.5)',
  },
]

function ScreenGameButton({ game, onClick }) {
  return (
    <button
      type="button"
      className="screen-game-button"
      style={{
        '--game-accent': game.accent,
        '--game-glow': game.glow,
      }}
      onClick={onClick}
    >
      <span className="screen-game-icon">{game.icon}</span>
      <span className="screen-game-text">
        <strong>{game.title}</strong>
        <small>{game.subtitle}</small>
        <em>{game.desc}</em>
      </span>
    </button>
  )
}

function ButtonCluster({ side }) {
  return (
    <div className={`cab-button-cluster ${side}`}>
      <button type="button" className="cab-button red" aria-label={`${side} red arcade button`} />
      <button type="button" className="cab-button pink" aria-label={`${side} pink arcade button`} />
      <button type="button" className="cab-button blue" aria-label={`${side} blue arcade button`} />
      <button type="button" className="cab-button red low" aria-label={`${side} lower red arcade button`} />
      <button type="button" className="cab-button pink low" aria-label={`${side} lower pink arcade button`} />
      <button type="button" className="cab-button blue low" aria-label={`${side} lower blue arcade button`} />
    </div>
  )
}

function Joystick({ side }) {
  return (
    <div className={`cab-joystick ${side}`}>
      <span className="stick-shadow" />
      <span className="stick-slot" />
      <span className="stick-stem" />
      <span className="stick-ball" />
    </div>
  )
}

export default function MainMenu({ onSelect }) {
  return (
    <div className="main-menu">
      <div className="menu-bg-grid" />
      <div className="menu-glow magenta" />
      <div className="menu-glow blue" />
      <div className="arcade-neon-field" aria-hidden="true">
        <span className="neon-runner runner-a" />
        <span className="neon-runner runner-b" />
        <span className="neon-runner runner-c" />
        <span className="neon-sign sign-left">PLAY</span>
        <span className="neon-sign sign-right">WIN</span>
        <span className="neon-ring ring-left" />
        <span className="neon-ring ring-right" />
      </div>

      {MENU_STARS.map(s => (
        <div
          key={s.id}
          className="star"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: s.size,
            height: s.size,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}

      <section className="reference-cabinet" aria-label="Festival arcade main menu">
        <div className="cab-side left" />
        <div className="cab-side right" />

        <div className="cab-top-halo" />
        <div className="cab-roof">
          <span className="roof-line l1" />
          <span className="roof-line l2" />
          <span className="roof-line l3" />
          <span className="roof-line l4" />
        </div>

        <div className="cab-speaker-panel">
          <div className="cab-speaker"><span /></div>
          <div className="cab-brand">
            <span>2026 FESTIVAL</span>
            <strong>ARCADE</strong>
          </div>
          <div className="cab-speaker"><span /></div>
        </div>

        <div className="cab-screen-shell">
          <div className="cab-screen-bezel">
            <div className="cab-crt-screen">
              <div className="crt-lines" />
              <div className="screen-shine" />
              <div className="screen-title">
                <span>GAME CHOICE</span>
                <strong>Comso_pPparK</strong>
              </div>
              <div className="screen-game-list">
                {MENU_GAMES.map(game => (
                  <ScreenGameButton
                    key={game.id}
                    game={game}
                    onClick={() => onSelect(game.id)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="cab-control-panel">
          <div className="panel-sheen" />
          <Joystick side="left" />
          <ButtonCluster side="left" />
          <div className="control-center">
            <span className="coin-note">Good Luck!</span>
            <span className="coin-slots"><i /><i /></span>
          </div>
          <Joystick side="right" />
          <ButtonCluster side="right" />
        </div>

        <div className="cab-lower">
          <span className="lower-line a" />
          <span className="lower-line b" />
          <span className="lower-line c" />
          <span className="coin-door left" />
          <span className="coin-door right" />
        </div>

        <div className="cab-legs">
          <span />
          <span />
        </div>
      </section>

      <div className="footer-text">
        2026 FESTIVAL ARCADE · Dept. Computer Software
        <button type="button" className="admin-entry-btn" onClick={() => onSelect('admin')}>
          ADMIN
        </button>
      </div>
    </div>
  )
}
