// Deep dive of recommended direction A — full Article List page redesign
// Plus design system + handoff documentation

const { useState } = React;

// ─────────────────────────────────────────────────────────────
// FULL ARTICLE LIST — production-fidelity redesign
// ─────────────────────────────────────────────────────────────

const FEED = [
  { i: 1, source: 'HN', src_color: '#FF6600', title: 'Solo founder hits $42K MRR with a single-prompt SEO tool', desc: '19-month build log: pricing rewrites, churn cuts, and the one Reddit post that 3×\'d signups overnight. Operator: Maya R., Lisbon → SF.', mrr: '$42K', delta: '+38%', tag: 'AI · SEO', age: '6h', heat: 5, lang: ['JP', 'EN', 'KO', 'ZH'], type: 'CASE', isLead: true },
  { i: 2, source: 'PH', src_color: '#DA552F', title: 'Niche AI scheduler crosses $18K/mo by ignoring the "AI" market', desc: 'Targeted dental clinics in three EU countries. Wedge: a four-line localized prompt. No ChatGPT branding.', mrr: '$18K', delta: '+12%', tag: 'Vertical SaaS', age: '14h', heat: 4, lang: ['JP', 'EN', 'DE'], type: 'CASE' },
  { i: 3, source: 'Reddit', src_color: '#FF4500', title: '"I sold a Notion template for two years. Here\'s what actually moved the needle."', desc: 'r/SideProject thread, 2.1k upvotes. Six counterintuitive findings on TikTok demos and pricing tiers.', mrr: '$9.4K', delta: '+5%', tag: 'Templates', age: '1d', heat: 4, lang: ['JP', 'EN', 'ES', 'PT'], type: 'THREAD' },
  { i: 4, source: 'X', src_color: '#FFFFFF', title: 'A two-person studio in Lisbon built a $300K/yr macOS utility', desc: 'Quiet launch, no Product Hunt. Distribution: three Mac power-user newsletters and one Setapp deal.', mrr: '$25K', delta: '+8%', tag: 'macOS', age: '2d', heat: 4, lang: ['JP', 'EN', 'PT'], type: 'CASE' },
  { i: 5, source: 'IH', src_color: '#A78BFA', title: 'From $0 to $7K MRR in 90 days — a chrome extension for B2B sales', desc: 'Indie Hackers milestone post. Acquisition was 100% cold-email + a single Loom demo on Twitter.', mrr: '$7K', delta: '+42%', tag: 'Sales · Extension', age: '2d', heat: 3, lang: ['JP', 'EN'], type: 'CASE' },
  { i: 6, source: 'HN', src_color: '#FF6600', title: 'Why I shut down my $11K/mo product (and what I\'d build instead)', desc: 'Founder writes a clear-eyed teardown. 4 specific lessons on positioning and contractor cost structure.', mrr: '$11K', delta: '−ENDED', tag: 'Postmortem', age: '3d', heat: 3, lang: ['JP', 'EN', 'KO'], type: 'POST' },
  { i: 7, source: 'User', src_color: '#7BA88F', title: 'Field note · Self-hosted analytics for solo SaaS — what worked', desc: 'Submitted by @kenta. Plausible vs. Umami vs. own-rolled, with 6-month traffic data.', mrr: '—', delta: 'NEW', tag: 'Field Note', age: '4d', heat: 2, lang: ['JP', 'EN'], type: 'USER' },
];

const TabChip = ({ active, children, onClick, count }) => (
  <button onClick={onClick} style={{
    padding: '7px 14px', cursor: 'pointer', background: active ? '#E8E6E1' : 'transparent',
    color: active ? '#0B0B0C' : '#A8A39B',
    border: active ? '1px solid #E8E6E1' : '1px solid #2A2A2D',
    fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: active ? 600 : 400,
    letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 8,
    transition: 'all 0.15s'
  }}>
    {children}
    {count != null && <span style={{ color: active ? '#5C5852' : '#5C5852', fontSize: 10 }}>{count}</span>}
  </button>
);

const FullArticleList = () => {
  const [tab, setTab] = useState('All');
  const [hover, setHover] = useState(null);
  return (
    <div style={{
      width: 1440, background: '#0B0B0C', color: '#E8E6E1',
      fontFamily: 'Inter, system-ui, sans-serif',
      letterSpacing: '-0.005em',
      borderTop: '1px solid #1F1F22', borderBottom: '1px solid #1F1F22',
    }}>
      {/* TOP NAV */}
      <div style={{ display: 'flex', alignItems: 'center', height: 60, padding: '0 40px', borderBottom: '1px solid #1F1F22' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Logo1Mini2 />
          <span style={{ fontFamily: 'Fraunces, serif', fontSize: 19, fontWeight: 400, letterSpacing: '-0.005em' }}>IndieRadar</span>
        </div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: 40, fontSize: 13, color: '#A8A39B', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.04em' }}>
          <span style={{ color: '#E8E6E1', position: 'relative' }}>SIGNALS<span style={{ position: 'absolute', left: 0, right: 0, bottom: -22, height: 1, background: '#D4A24A' }} /></span>
          <span>SOURCES</span><span>OPERATORS</span><span>LIBRARY</span><span>FIELD NOTES</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#9A8F7A' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#7BA88F', boxShadow: '0 0 8px #7BA88F' }} />
            <span style={{ color: '#7BA88F', letterSpacing: '0.18em' }}>LIVE</span>
          </span>
          <span style={{ padding: '7px 12px', border: '1px solid #2A2A2D', display: 'flex', alignItems: 'center', gap: 6, color: '#E8E6E1' }}>
            <span style={{ color: '#9A8F7A' }}>LANG</span> JP <span style={{ color: '#5C5852' }}>·</span> 9
          </span>
          <span style={{ padding: '7px 16px', background: '#D4A24A', color: '#0B0B0C', fontWeight: 600, letterSpacing: '0.08em' }}>SIGN IN</span>
        </div>
      </div>

      {/* HERO */}
      <div style={{ padding: '64px 40px 40px', borderBottom: '1px solid #1F1F22', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)', backgroundSize: '48px 48px', pointerEvents: 'none', maskImage: 'linear-gradient(180deg, transparent, black 40%, black 70%, transparent)' }} />
        {/* radar arc faint background */}
        <svg width="600" height="600" viewBox="0 0 600 600" style={{ position: 'absolute', right: -180, top: -120, opacity: 0.15, pointerEvents: 'none' }}>
          {[120, 200, 280, 360].map(r => (
            <circle key={r} cx="300" cy="300" r={r} fill="none" stroke="#D4A24A" strokeWidth="0.8" strokeOpacity={0.5 - r * 0.001} />
          ))}
          <line x1="300" y1="300" x2="540" y2="120" stroke="#D4A24A" strokeWidth="0.8" />
        </svg>
        <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 60 }}>
          <div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.18em', color: '#9A8F7A', marginBottom: 24, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <span><span style={{ color: '#7BA88F' }}>●</span> SCANNING — HN · PH · REDDIT · X · INDIEHACKERS · USER</span>
              <span style={{ color: '#5C5852' }}>—</span>
              <span>LAST SWEEP 00:04:12</span>
              <span style={{ color: '#5C5852' }}>—</span>
              <span>LANG_EXPAND JA→9</span>
            </div>
            <h1 style={{ fontFamily: 'Fraunces, Georgia, serif', fontWeight: 300, fontSize: 76, lineHeight: 1.0, letterSpacing: '-0.03em', margin: '0 0 24px' }}>
              Today's <span style={{ fontStyle: 'italic', color: '#D4A24A' }}>monetization signal</span>,<br/>
              translated into your<br/>operating language.
            </h1>
            <p style={{ fontSize: 16, color: '#A8A39B', maxWidth: 580, lineHeight: 1.6, margin: 0 }}>
              247 cases scanned this week. 38 cleared the revenue threshold. Re-broadcast across nine languages, with operator notes for builders who plan to <span style={{ color: '#E8E6E1', fontStyle: 'italic', fontFamily: 'Fraunces, serif' }}>act</span>, not just read.
            </p>
          </div>
          <div style={{ alignSelf: 'end' }}>
            <div style={{ border: '1px solid #1F1F22', background: 'rgba(20,20,22,0.4)', backdropFilter: 'blur(8px)' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #1F1F22', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.18em', color: '#9A8F7A', display: 'flex', justifyContent: 'space-between' }}>
                <span>WEEKLY SIGNAL DIGEST</span><span style={{ color: '#7BA88F' }}>● ACTIVE</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #1F1F22' }}>
                {[['SCANNED', '247'], ['CLEARED', '38'], ['MRR_TOTAL', '$1.84M'], ['LANGS', '9 / 9']].map(([k, v], i) => (
                  <div key={k} style={{ padding: '18px 20px', borderRight: i % 2 === 0 ? '1px solid #1F1F22' : 'none', borderBottom: i < 2 ? '1px solid #1F1F22' : 'none' }}>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.2em', color: '#5C5852', marginBottom: 6 }}>{k}</div>
                    <div style={{ fontFamily: 'Fraunces, serif', fontSize: 28, fontWeight: 300, color: i === 2 ? '#D4A24A' : '#E8E6E1' }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ padding: '14px 20px', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.1em', color: '#9A8F7A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>NEXT_SWEEP — 03:48</span>
                <span style={{ color: '#D4A24A' }}>SUBSCRIBE →</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FILTER BAR */}
      <div style={{ padding: '20px 40px', borderBottom: '1px solid #1F1F22', display: 'flex', alignItems: 'center', gap: 18, fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#9A8F7A', flexWrap: 'wrap' }}>
        <span style={{ letterSpacing: '0.2em', color: '#5C5852' }}>SOURCE_</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {[['All', 247], ['HN', 89], ['PH', 54], ['Reddit', 41], ['X', 33], ['IH', 22], ['User', 8]].map(([t, c]) => (
            <TabChip key={t} active={tab === t} onClick={() => setTab(t)} count={c}>{t.toUpperCase()}</TabChip>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <span style={{ letterSpacing: '0.18em' }}>SORT_ HEAT ⌄</span>
        <span style={{ color: '#5C5852' }}>·</span>
        <span style={{ letterSpacing: '0.18em' }}>WINDOW_ 7D ⌄</span>
        <span style={{ color: '#5C5852' }}>·</span>
        <span style={{ letterSpacing: '0.18em', color: '#D4A24A' }}>+ ADD FILTER</span>
      </div>

      {/* HEADER ROW */}
      <div style={{
        display: 'grid', gridTemplateColumns: '60px 80px 1fr 130px 120px 80px 40px',
        gap: 24, padding: '12px 40px', borderBottom: '1px solid #1F1F22',
        fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#5C5852', letterSpacing: '0.2em'
      }}>
        <span>#</span><span>SRC</span><span>SIGNAL · EXTRACTION</span>
        <span style={{ textAlign: 'right' }}>MRR · Δ7D</span><span>HEAT</span><span>LANG</span><span></span>
      </div>

      {/* SIGNAL ROWS */}
      {FEED.map((a, idx) => (
        <SignalRowFull key={a.i} a={a} idx={idx} hover={hover === idx} onHover={() => setHover(idx)} onLeave={() => setHover(null)} />
      ))}

      {/* INFOBAND */}
      <div style={{ padding: '32px 40px', borderBottom: '1px solid #1F1F22', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 32, background: 'rgba(20,20,22,0.3)' }}>
        {[
          ['◇', 'OPERATOR ROUTE', 'Each signal includes 3-line extraction notes — wedge / channel / pricing — written for builders, not readers.'],
          ['◎', 'MULTILINGUAL CORE', 'Cases re-broadcast in 9 languages. AI-translated, human-reviewed. Switch language without losing context.'],
          ['◐', 'USER FIELD NOTES', 'Submit your own case. Reviewed within 48h. Verified MRR earns the green source-mark.'],
        ].map(([sym, h, b]) => (
          <div key={h}>
            <div style={{ fontSize: 24, color: '#D4A24A', fontFamily: 'Fraunces, serif', marginBottom: 12 }}>{sym}</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.2em', color: '#E8E6E1', marginBottom: 6 }}>{h}</div>
            <div style={{ fontSize: 13, color: '#A8A39B', lineHeight: 1.6 }}>{b}</div>
          </div>
        ))}
      </div>

      {/* FOOTER */}
      <div style={{ padding: '40px 40px 32px', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 40 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <Logo1Mini2 />
            <span style={{ fontFamily: 'Fraunces, serif', fontSize: 17 }}>IndieRadar</span>
          </div>
          <p style={{ fontSize: 12, color: '#7E7972', lineHeight: 1.6, maxWidth: 320, margin: 0 }}>
            A monetization intelligence terminal for indie operators. Scanning HN · PH · Reddit · X · Indie Hackers · User submissions, re-broadcast in 9 languages.
          </p>
        </div>
        {[
          ['PRODUCT', ['Signals', 'Sources', 'Operators', 'Library', 'Field Notes', 'API']],
          ['LANGUAGES', ['日本語', 'English', '한국어', '中文', 'Español', 'Português', 'Deutsch', 'Français', 'العربية']],
          ['COMPANY', ['Manifesto', 'Submit a case', 'Pricing', 'Changelog', 'Contact', 'RSS']],
        ].map(([h, items]) => (
          <div key={h}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.2em', color: '#9A8F7A', marginBottom: 14 }}>{h}</div>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 12, color: '#C8C3BA', lineHeight: 2 }}>
              {items.map(i => <li key={i}>{i}</li>)}
            </ul>
          </div>
        ))}
      </div>
      <div style={{ padding: '16px 40px', borderTop: '1px solid #1F1F22', display: 'flex', justifyContent: 'space-between', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#5C5852', letterSpacing: '0.18em' }}>
        <span>© 2026 INDIERADAR · DISCOVERY ENGINE V0.4</span>
        <span><span style={{ color: '#7BA88F' }}>●</span> ALL SYSTEMS NOMINAL · NEXT SWEEP 03:48</span>
      </div>
    </div>
  );
};

const Logo1Mini2 = () => (
  // Aperture mark — selected logo
  <svg width="22" height="22" viewBox="0 0 180 180">
    <g transform="translate(90 90)">
      {[0, 60, 120, 180, 240, 300].map(a => (
        <line key={a} x1="0" y1="-46" x2="0" y2="-58"
          stroke="#E8E6E1" strokeOpacity="0.5" strokeWidth="4"
          transform={`rotate(${a})`} />
      ))}
      <circle r="42" fill="none" stroke="#E8E6E1" strokeWidth="4" strokeOpacity="0.6" />
      <circle r="22" fill="none" stroke="#D4A24A" strokeWidth="4" />
      <line x1="-6" y1="-22" x2="-6" y2="22" stroke="#D4A24A" strokeWidth="4" />
      <line x1="6" y1="-22" x2="6" y2="22" stroke="#D4A24A" strokeWidth="4" />
      <circle r="6" fill="#D4A24A" />
    </g>
  </svg>
);

const SignalRowFull = ({ a, idx, hover, onHover, onLeave }) => {
  const isLead = a.isLead;
  return (
    <div onMouseEnter={onHover} onMouseLeave={onLeave} style={{
      display: 'grid', gridTemplateColumns: '60px 80px 1fr 130px 120px 80px 40px',
      gap: 24, padding: '24px 40px', borderBottom: '1px solid #1F1F22',
      alignItems: 'center', cursor: 'pointer',
      background: hover ? 'rgba(212,162,74,0.05)' : (isLead ? 'linear-gradient(90deg, rgba(212,162,74,0.05), transparent 35%)' : 'transparent'),
      borderLeft: hover ? '2px solid #D4A24A' : '2px solid transparent',
      paddingLeft: hover ? 38 : 40,
      transition: 'background 0.18s, border-color 0.18s, padding-left 0.18s'
    }}>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#5C5852', letterSpacing: '0.1em' }}>
        {String(a.i).padStart(3, '0')}
      </div>
      <div>
        <div style={{
          fontFamily: 'JetBrains Mono, monospace', fontSize: 10, padding: '4px 8px',
          border: `1px solid ${a.src_color}`, color: a.src_color, display: 'inline-block',
          letterSpacing: '0.1em'
        }}>{a.source.toUpperCase()}</div>
      </div>
      <div>
        {isLead && <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.2em', color: '#D4A24A', marginBottom: 8 }}>★ LEAD SIGNAL · CLEARED 38× THRESHOLD</div>}
        <div style={{
          fontSize: isLead ? 24 : 18, lineHeight: 1.25, color: '#E8E6E1',
          fontWeight: 400, letterSpacing: '-0.012em', marginBottom: 8,
          fontFamily: 'Fraunces, serif'
        }}>{a.title}</div>
        <div style={{ fontSize: 13, color: '#8A857D', lineHeight: 1.55, maxWidth: 660, marginBottom: 12 }}>{a.desc}</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#9A8F7A', letterSpacing: '0.08em', flexWrap: 'wrap' }}>
          <span style={{ color: '#7BA88F' }}>◇ {a.tag.toUpperCase()}</span>
          <span style={{ color: '#5C5852' }}>—</span>
          <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
            <span style={{ color: '#5C5852' }}>TR →</span>
            {a.lang.map(l => (
              <span key={l} style={{ padding: '2px 6px', border: '1px solid #2A2A2D', color: '#A8A39B' }}>{l}</span>
            ))}
            {a.lang.length < 9 && <span style={{ color: '#5C5852' }}>+{9 - a.lang.length}</span>}
          </span>
          <span style={{ color: '#5C5852' }}>—</span>
          <span>{a.age} AGO · {a.type}</span>
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontFamily: 'Fraunces, serif', fontSize: isLead ? 32 : 26, color: '#D4A24A', fontWeight: 300, letterSpacing: '-0.02em' }}>{a.mrr}</div>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: a.delta.startsWith('−') ? '#C9695C' : (a.delta === 'NEW' ? '#7BA88F' : '#7BA88F'), letterSpacing: '0.1em' }}>MRR · {a.delta}</div>
      </div>
      <div style={{ display: 'flex', gap: 2 }}>
        {[1, 2, 3, 4, 5].map(n => (
          <div key={n} style={{
            width: 14, height: 24,
            background: n <= a.heat ? '#D4A24A' : '#1F1F22',
            opacity: n <= a.heat ? 0.25 + (n / 5) * 0.75 : 1
          }} />
        ))}
      </div>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#7E7972', letterSpacing: '0.1em' }}>{a.lang.length}/9</div>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 16, color: hover ? '#D4A24A' : '#5C5852', transition: 'color 0.18s' }}>→</div>
    </div>
  );
};

// ─── EMPTY STATE ───────────────────────────────────────────
const EmptyStateView = () => (
  <div style={{
    width: 1180, height: 540, background: '#0B0B0C', color: '#E8E6E1',
    fontFamily: 'Inter, system-ui, sans-serif',
    border: '1px solid #1F1F22', position: 'relative', overflow: 'hidden',
    display: 'flex', alignItems: 'center', justifyContent: 'center'
  }}>
    <svg width="900" height="900" viewBox="0 0 900 900" style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', opacity: 0.6 }}>
      {[120, 220, 320, 420].map(r => (
        <circle key={r} cx="450" cy="450" r={r} fill="none" stroke="#D4A24A" strokeWidth="0.6" strokeOpacity={0.12} />
      ))}
      <line x1="450" y1="450" x2="780" y2="240" stroke="#D4A24A" strokeWidth="0.8" strokeOpacity={0.5} />
    </svg>
    <div style={{ position: 'relative', textAlign: 'center', maxWidth: 520 }}>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.2em', color: '#D4A24A', marginBottom: 24, display: 'inline-flex', gap: 10, alignItems: 'center', padding: '8px 14px', border: '1px solid rgba(212,162,74,0.3)' }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#D4A24A', boxShadow: '0 0 8px #D4A24A' }} />
        SWEEP IN PROGRESS — NEXT SIGNAL 03:48
      </div>
      <h2 style={{ fontFamily: 'Fraunces, serif', fontWeight: 300, fontSize: 44, lineHeight: 1.05, letterSpacing: '-0.025em', margin: '0 0 16px' }}>
        The radar is <span style={{ fontStyle: 'italic', color: '#D4A24A' }}>scanning</span>.
      </h2>
      <p style={{ fontSize: 15, color: '#A8A39B', lineHeight: 1.6, margin: '0 0 32px' }}>
        We're sweeping HN, PH, Reddit, X and Indie Hackers right now. New monetization signals will appear here within minutes — translated into your language.
      </p>
      <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.12em', color: '#7E7972' }}>
        <span style={{ padding: '6px 12px', border: '1px solid #2A2A2D' }}>● 6 SOURCES ACTIVE</span>
        <span style={{ padding: '6px 12px', border: '1px solid #2A2A2D' }}>9 LANGUAGES READY</span>
        <span style={{ padding: '6px 12px', border: '1px solid #D4A24A', color: '#D4A24A' }}>NOTIFY ME WHEN READY →</span>
      </div>
    </div>
  </div>
);

// ─── DESIGN SYSTEM SHEET ────────────────────────────────────
const SystemSheet = () => (
  <div style={{ width: 1180, background: '#0B0B0C', color: '#E8E6E1', fontFamily: 'Inter, system-ui, sans-serif', border: '1px solid #1F1F22', padding: 48 }}>
    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.2em', color: '#9A8F7A', marginBottom: 16 }}>DESIGN SYSTEM / TOKENS · v0.1</div>
    <h2 style={{ fontFamily: 'Fraunces, serif', fontWeight: 300, fontSize: 44, letterSpacing: '-0.025em', margin: '0 0 40px' }}>The Terminal System</h2>

    {/* COLOR */}
    <Section title="COLOR TOKENS">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
        {[
          ['#0B0B0C', 'ink.0', 'canvas'],
          ['#141416', 'ink.1', 'surface'],
          ['#1F1F22', 'ink.2', 'border / divider'],
          ['#2A2A2D', 'ink.3', 'border-strong'],
          ['#5C5852', 'ink.4', 'text-mute'],
          ['#8A857D', 'ink.5', 'text-secondary'],
          ['#A8A39B', 'paper.1', 'text-body'],
          ['#C8C3BA', 'paper.2', 'text-emphasis'],
          ['#E8E6E1', 'paper.3', 'text-primary'],
          ['#D4A24A', 'signal.gold', 'primary accent · MRR · CTA'],
          ['#7BA88F', 'signal.live', 'live · positive · verified'],
          ['#C9695C', 'signal.warn', 'declining · ended'],
        ].map(([hex, name, role]) => (
          <div key={name}>
            <div style={{ aspectRatio: '1.4', background: hex, border: '1px solid #1F1F22' }} />
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#E8E6E1', marginTop: 8, letterSpacing: '0.05em' }}>{name}</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#7E7972', marginTop: 2 }}>{hex}</div>
            <div style={{ fontSize: 11, color: '#9A8F7A', marginTop: 4 }}>{role}</div>
          </div>
        ))}
      </div>
    </Section>

    {/* TYPE SCALE */}
    <Section title="TYPE SCALE">
      <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr 180px', rowGap: 18, alignItems: 'baseline' }}>
        {[
          ['display.xl', 'Today\'s monetization signal', 'Fraunces 76/76 · -0.03em · 300'],
          ['display.l', 'The radar is scanning.', 'Fraunces 44/46 · -0.025em · 300'],
          ['headline', 'Signal title in row', 'Fraunces 19/24 · -0.012em · 400'],
          ['headline.lead', 'Lead signal title', 'Fraunces 24/30 · -0.012em · 400'],
          ['body', 'Description body — the explanation that frames why a signal matters.', 'Inter 13/20 · 400 · #8A857D'],
          ['ui.label', 'SIGNAL · EXTRACTION', 'JetBrains Mono 10/14 · 0.2em · uppercase'],
          ['data.amount', '$42K', 'Fraunces 26/26 · -0.02em · 300 · #D4A24A'],
          ['data.code', '003 · NEXT_SWEEP 03:48', 'JetBrains Mono 11/16 · 0.1em'],
        ].map(([k, v, m]) => (
          <React.Fragment key={k}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#9A8F7A', letterSpacing: '0.12em' }}>{k}</div>
            <div style={{
              fontFamily: k.startsWith('display') || k.startsWith('headline') || k.startsWith('data.amount') ? 'Fraunces, serif' : (k.startsWith('ui') || k.startsWith('data.code') ? 'JetBrains Mono, monospace' : 'Inter, sans-serif'),
              fontSize: k === 'display.xl' ? 38 : (k === 'display.l' ? 28 : (k.startsWith('headline.lead') ? 22 : (k.startsWith('headline') ? 19 : (k === 'data.amount' ? 24 : (k.startsWith('ui') || k.startsWith('data.code') ? 11 : 13))))),
              fontWeight: k.startsWith('display') ? 300 : 400,
              fontStyle: 'normal',
              color: k === 'data.amount' ? '#D4A24A' : (k === 'body' ? '#8A857D' : '#E8E6E1'),
              letterSpacing: k.startsWith('display') ? '-0.025em' : (k.startsWith('ui') ? '0.2em' : 'normal'),
              textTransform: k.startsWith('ui') ? 'uppercase' : 'none'
            }}>{v}</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#7E7972', letterSpacing: '0.05em' }}>{m}</div>
          </React.Fragment>
        ))}
      </div>
    </Section>

    {/* SPACING / RADII / SHADOW */}
    <Section title="SPACING · RADIUS · BORDER">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 32 }}>
        <div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#9A8F7A', marginBottom: 12, letterSpacing: '0.18em' }}>SPACING — 4PX BASE</div>
          {[['1', 4], ['2', 8], ['3', 12], ['4', 16], ['6', 24], ['8', 32], ['10', 40], ['16', 64]].map(([n, px]) => (
            <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6, fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>
              <span style={{ width: 30, color: '#9A8F7A' }}>s.{n}</span>
              <div style={{ height: 6, width: px, background: '#D4A24A', opacity: 0.7 }} />
              <span style={{ color: '#7E7972' }}>{px}px</span>
            </div>
          ))}
        </div>
        <div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#9A8F7A', marginBottom: 12, letterSpacing: '0.18em' }}>RADIUS</div>
          <div style={{ fontSize: 12, color: '#A8A39B', marginBottom: 16, lineHeight: 1.6 }}>
            このシステムは原則 <span style={{ color: '#D4A24A', fontFamily: 'JetBrains Mono, monospace' }}>radius=0</span>。鋭利な機械感を保つ。例外: 状態ピル(LIVE/MRR delta)のみ <span style={{ color: '#D4A24A', fontFamily: 'JetBrains Mono, monospace' }}>9999px</span> を許可。
          </div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#9A8F7A', marginBottom: 12, letterSpacing: '0.18em', marginTop: 24 }}>BORDER</div>
          <div style={{ fontSize: 12, color: '#A8A39B', lineHeight: 1.6 }}>
            <div>border.hairline = 1px ink.2</div>
            <div>border.strong = 1px ink.3</div>
            <div>border.signal = 1px signal.gold</div>
            <div>border.source = 1px source[X]</div>
          </div>
        </div>
        <div>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#9A8F7A', marginBottom: 12, letterSpacing: '0.18em' }}>ELEVATION</div>
          <div style={{ fontSize: 12, color: '#A8A39B', lineHeight: 1.6, marginBottom: 16 }}>
            シャドウは原則使わない。<br/>"層"はborderと背景値で表現。
          </div>
          <div style={{ padding: 16, border: '1px solid #1F1F22', marginBottom: 8, fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>elev.0 — flat (default)</div>
          <div style={{ padding: 16, background: '#141416', border: '1px solid #1F1F22', marginBottom: 8, fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>elev.1 — surface raise</div>
          <div style={{ padding: 16, background: 'rgba(20,20,22,0.4)', backdropFilter: 'blur(8px)', border: '1px solid #1F1F22', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>elev.2 — glass (sparingly)</div>
        </div>
      </div>
    </Section>

    {/* CHIPS / BADGES */}
    <Section title="CHIPS · BADGES · INDICATORS">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 32 }}>
        <div>
          <Label>SOURCE BADGES</Label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {[['HN', '#FF6600'], ['PH', '#DA552F'], ['REDDIT', '#FF4500'], ['X', '#FFFFFF'], ['IH', '#A78BFA'], ['USER', '#7BA88F']].map(([t, c]) => (
              <span key={t} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, padding: '4px 8px', border: `1px solid ${c}`, color: c, letterSpacing: '0.1em' }}>{t}</span>
            ))}
          </div>
        </div>
        <div>
          <Label>LANGUAGE CHIPS</Label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {['JP', 'EN', 'KO', 'ZH', 'ES', 'PT', 'DE', 'FR', 'AR'].map(l => (
              <span key={l} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, padding: '2px 6px', border: '1px solid #2A2A2D', color: '#A8A39B' }}>{l}</span>
            ))}
          </div>
          <div style={{ marginTop: 10, fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#7E7972' }}>
            translation indicator: <span style={{ color: '#D4A24A' }}>4/9</span> langs available
          </div>
        </div>
        <div>
          <Label>STATE PILLS</Label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, padding: '3px 8px', borderRadius: 9999, background: 'rgba(123,168,143,0.12)', color: '#7BA88F', letterSpacing: '0.12em' }}>● LIVE</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, padding: '3px 8px', borderRadius: 9999, background: 'rgba(212,162,74,0.12)', color: '#D4A24A', letterSpacing: '0.12em' }}>+38%</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, padding: '3px 8px', borderRadius: 9999, background: 'rgba(201,105,92,0.12)', color: '#C9695C', letterSpacing: '0.12em' }}>−ENDED</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, padding: '3px 8px', borderRadius: 9999, background: 'rgba(232,230,225,0.08)', color: '#E8E6E1', letterSpacing: '0.12em' }}>NEW</span>
          </div>
        </div>
      </div>
    </Section>

    {/* CTA */}
    <Section title="CTA HIERARCHY">
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
        <button style={{ padding: '12px 22px', background: '#D4A24A', color: '#0B0B0C', border: 'none', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600, letterSpacing: '0.12em', cursor: 'pointer' }}>PRIMARY · ENTER →</button>
        <button style={{ padding: '12px 22px', background: 'transparent', color: '#E8E6E1', border: '1px solid #2A2A2D', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, letterSpacing: '0.12em', cursor: 'pointer' }}>SECONDARY · BROWSE</button>
        <button style={{ padding: '12px 0', background: 'transparent', color: '#D4A24A', border: 'none', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, letterSpacing: '0.12em', cursor: 'pointer' }}>TERTIARY · LEARN MORE →</button>
      </div>
      <div style={{ fontSize: 12, color: '#9A8F7A', marginTop: 16, lineHeight: 1.7, maxWidth: 720 }}>
        Primaryは1画面に1つまで。サインアップ等、不可逆かつ最重要の行動にのみ使用。Secondaryは閲覧/比較系、Tertiaryはinline遷移用。CTAの語彙は全てモノスペース大文字、命令形(ENTER, OPEN, SUBSCRIBE, NOTIFY ME)で統一。
      </div>
    </Section>

    {/* MOTION */}
    <Section title="MOTION PRINCIPLES">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, fontSize: 13, color: '#A8A39B', lineHeight: 1.65 }}>
        <div>
          <Label>BASE TIMING</Label>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#E8E6E1' }}>
            fast: 120ms · ui hover<br/>
            std: 180ms · row reveal · tab swap<br/>
            slow: 320ms · hero / lang switch<br/>
            ease: cubic-bezier(.2,.7,.3,1)
          </div>
        </div>
        <div>
          <Label>RULES</Label>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            <li>— No bounces. Motion is precise, not playful.</li>
            <li>— No 3D rotations. No skews. No parallax.</li>
            <li>— Translate &le; 4px, opacity 0→1, color shifts only.</li>
            <li>— Live indicators may pulse (1.6s, 0.6→1 opacity).</li>
            <li>— A radar arc may sweep once on hero load (320ms).</li>
            <li>— Empty state: arc pulses every 4s, very faint.</li>
          </ul>
        </div>
        <div>
          <Label>HOVER</Label>
          <div>Row: bg → rgba(212,162,74,.05), gold left-stroke 2px, → ink.4 to gold (180ms).</div>
        </div>
        <div>
          <Label>TAB / FILTER</Label>
          <div>Active chip swaps with no slide. Selected fill paints in 120ms. List filters via fade(180ms) + 4px translateY.</div>
        </div>
        <div>
          <Label>LANGUAGE SWITCH</Label>
          <div>Title/desc cross-fade 320ms. Lang chip flashes once. Translation indicator counts up 4→9.</div>
        </div>
        <div>
          <Label>CARD REVEAL</Label>
          <div>On scroll-in: opacity 0→1, translateY 6→0, 220ms, stagger 30ms per row. Used only on initial paint.</div>
        </div>
      </div>
    </Section>
  </div>
);

const Section = ({ title, children }) => (
  <div style={{ marginBottom: 56, paddingTop: 32, borderTop: '1px solid #1F1F22' }}>
    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.22em', color: '#D4A24A', marginBottom: 28 }}>// {title}</div>
    {children}
  </div>
);

const Label = ({ children }) => (
  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.18em', color: '#9A8F7A', marginBottom: 12 }}>{children}</div>
);

// ─── HANDOFF SUMMARY ────────────────────────────────────────
const HandoffSheet = () => (
  <div style={{ width: 1180, background: '#F5F1E8', color: '#1A1814', fontFamily: 'Inter, system-ui, sans-serif', border: '1px solid #1A1814', padding: 56 }}>
    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.22em', color: '#9C2A1B', marginBottom: 16 }}>HANDOFF / CLAUDE CODE / 2026-05-04</div>
    <h2 style={{ fontFamily: 'Fraunces, serif', fontWeight: 300, fontSize: 56, letterSpacing: '-0.03em', margin: '0 0 8px', lineHeight: 1.0 }}>Implementation brief.</h2>
    <p style={{ fontSize: 14, color: '#3A352D', maxWidth: 720, lineHeight: 1.6, marginTop: 16 }}>
      この案 (DIR-01 / Terminal Edition) を選定した理由、現UIとの対応、状態網羅、トークン、レスポンシブ、a11y、優先度、スコープ外、handoff summary を以下にまとめる。Claude Code側は本書をそのままタスク化できる。
    </p>

    <HSection title="1. WHY THIS DIRECTION">
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.75, color: '#1A1814' }}>
        <li>「読むメディア」から「装置」への転換が最強に効く案。一般的なblog/PHクローンに見えない。</li>
        <li>monochrome + 単一goldで、情報商材LP・crypto・generic SaaSの見た目を全て回避できる。</li>
        <li>Mono + Fraunces + Interの三層フォントが、データ性・知性・読み物性を同時に成立させる。</li>
        <li>多言語が"裏方の機能"でなく"装置の出力"として表現できる(LANG_EXPAND, TR→ chips)。</li>
        <li>記事一覧 → トップ → 詳細 への展開が容易 (同じrow vocabulary を縦/横で使い回せる)。</li>
      </ul>
    </HSection>

    <HSection title="2. KEY COMPONENTS">
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #1A1814' }}>
            {['Component', 'Role', 'States', 'Maps to existing'].map(h => (
              <th key={h} style={{ textAlign: 'left', padding: '10px 8px', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.18em', color: '#5C544A' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody style={{ fontSize: 12 }}>
          {[
            ['<TopBar>', 'Logo · primary nav · live status · lang switch · auth', 'default · scrolled · auth-out · auth-in', 'Header.tsx (replace)'],
            ['<HeroBand>', 'Status line · display headline · weekly digest panel', 'default · loading · empty', 'app/page.tsx hero (replace)'],
            ['<DigestPanel>', '4-cell KPI + next sweep CTA', 'default · loading · error · subscribed', 'new'],
            ['<FilterBar>', 'Source tabs (with counts) · sort/window/lang controls', 'default · hover · active · disabled · loading-counts', 'articles/[Filters].tsx (refactor)'],
            ['<SignalRow>', 'Numbered row: src · title · desc · meta · MRR · heat · lang · arrow', 'default · hover · lead · saved · external · user-submitted · loading skeleton', 'ArticleCard.tsx (replace)'],
            ['<SourceBadge>', 'Color-bordered source mark', '6 source variants · interactive (filter) · static (in row)', 'new (was generic chip)'],
            ['<LangChipset>', 'Translation chips with X/9 indicator', 'default · partial · full(9/9) · hover · active(current lang)', 'new'],
            ['<HeatMeter>', '5-bar amber meter', '0–5 levels · animated on hover', 'new'],
            ['<EmptyRadar>', 'Sweep-in-progress hero with arc + countdown + CTA', 'scanning · zero-results · error · pre-launch', 'EmptyState.tsx (replace)'],
            ['<InfoBand>', '3-cell trust strip (operator route / multilang / user notes)', 'static · CTA-variant', 'new'],
            ['<Footer>', '4-col + status line', 'default', 'Footer.tsx (replace)'],
          ].map(r => (
            <tr key={r[0]} style={{ borderBottom: '1px solid rgba(26,24,20,0.15)' }}>
              {r.map((c, i) => <td key={i} style={{ padding: '10px 8px', verticalAlign: 'top', fontFamily: i === 0 ? 'JetBrains Mono, monospace' : 'inherit', color: i === 0 ? '#9C2A1B' : '#1A1814' }}>{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </HSection>

    <HSection title="3. DESIGN TOKENS (CSS VAR NAMES)">
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, lineHeight: 1.85, color: '#1A1814', columnCount: 2, columnGap: 32 }}>
        <div>--ink-0: #0B0B0C;</div>
        <div>--ink-1: #141416;</div>
        <div>--ink-2: #1F1F22;</div>
        <div>--ink-3: #2A2A2D;</div>
        <div>--ink-4: #5C5852;</div>
        <div>--ink-5: #8A857D;</div>
        <div>--paper-1: #A8A39B;</div>
        <div>--paper-2: #C8C3BA;</div>
        <div>--paper-3: #E8E6E1;</div>
        <div>--signal-gold: #D4A24A;</div>
        <div>--signal-live: #7BA88F;</div>
        <div>--signal-warn: #C9695C;</div>
        <div>--src-hn: #FF6600;</div>
        <div>--src-ph: #DA552F;</div>
        <div>--src-reddit: #FF4500;</div>
        <div>--src-x: #FFFFFF;</div>
        <div>--src-ih: #A78BFA;</div>
        <div>--src-user: #7BA88F;</div>
        <div>--font-display: 'Fraunces', Georgia, serif;</div>
        <div>--font-body: 'Inter', system-ui, sans-serif;</div>
        <div>--font-mono: 'JetBrains Mono', monospace;</div>
        <div>--ease-std: cubic-bezier(.2,.7,.3,1);</div>
        <div>--dur-fast: 120ms; --dur-std: 180ms; --dur-slow: 320ms;</div>
        <div>--radius: 0; --radius-pill: 9999px;</div>
      </div>
    </HSection>

    <HSection title="4. RESPONSIVE">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, fontSize: 12, lineHeight: 1.6 }}>
        <Bp label="≥1280 / desktop" pts={['Full grid: 60·80·1fr·130·120·80·40', 'Hero 2-column with digest panel', 'Filter bar single line']} />
        <Bp label="768–1279 / tablet" pts={['Row collapses meta line below desc', 'Heat meter moves to meta row', 'Digest panel drops below hero']} />
        <Bp label="<768 / mobile" pts={['Card-style row, no columns', 'MRR + heat in inline meta', 'Filter bar horizontal scroll-snap', 'Lang chipset becomes drawer']} />
      </div>
    </HSection>

    <HSection title="5. ACCESSIBILITY">
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.75 }}>
        <li>Color contrast: paper-3/ink-0 = 16.4:1 ✓. Gold on ink-0 = 8.1:1 ✓ for 14px+.</li>
        <li>Source badges must include text — never color-only. Colorblind-safe sources: HN/PH share orange family, distinguish by label.</li>
        <li>Heat meter exposes <code>aria-valuenow</code> "{`{n}`} of 5" + visually-hidden label.</li>
        <li>LIVE pulse honors <code>prefers-reduced-motion: reduce</code> → static dot only.</li>
        <li>Radar sweep on hero is decorative <code>aria-hidden</code>.</li>
        <li>Lang switch is a real <code>&lt;select&gt;</code> with a visible LANG label, not a custom dropdown.</li>
        <li>Numbered rows: number is decorative <code>aria-hidden</code>; row link uses signal title as accessible name.</li>
        <li>RTL support required (AR). Mirror nav, source-badge alignment, arrow direction.</li>
      </ul>
    </HSection>

    <HSection title="6. IMPLEMENTATION PRIORITY">
      <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, lineHeight: 1.8 }}>
        <li><b>Tokens + fonts</b> — install Fraunces, Inter, JetBrains Mono. Define CSS vars + Tailwind theme.</li>
        <li><b>SignalRow + SourceBadge + HeatMeter</b> — the atomic unit; once correct, everything else follows.</li>
        <li><b>FilterBar</b> with source counts + sort/window controls.</li>
        <li><b>TopBar</b> (logo, nav, lang switch, sign-in).</li>
        <li><b>HeroBand + DigestPanel</b>.</li>
        <li><b>EmptyRadar</b> (current empty state replacement).</li>
        <li><b>InfoBand + Footer</b>.</li>
        <li>Localized copy for 9 langs (start: JP/EN/KO/ZH).</li>
        <li>Motion polish (hover, sweep, language cross-fade).</li>
        <li>RTL pass.</li>
      </ol>
    </HSection>

    <HSection title="7. OUT OF SCOPE (this round)">
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.75 }}>
        <li>Article detail page (use the same row vocabulary as the spine; defer full layout).</li>
        <li>User submission form & moderation queue (placeholder USER badge only).</li>
        <li>Operator profiles, "Stack" library, paid plans page.</li>
        <li>Inline video embeds (URL link only for now).</li>
        <li>Personalization / saved feed.</li>
      </ul>
    </HSection>

    <HSection title="8. HANDOFF SUMMARY (paste-ready)">
      <div style={{ background: '#1A1814', color: '#F5F1E8', padding: 24, fontFamily: 'JetBrains Mono, monospace', fontSize: 11, lineHeight: 1.7, letterSpacing: '0.02em' }}>
        <div>// IndieRadar — Terminal Edition · v0.1</div>
        <div>// Goal: convert the existing article-list page into a "monetization signal terminal".</div>
        <div>// Pages this round: /articles (list). Detail/top to follow.</div>
        <div></div>
        <div>// 1. Install tokens (see §3) and three fonts.</div>
        <div>// 2. Build atomic components: SignalRow, SourceBadge, LangChipset, HeatMeter.</div>
        <div>// 3. Compose FilterBar, HeroBand, DigestPanel, EmptyRadar.</div>
        <div>// 4. Replace existing Header/Hero/ArticleCard/EmptyState/Footer.</div>
        <div>// 5. All states per §2. Motion per §MOTION. A11y per §5.</div>
        <div>// 6. Mobile: see §4 — collapse to single-column meta-stacked rows.</div>
        <div>// 7. Default lang = JP. Lang chip persists per user. RTL for AR.</div>
        <div>// 8. Defer detail page, profiles, paid plans (§7).</div>
      </div>
    </HSection>
  </div>
);

const HSection = ({ title, children }) => (
  <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid rgba(26,24,20,0.25)' }}>
    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.22em', color: '#9C2A1B', marginBottom: 16 }}>{title}</div>
    {children}
  </div>
);

const Bp = ({ label, pts }) => (
  <div>
    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#9C2A1B', letterSpacing: '0.12em', marginBottom: 8 }}>{label}</div>
    <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12 }}>
      {pts.map(p => <li key={p} style={{ marginBottom: 4 }}>{p}</li>)}
    </ul>
  </div>
);

Object.assign(window, { FullArticleList, EmptyStateView, SystemSheet, HandoffSheet });
