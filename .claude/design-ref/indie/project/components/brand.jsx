// Brand analysis + 3 logo concepts + 3 art directions

const BrandIntro = () => (
  <div style={{
    width: 920, padding: 56, background: '#0B0B0C', color: '#E8E6E1',
    fontFamily: 'Inter, system-ui, sans-serif', borderRadius: 0,
    border: '1px solid #1F1F22'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32, fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.18em', color: '#9A8F7A', textTransform: 'uppercase' }}>
      <span style={{ width: 6, height: 6, background: '#D4A24A', borderRadius: '50%', boxShadow: '0 0 12px #D4A24A' }} />
      INDIERADAR / BRAND BRIEF / 2026
    </div>
    <h1 style={{ fontSize: 56, lineHeight: 1.12, fontWeight: 300, letterSpacing: '-0.02em', margin: '0 0 28px', fontFamily: 'Fraunces, Georgia, serif' }}>
      <span style={{ display: 'block' }}>A signal terminal for</span>
      <span style={{ display: 'block' }}><span style={{ fontStyle: 'italic', color: '#D4A24A' }}>indie operators</span> who intend to win.</span>
    </h1>
    <p style={{ fontSize: 17, lineHeight: 1.6, color: '#A8A39B', maxWidth: 720, margin: '0 0 40px', fontWeight: 400 }}>
      IndieRadar scans Indie Hackers, Reddit, X, Hacker News, Product Hunt and the AI monetization underground, isolates the cases that are actually making money, and re-broadcasts them across nine languages — built for builders who treat global signal as raw material.
    </p>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, background: '#1F1F22', border: '1px solid #1F1F22', marginBottom: 40 }}>
      {[
        ['NOT', 'A blog. A feed. Another newsletter.', '#5C5852'],
        ['IS', 'A monetization intelligence terminal.', '#D4A24A'],
        ['FOR', 'Builders who ship in public, in any language.', '#7BA88F'],
      ].map(([k, v, c]) => (
        <div key={k} style={{ background: '#0B0B0C', padding: '24px 24px 28px' }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.2em', color: c, marginBottom: 10 }}>{k}</div>
          <div style={{ fontSize: 16, color: '#E8E6E1', lineHeight: 1.4 }}>{v}</div>
        </div>
      ))}
    </div>

    <div style={{ borderTop: '1px solid #1F1F22', paddingTop: 32 }}>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.2em', color: '#9A8F7A', marginBottom: 16 }}>CURRENT STATE / DIAGNOSIS</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24 }}>
        {[
          ['BRAND', ['雷アイコンに必然性なし', 'IndieRadar固有の空気感が弱い', 'ヘッダー/フッター汎用', 'グローバル感が出ていない']],
          ['INFO ARCH', ['記事=リスト止まり', 'sourceの意味づけ不在', 'AI翻訳が裏方扱い', 'フィルターが汎用UI']],
          ['EXPERIENCE', ['ヒーローの熱量不足', 'empty stateが寂しい', '読む理由が立っていない', '行動への転化が弱い']],
        ].map(([h, items]) => (
          <div key={h}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#D4A24A', marginBottom: 12 }}>{h}</div>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 13, lineHeight: 1.7, color: '#A8A39B' }}>
              {items.map(i => <li key={i} style={{ paddingLeft: 14, position: 'relative' }}>
                <span style={{ position: 'absolute', left: 0, color: '#5C5852' }}>—</span>{i}
              </li>)}
            </ul>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ─── Logo Concepts ────────────────────────────────────────
const LogoCard = ({ name, jp, desc, children, code }) => (
  <div style={{
    width: 360, height: 460, background: '#0B0B0C', border: '1px solid #1F1F22',
    fontFamily: 'Inter, system-ui, sans-serif', color: '#E8E6E1',
    display: 'flex', flexDirection: 'column'
  }}>
    <div style={{ padding: '14px 18px', borderBottom: '1px solid #1F1F22', display: 'flex', justifyContent: 'space-between', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.18em', color: '#9A8F7A' }}>
      <span>{code}</span><span>SVG · FAVICON-READY</span>
    </div>
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(circle at 50% 50%, #141416 0%, #0B0B0C 70%)' }}>
      {children}
    </div>
    <div style={{ padding: 20, borderTop: '1px solid #1F1F22' }}>
      <div style={{ fontSize: 18, fontFamily: 'Fraunces, serif', fontWeight: 400, marginBottom: 2 }}>{name}</div>
      <div style={{ fontSize: 11, color: '#9A8F7A', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.1em', marginBottom: 10 }}>{jp}</div>
      <div style={{ fontSize: 12, color: '#A8A39B', lineHeight: 1.55 }}>{desc}</div>
    </div>
  </div>
);

const Logo1 = () => (
  // Concentric arcs + ascending dot — radar sweep + opportunity rising
  <svg width="180" height="180" viewBox="0 0 180 180">
    <defs>
      <radialGradient id="g1" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#D4A24A" stopOpacity="0" />
        <stop offset="80%" stopColor="#D4A24A" stopOpacity="0.08" />
      </radialGradient>
    </defs>
    <circle cx="90" cy="100" r="78" fill="url(#g1)" />
    {[28, 50, 72].map((r, i) => (
      <path key={i} d={`M ${90 - r} 100 A ${r} ${r} 0 0 1 ${90 + r} 100`}
        fill="none" stroke="#E8E6E1" strokeWidth={i === 0 ? 1.5 : 1} strokeOpacity={0.3 + i * 0.15} />
    ))}
    <line x1="90" y1="100" x2="138" y2="52" stroke="#D4A24A" strokeWidth="1.5" />
    <circle cx="138" cy="52" r="5" fill="#D4A24A" />
    <circle cx="138" cy="52" r="11" fill="none" stroke="#D4A24A" strokeOpacity="0.4" />
    <text x="90" y="158" textAnchor="middle" fontFamily="Fraunces, serif" fontSize="14" fill="#E8E6E1" letterSpacing="2">IndieRadar</text>
  </svg>
);

const Logo2 = () => (
  // Aperture / scan-mark — a precise scanning instrument
  <svg width="180" height="180" viewBox="0 0 180 180">
    <g transform="translate(90 90)">
      {[0, 60, 120, 180, 240, 300].map(a => (
        <line key={a} x1="0" y1="-46" x2="0" y2="-58"
          stroke="#E8E6E1" strokeOpacity="0.4" strokeWidth="1.2"
          transform={`rotate(${a})`} />
      ))}
      <circle r="42" fill="none" stroke="#E8E6E1" strokeWidth="1.2" strokeOpacity="0.5" />
      <circle r="22" fill="none" stroke="#D4A24A" strokeWidth="1.2" />
      <line x1="-6" y1="-22" x2="-6" y2="22" stroke="#D4A24A" strokeWidth="1.2" />
      <line x1="6" y1="-22" x2="6" y2="22" stroke="#D4A24A" strokeWidth="1.2" />
      <circle r="3" fill="#D4A24A" />
    </g>
    <text x="90" y="160" textAnchor="middle" fontFamily="Fraunces, serif" fontSize="14" fill="#E8E6E1" letterSpacing="2">IndieRadar</text>
  </svg>
);

const Logo3 = () => (
  // Globe-mesh + signal node — multilingual broadcast
  <svg width="180" height="180" viewBox="0 0 180 180">
    <g transform="translate(90 88)">
      <circle r="50" fill="none" stroke="#E8E6E1" strokeOpacity="0.18" strokeWidth="1" />
      {[-30, 0, 30].map(o => (
        <ellipse key={o} cx="0" cy="0" rx="50" ry="20"
          transform={`rotate(${o})`}
          fill="none" stroke="#E8E6E1" strokeOpacity="0.35" strokeWidth="1" />
      ))}
      <ellipse cx="0" cy="0" rx="20" ry="50" fill="none" stroke="#E8E6E1" strokeOpacity="0.35" strokeWidth="1" />
      <line x1="0" y1="0" x2="36" y2="-36" stroke="#D4A24A" strokeWidth="1.2" />
      <circle cx="36" cy="-36" r="4" fill="#D4A24A" />
      <circle cx="36" cy="-36" r="9" fill="none" stroke="#D4A24A" strokeOpacity="0.5" />
      <circle r="2" fill="#D4A24A" />
    </g>
    <text x="90" y="160" textAnchor="middle" fontFamily="Fraunces, serif" fontSize="14" fill="#E8E6E1" letterSpacing="2">IndieRadar</text>
  </svg>
);

const LogoConcepts = () => (
  <>
    <LogoCard code="LOGO-01" name="Sweep" jp="スイープ / 機会の探知"
      desc="同心円のレーダー波と、右上に立ち上がる金色のシグナルドット。探知から上昇への運動を最小要素で表現。Faviconでもドット+弧が成立する。">
      <Logo1 />
    </LogoCard>
    <LogoCard code="LOGO-02" name="Aperture" jp="アパチャー / 精密走査"
      desc="計測機器のレチクル。IndieRadarが「精密に見極めるツール」であることを伝える、最も真面目で硬派な方向。ドキュメント・データベースとの相性◎">
      <Logo2 />
    </LogoCard>
    <LogoCard code="LOGO-03" name="Mesh" jp="メッシュ / 多言語ブロードキャスト"
      desc="地球メッシュ + 立ち上がる信号点。多言語・多文化を横断するグローバル感が最も強い。translation intelligence の哲学を最も忠実に表現。">
      <Logo3 />
    </LogoCard>
  </>
);

Object.assign(window, { BrandIntro, LogoConcepts, Logo1, Logo2, Logo3 });
