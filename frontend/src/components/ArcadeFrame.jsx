import './ArcadeFrame.css'

export default function ArcadeFrame({
  title,
  titleColor = 'var(--yellow)',
  accentColor = '#4a3f7a',
  onBack,
  children,
  bottomSlot,
  screenBg,
}) {
  return (
    <div className="af-machine" style={{ '--af-accent': accentColor }}>
      <div className="af-side left" />
      <div className="af-side right" />

      <div className="af-roof">
        <span className="af-roof-line l1" />
        <span className="af-roof-line l2" />
        <span className="af-roof-line l3" />
        <span className="af-roof-line l4" />
      </div>

      <div className="af-speaker-panel">
        <div className="af-speaker"><span /></div>

        <div className="af-marquee">
          <button className="pixel-btn pixel-btn-pink af-back-btn" onClick={onBack}>
            BACK
          </button>
          <div className="af-marquee-title" style={{ color: titleColor }}>{title}</div>
          <div className="af-back-spacer" />
        </div>

        <div className="af-speaker"><span /></div>
      </div>

      <div className="af-screen-shell">
        <div className="af-screen-bezel">
          <div
            className="af-screen"
            style={screenBg ? {
              backgroundImage: `url(${screenBg})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            } : undefined}
          >
            <div className="crt-lines" />
            <div className="af-content">{children}</div>
          </div>
        </div>
      </div>

      <div className={`af-bottom-slot ${bottomSlot ? '' : 'af-bottom-slot-empty'}`}>
        {bottomSlot}
      </div>

      <div className="af-controls">
        <div className="af-panel-sheen" />
        <div className="joystick-wrap">
          <div className="joy-base" />
          <div className="joy-shaft" />
          <div className="joy-ball" style={{ background: accentColor }} />
        </div>

        <div className="af-action-btns">
          <div className="af-action-btn" style={{ background: accentColor }} />
          <div className="af-action-btn" style={{ background: 'var(--yellow)' }} />
          <div className="af-action-btn" style={{ background: 'var(--pink)' }} />
        </div>

        <div className="af-center-note">
          <span>INSERT COIN</span>
          <div className="af-mini-slots"><i /><i /></div>
        </div>

        <div className="joystick-wrap">
          <div className="joy-base" />
          <div className="joy-shaft" />
          <div className="joy-ball" style={{ background: 'var(--yellow)' }} />
        </div>

        <div className="af-action-btns">
          <div className="af-action-btn" style={{ background: 'var(--pink)' }} />
          <div className="af-action-btn" style={{ background: accentColor }} />
          <div className="af-action-btn" style={{ background: 'var(--yellow)' }} />
        </div>
      </div>

      <div className="af-lower">
        <span className="af-lower-line a" />
        <span className="af-lower-line b" />
        <span className="af-lower-line c" />
        <span className="af-coin-door left" />
        <span className="af-coin-door right" />
      </div>

      <div className="af-base">
        <div className="af-leg" />
        <div className="af-leg" />
      </div>
    </div>
  )
}
