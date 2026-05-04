// Three art direction options — each is a mini article-list page mockup at ~1180×900

// Shared mock data
const ARTICLES = [
  { source: 'HN', src_color: '#FF6600', title: 'Solo founder hits $42K MRR with a single-prompt SEO tool', desc: 'A 19-month build log: pricing rewrites, churn cuts, and the one Reddit post that 3×\'d signups overnight.', mrr: '$42K', delta: '+38%', tag: 'AI · SEO', age: '6h', heat: 4, lang: ['JP', 'EN', 'KO'] },
  { source: 'PH', src_color: '#DA552F', title: 'Niche AI scheduler crosses $18K/mo by ignoring the "AI" market', desc: 'Targeted dental clinics in three EU countries. No ChatGPT branding. Wedge: a four-line localized prompt.', mrr: '$18K', delta: '+12%', tag: 'Vertical SaaS', age: '14h', heat: 3, lang: ['JP', 'EN', 'DE'] },
  { source: 'Reddit', src_color: '#FF4500', title: '"I sold a Notion template for two years. Here\'s what actually moved the needle."', desc: 'r/SideProject thread, 2.1k upvotes. Six counterintuitive findings on TikTok demos and pricing tiers.', mrr: '$9.4K', delta: '+5%', tag: 'Templates · UGC', age: '1d', heat: 5, lang: ['JP', 'EN', 'ES', 'PT'] },
  { source: 'X', src_color: '#FFFFFF', title: 'A two-person studio in Lisbon built a $300K/yr macOS utility', desc: 'Quiet launch, no Product Hunt. Distribution through three Mac-power-user newsletters and one Setapp deal.', mrr: '$25K', delta: '+8%', tag: 'macOS · Indie', age: '2d', heat: 4, lang: ['JP', 'EN', 'PT'] },
];

// ─────────────────────────────────────────────────────────────
// OPTION A — TERMINAL EDITION (recommended)
// signal terminal · monochrome base · gold/amber accent · monospace data
// ─────────────────────────────────────────────────────────────
const OptionA = () => {
  const [tab, setTab] = React.useState('All');
  return (
    <div style={{
      width: 1180, background: '#0B0B0C', color: '#E8E6E1',
      fontFamily: 'Inter, system-ui, sans-serif',
      borderTop: '1px solid #1F1F22', borderBottom: '1px solid #1F1F22',
      letterSpacing: '-0.005em'
    }}>
      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', height: 56, padding: '0 32px', borderBottom: '1px solid #1F1F22', fontSize: 13, fontFamily: 'JetBrains Mono, monospace' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Logo1Mini />
          <span style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 400 }}>IndieRadar</span>
        </div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: 32, fontSize: 12, color: '#A8A39B', letterSpacing: '0.04em' }}>
          <span style={{ color: '#E8E6E1', borderBottom: '1px solid #D4A24A', paddingBottom: 18 }}>SIGNALS</span>
          <span>SOURCES</span><span>OPERATORS</span><span>LIBRARY</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 11, color: '#9A8F7A' }}>
          <span style={{ color: '#7BA88F' }}>● LIVE</span>
          <span>9 LANGS</span>
          <span style={{ padding: '6px 12px', border: '1px solid #2A2A2D', color: '#E8E6E1' }}>JP ⌄</span>
          <span style={{ padding: '6px 14px', background: '#D4A24A', color: '#0B0B0C', fontWeight: 500 }}>SIGN IN</span>
        </div>
      </div>

      {/* Hero / status strip */}
      <div style={{ padding: '48px 32px 32px', borderBottom: '1px solid #1F1F22', position: 'relative', overflow: 'hidden' }}>
        {/* Faint grid */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize: '40px 40px', pointerEvents: 'none' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, letterSpacing: '0.18em', color: '#9A8F7A', marginBottom: 20, display: 'flex', gap: 24 }}>
            <span><span style={{ color: '#7BA88F' }}>●</span> SCANNING — HN · PH · REDDIT · X · INDIEHACKERS</span>
            <span>LAST SWEEP 00:04:12 AGO</span>
            <span>LANG_EXPAND JA→9</span>
          </div>
          <h1 style={{ fontFamily: 'Fraunces, Georgia, serif', fontWeight: 300, fontSize: 60, lineHeight: 1.02, letterSpacing: '-0.025em', margin: '0 0 12px', maxWidth: 900 }}>
            Today's <span style={{ fontStyle: 'italic', color: '#D4A24A' }}>monetization signal</span>,<br/>
            translated into your operating language.
          </h1>
          <p style={{ fontSize: 15, color: '#A8A39B', maxWidth: 640, lineHeight: 1.55, margin: 0 }}>
            247 cases monitored this week. 38 cleared the revenue threshold. Re-broadcast in 9 languages, with extraction notes for builders who plan to act, not just read.
          </p>
        </div>
      </div>

      {/* Filter / source bar */}
      <div style={{ padding: '20px 32px', borderBottom: '1px solid #1F1F22', display: 'flex', alignItems: 'center', gap: 28, fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#9A8F7A' }}>
        <span style={{ letterSpacing: '0.2em' }}>SOURCE_</span>
        <div style={{ display: 'flex', gap: 4 }}>
          {['All', 'HN', 'PH', 'Reddit', 'X', 'IH', 'User'].map(t => (
            <span key={t} onClick={() => setTab(t)} style={{
              padding: '6px 14px', cursor: 'pointer',
              background: tab === t ? '#E8E6E1' : 'transparent',
              color: tab === t ? '#0B0B0C' : '#A8A39B',
              border: tab === t ? '1px solid #E8E6E1' : '1px solid #2A2A2D',
              fontWeight: tab === t ? 500 : 400, letterSpacing: '0.06em'
            }}>{t.toUpperCase()}</span>
          ))}
        </div>
        <span style={{ marginLeft: 'auto', letterSpacing: '0.2em' }}>SORT_ HEAT ⌄ &nbsp;·&nbsp; WINDOW_ 7D ⌄ &nbsp;·&nbsp; LANG_ ALL ⌄</span>
      </div>

      {/* List */}
      <div>
        {ARTICLES.map((a, i) => <SignalRow key={i} a={a} idx={i} />)}
      </div>

      <div style={{ padding: '20px 32px', borderTop: '1px solid #1F1F22', display: 'flex', justifyContent: 'space-between', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#5C5852', letterSpacing: '0.18em' }}>
        <span>END OF VISIBLE STREAM — 38 SIGNALS / 247 SCANNED</span>
        <span>POWERED BY DISCOVERY ENGINE V0.4</span>
      </div>
    </div>
  );
};

const Logo1Mini = () => (
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

const SignalRow = ({ a, idx }) => (
  <div style={{
    display: 'grid', gridTemplateColumns: '60px 90px 1fr 140px 110px 60px',
    gap: 24, padding: '24px 32px', borderBottom: '1px solid #1F1F22',
    alignItems: 'center', cursor: 'pointer',
    background: idx === 0 ? 'linear-gradient(90deg, rgba(212,162,74,0.04), transparent 40%)' : 'transparent'
  }}>
    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#5C5852', letterSpacing: '0.1em' }}>
      {String(idx + 1).padStart(3, '0')}
    </div>
    <div>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace', fontSize: 10, padding: '4px 8px',
        border: `1px solid ${a.src_color}`, color: a.src_color, display: 'inline-block',
        letterSpacing: '0.1em'
      }}>{a.source.toUpperCase()}</div>
    </div>
    <div>
      <div style={{ fontSize: 19, lineHeight: 1.3, color: '#E8E6E1', fontWeight: 400, letterSpacing: '-0.01em', marginBottom: 6, fontFamily: 'Fraunces, serif' }}>{a.title}</div>
      <div style={{ fontSize: 13, color: '#8A857D', lineHeight: 1.5, maxWidth: 620 }}>{a.desc}</div>
      <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#9A8F7A', letterSpacing: '0.08em' }}>
        <span style={{ color: '#7BA88F' }}>◇ {a.tag}</span>
        <span>·</span>
        <span>TRANSLATED → {a.lang.join(' / ')}</span>
        <span>·</span>
        <span>{a.age} AGO</span>
      </div>
    </div>
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontFamily: 'Fraunces, serif', fontSize: 26, color: '#D4A24A', fontWeight: 300, letterSpacing: '-0.02em' }}>{a.mrr}</div>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#7BA88F', letterSpacing: '0.1em' }}>MRR · {a.delta}</div>
    </div>
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <div key={n} style={{
          width: 14, height: 22,
          background: n <= a.heat ? '#D4A24A' : '#1F1F22',
          opacity: n <= a.heat ? 0.3 + (n / 5) * 0.7 : 1
        }} />
      ))}
    </div>
    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 14, color: '#5C5852' }}>→</div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// OPTION B — EDITORIAL JOURNAL
// premium magazine · cream/ink · serif headlines · spacious
// ─────────────────────────────────────────────────────────────
const OptionB = () => (
  <div style={{
    width: 1180, background: '#F5F1E8', color: '#1A1814',
    fontFamily: 'Inter, system-ui, sans-serif',
    border: '1px solid #D8D2C4'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', height: 64, padding: '0 40px', borderBottom: '1px solid #1A1814' }}>
      <div style={{ fontFamily: 'Fraunces, serif', fontSize: 24, fontWeight: 400, letterSpacing: '-0.01em' }}>
        IndieRadar<span style={{ color: '#9C2A1B' }}>.</span>
      </div>
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: 36, fontSize: 13, fontFamily: 'Fraunces, serif', fontStyle: 'italic' }}>
        <span style={{ borderBottom: '1px solid #1A1814' }}>The Index</span>
        <span>Operators</span><span>Library</span><span>Field Notes</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: '#5C544A' }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.15em' }}>ISSUE 184 · MAY 04</span>
        <span style={{ padding: '6px 12px', border: '1px solid #1A1814' }}>JP ⌄</span>
        <span style={{ padding: '6px 14px', background: '#1A1814', color: '#F5F1E8' }}>Subscribe</span>
      </div>
    </div>

    {/* Masthead hero */}
    <div style={{ padding: '60px 40px 40px', borderBottom: '1px solid #1A1814' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.18em', color: '#5C544A', marginBottom: 32, paddingBottom: 12, borderBottom: '1px solid rgba(26,24,20,0.2)' }}>
        <span>VOL. III · MONETIZATION INTELLIGENCE</span>
        <span>247 SCANNED · 38 CLEARED</span>
        <span>NINE LANGUAGES</span>
      </div>
      <h1 style={{ fontFamily: 'Fraunces, Georgia, serif', fontWeight: 300, fontSize: 92, lineHeight: 0.96, letterSpacing: '-0.035em', margin: 0, maxWidth: 1000 }}>
        The cases that <span style={{ fontStyle: 'italic' }}>worked</span>,<br/>
        read in the language you build in.
      </h1>
      <div style={{ display: 'flex', gap: 80, marginTop: 40, paddingTop: 24, borderTop: '1px solid rgba(26,24,20,0.2)' }}>
        <div style={{ fontSize: 14, lineHeight: 1.55, color: '#3A352D', maxWidth: 480, columnCount: 2, columnGap: 32 }}>
          IndieRadarは、Hacker News・Product Hunt・Reddit・X・Indie Hackersから収益化に成功した事例だけを抽出し、9言語で再配信する monetization intelligence デスクです。読むためではなく、明日の行動のために。
        </div>
        <div style={{ flex: 1, fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#5C544A', letterSpacing: '0.08em', lineHeight: 2 }}>
          <div>EDITORIAL_ AI + HUMAN</div>
          <div>SOURCES_ 6 ACTIVE</div>
          <div>UPDATED_ EVERY 4H</div>
          <div>READ TIME_ 4MIN AVG</div>
        </div>
      </div>
    </div>

    {/* Filter row */}
    <div style={{ padding: '20px 40px', borderBottom: '1px solid #1A1814', display: 'flex', gap: 24, alignItems: 'center', fontSize: 13, fontFamily: 'Fraunces, serif' }}>
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.18em', color: '#5C544A' }}>SECTIONS —</span>
      {['All', 'Hacker News', 'Product Hunt', 'Reddit', 'X', 'Indie Hackers', 'Field Reports'].map((t, i) => (
        <span key={t} style={{
          fontStyle: i === 0 ? 'italic' : 'normal',
          color: i === 0 ? '#9C2A1B' : '#1A1814',
          fontWeight: i === 0 ? 500 : 400,
          borderBottom: i === 0 ? '1px solid #9C2A1B' : 'none',
          paddingBottom: 2
        }}>{t}</span>
      ))}
    </div>

    {/* Editorial layout: lead + side */}
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', borderBottom: '1px solid #1A1814' }}>
      <div style={{ padding: '40px', borderRight: '1px solid #1A1814' }}>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.18em', color: '#9C2A1B', marginBottom: 16 }}>LEAD CASE · HACKER NEWS · 6H</div>
        <h2 style={{ fontFamily: 'Fraunces, serif', fontWeight: 300, fontSize: 44, lineHeight: 1.05, letterSpacing: '-0.02em', margin: '0 0 16px' }}>
          {ARTICLES[0].title}
        </h2>
        <p style={{ fontSize: 16, lineHeight: 1.6, color: '#3A352D', maxWidth: 640, margin: '0 0 24px' }}>{ARTICLES[0].desc}</p>
        <div style={{
          aspectRatio: '16/8', background: 'repeating-linear-gradient(45deg, #E8DFC9, #E8DFC9 12px, #DDD2B8 12px, #DDD2B8 24px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: '#7C7367', letterSpacing: '0.18em', marginBottom: 20
        }}>FIGURE 01 · SCREENSHOT / DASHBOARD</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', borderTop: '1px solid rgba(26,24,20,0.2)', paddingTop: 16 }}>
          <span style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 14, color: '#5C544A' }}>Translated · 日本語 · English · 한국어</span>
          <span style={{ fontFamily: 'Fraunces, serif', fontSize: 32, fontWeight: 300 }}>$42K <span style={{ fontSize: 13, color: '#5C544A', fontStyle: 'italic' }}>monthly · +38%</span></span>
        </div>
      </div>
      <div>
        {ARTICLES.slice(1).map((a, i) => (
          <div key={i} style={{ padding: '24px 32px', borderBottom: i < 2 ? '1px solid rgba(26,24,20,0.15)' : 'none' }}>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9, letterSpacing: '0.18em', color: '#9C2A1B', marginBottom: 8 }}>
              {a.source.toUpperCase()} · {a.age.toUpperCase()}
            </div>
            <h3 style={{ fontFamily: 'Fraunces, serif', fontWeight: 400, fontSize: 19, lineHeight: 1.25, margin: '0 0 8px' }}>{a.title}</h3>
            <p style={{ fontSize: 12, color: '#5C544A', lineHeight: 1.5, margin: 0 }}>{a.desc.slice(0, 110)}…</p>
            <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#7C7367', letterSpacing: '0.06em' }}>
              <span>{a.lang.length} LANGS</span>
              <span style={{ fontFamily: 'Fraunces, serif', fontStyle: 'italic', fontSize: 14, color: '#1A1814' }}>{a.mrr}/mo</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// OPTION C — INTEL DASHBOARD
// dense data ops · cool slate · electric cyan · grid-heavy
// ─────────────────────────────────────────────────────────────
const OptionC = () => (
  <div style={{
    width: 1180, background: '#0E1117', color: '#D8DEE8',
    fontFamily: 'Inter, system-ui, sans-serif',
    border: '1px solid #1B2230'
  }}>
    {/* Top */}
    <div style={{ display: 'flex', alignItems: 'center', height: 52, padding: '0 24px', borderBottom: '1px solid #1B2230', fontSize: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'JetBrains Mono, monospace' }}>
        <div style={{ width: 18, height: 18, border: '1.5px solid #5EE3D4', borderRadius: '50%', position: 'relative' }}>
          <div style={{ position: 'absolute', inset: '40%', background: '#5EE3D4', borderRadius: '50%' }} />
        </div>
        <span style={{ letterSpacing: '0.12em', fontWeight: 600 }}>INDIERADAR<span style={{ color: '#5EE3D4' }}>::</span>OPS</span>
      </div>
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: 4, fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}>
        {['feed', 'sources', 'operators', 'stack', 'archive'].map((t, i) => (
          <span key={t} style={{
            padding: '6px 14px',
            background: i === 0 ? '#5EE3D4' : 'transparent',
            color: i === 0 ? '#0E1117' : '#7E8AA0',
            letterSpacing: '0.08em', textTransform: 'lowercase'
          }}>/{t}</span>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#7E8AA0' }}>
        <span>↗ uplink stable</span>
        <span style={{ padding: '4px 10px', border: '1px solid #2A3344' }}>jp · 9 langs</span>
        <span style={{ padding: '4px 12px', background: '#1B2230', color: '#D8DEE8' }}>auth</span>
      </div>
    </div>

    {/* KPI strip */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', borderBottom: '1px solid #1B2230', fontFamily: 'JetBrains Mono, monospace' }}>
      {[
        ['scanned/24h', '247', '#5EE3D4'],
        ['cleared', '38', '#D8DEE8'],
        ['mrr_total', '$1.84M', '#5EE3D4'],
        ['active_src', '6', '#D8DEE8'],
        ['langs', '9', '#D8DEE8'],
        ['next_sweep', '3:48', '#F5C26B'],
      ].map(([k, v, c]) => (
        <div key={k} style={{ padding: '18px 20px', borderRight: '1px solid #1B2230' }}>
          <div style={{ fontSize: 9, letterSpacing: '0.18em', color: '#5C6678', marginBottom: 8 }}>{k.toUpperCase()}</div>
          <div style={{ fontSize: 22, fontFamily: 'Fraunces, serif', fontWeight: 300, color: c, letterSpacing: '-0.02em' }}>{v}</div>
        </div>
      ))}
    </div>

    {/* Hero band */}
    <div style={{ padding: '40px 24px 32px', borderBottom: '1px solid #1B2230', display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 40 }}>
      <div>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.18em', color: '#5EE3D4', marginBottom: 14 }}>
          ▶ live feed · monetization signal · lang_jp
        </div>
        <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 48, fontWeight: 300, lineHeight: 1.05, letterSpacing: '-0.025em', margin: '0 0 14px' }}>
          Discovery operations<br/>for builders who <span style={{ fontStyle: 'italic', color: '#5EE3D4' }}>plan to act</span>.
        </h1>
        <p style={{ fontSize: 13, color: '#9AA3B5', maxWidth: 540, lineHeight: 1.6, margin: 0, fontFamily: 'JetBrains Mono, monospace' }}>
          // pipeline ingests &gt;240 cases / 24h<br/>
          // routes through revenue + traction + relevance filters<br/>
          // re-broadcasts in 9 languages with extraction notes
        </p>
      </div>
      <div style={{ background: '#0A0D13', border: '1px solid #1B2230', padding: 20 }}>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.18em', color: '#7E8AA0', marginBottom: 14 }}>SOURCE DISTRIBUTION · 7D</div>
        {[['hn', 38, '#FF6600'], ['ph', 22, '#DA552F'], ['reddit', 19, '#FF4500'], ['x', 12, '#9AA3B5'], ['ih', 9, '#5EE3D4']].map(([s, w, c]) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, fontFamily: 'JetBrains Mono, monospace', fontSize: 10 }}>
            <span style={{ width: 28, color: '#7E8AA0' }}>{s}</span>
            <div style={{ flex: 1, height: 6, background: '#1B2230', position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 0, width: `${w * 2.4}%`, background: c, opacity: 0.85 }} />
            </div>
            <span style={{ color: '#D8DEE8', width: 28, textAlign: 'right' }}>{w}%</span>
          </div>
        ))}
      </div>
    </div>

    {/* Filter / table */}
    <div style={{ padding: '12px 24px', borderBottom: '1px solid #1B2230', display: 'flex', gap: 6, fontFamily: 'JetBrains Mono, monospace', fontSize: 10, alignItems: 'center', color: '#7E8AA0' }}>
      <span style={{ letterSpacing: '0.18em', marginRight: 12 }}>FILTER ::</span>
      {['all', 'hn', 'ph', 'reddit', 'x', 'ih', 'user'].map((t, i) => (
        <span key={t} style={{ padding: '5px 10px', background: i === 0 ? '#5EE3D4' : '#1B2230', color: i === 0 ? '#0E1117' : '#9AA3B5', letterSpacing: '0.08em' }}>{t}</span>
      ))}
      <span style={{ marginLeft: 'auto', letterSpacing: '0.12em' }}>order_by mrr_delta · window 7d · query —</span>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: '40px 80px 1fr 100px 90px 90px 80px', padding: '10px 24px', borderBottom: '1px solid #1B2230', fontFamily: 'JetBrains Mono, monospace', fontSize: 9, color: '#5C6678', letterSpacing: '0.18em' }}>
      <span>#</span><span>SRC</span><span>TITLE / EXTRACTION</span><span style={{ textAlign: 'right' }}>MRR</span><span style={{ textAlign: 'right' }}>Δ7D</span><span>LANGS</span><span style={{ textAlign: 'right' }}>HEAT</span>
    </div>
    {ARTICLES.map((a, i) => (
      <div key={i} style={{
        display: 'grid', gridTemplateColumns: '40px 80px 1fr 100px 90px 90px 80px',
        padding: '14px 24px', borderBottom: '1px solid #1B2230', fontSize: 12,
        alignItems: 'center', fontFamily: 'JetBrains Mono, monospace', color: '#9AA3B5'
      }}>
        <span style={{ color: '#5C6678' }}>{String(i + 1).padStart(2, '0')}</span>
        <span style={{ color: a.src_color }}>● {a.source.toLowerCase()}</span>
        <div>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: '#E8ECF3', marginBottom: 3, letterSpacing: '-0.005em' }}>{a.title}</div>
          <div style={{ fontSize: 11, color: '#7E8AA0' }}>// {a.tag} · translated → {a.lang.join(' / ')}</div>
        </div>
        <span style={{ textAlign: 'right', color: '#5EE3D4', fontSize: 14 }}>{a.mrr}</span>
        <span style={{ textAlign: 'right', color: '#7BD992' }}>{a.delta}</span>
        <span style={{ fontSize: 10 }}>{a.lang.length}/9</span>
        <div style={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          {[1, 2, 3, 4, 5].map(n => (
            <div key={n} style={{ width: 4, height: 16, background: n <= a.heat ? '#5EE3D4' : '#1B2230' }} />
          ))}
        </div>
      </div>
    ))}
  </div>
);

// ─── Direction summary cards ─────────────────────────────
const DirCard = ({ code, name, jp, recommended, sections }) => (
  <div style={{
    width: 600, background: '#0B0B0C', border: recommended ? '1px solid #D4A24A' : '1px solid #1F1F22',
    fontFamily: 'Inter, system-ui, sans-serif', color: '#E8E6E1', padding: 36
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.18em', color: recommended ? '#D4A24A' : '#9A8F7A' }}>{code}</div>
      {recommended && <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, letterSpacing: '0.18em', color: '#D4A24A' }}>★ RECOMMENDED</div>}
    </div>
    <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: 36, fontWeight: 300, letterSpacing: '-0.02em', margin: '0 0 4px' }}>{name}</h2>
    <div style={{ fontSize: 13, color: '#9A8F7A', marginBottom: 24 }}>{jp}</div>
    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', rowGap: 14, columnGap: 20, fontSize: 12 }}>
      {sections.map(([k, v]) => (
        <React.Fragment key={k}>
          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: '#9A8F7A', letterSpacing: '0.12em', paddingTop: 2 }}>{k}</div>
          <div style={{ color: '#C8C3BA', lineHeight: 1.55 }}>{v}</div>
        </React.Fragment>
      ))}
    </div>
  </div>
);

const Direction_A = () => <DirCard code="DIR-01 / TERMINAL EDITION" recommended name="Signal Terminal" jp="シグナル・ターミナル — 知的・硬派・上昇志向"
  sections={[
    ['世界観', 'Bloomberg端末 × Aesop × Notion。プレミアムなインテリジェンス・デスク。'],
    ['配色', '黒地 #0B0B0C / 紙白 #E8E6E1 / 単一アンバー #D4A24A をシグナル色として点で使う。鮮やかな青や紫は不使用。'],
    ['タイポ', 'Fraunces (見出し / 知性) + Inter (本文) + JetBrains Mono (データ・状態表示)。'],
    ['レイアウト', 'リスト型シグナルテーブル。番号・ソース・タイトル・MRR・Heat・→ で1行=1機会。'],
    ['ヘッダー', '中央にSIGNALS/SOURCES/OPERATORS/LIBRARY、右に LIVE pulse + 9 LANGS。'],
    ['ヒーロー', '走査ステータス行 + Fraunceの大見出し + 247scanned/38cleared など事実で熱量を出す。'],
    ['カード', '横長行型。sourceの色枠 + MRR金色 + heat メーター + 多言語チップ。'],
    ['フィルター', 'SOURCE_ HN / PH / REDDIT … というモノスペース変数代入風。フィルターも装置に見える。'],
    ['多言語UI', '見出し近くに LANG_EXPAND JA→9 表記。常時可視で「これは多言語装置」と認識させる。'],
    ['Empty state', 'スキャン中の波形 / next sweep counter / 過去のクリア事例3件をプレビュー。期待感で待たせる。'],
    ['フッター', '密度高めの3列、LIVE/SCAN/LIBRARY/CHANGELOGなど運用サービス感。'],
    ['刺激する心理', '「ここに金になるヒントがある」「自分は装置を使う側だ」という上昇志向。'],
    ['Pros', '差別化最大。記事サイトでなく装置に見える。多言語性・スケール感・知性を全部両立。'],
    ['Cons', 'モノクロ寄りで派手さなし。ダークUIに慣れない層には硬く見える。'],
  ]}
/>;

const Direction_B = () => <DirCard code="DIR-02 / EDITORIAL JOURNAL" name="Editorial Journal"
  jp="エディトリアル・ジャーナル — 高級・落ち着き・思考の場"
  sections={[
    ['世界観', 'The Economist × MITテクレビ × Monocle。プレミアムな経済紙の世界観。'],
    ['配色', 'クリーム #F5F1E8 / インク #1A1814 / アクセント深紅 #9C2A1B。紙の質感。'],
    ['タイポ', 'Fraunces大見出し + Inter本文 + Mono(発行号・指標)。Fraunces italicで知性を演出。'],
    ['レイアウト', 'マスト+リード+サイドの3区画。号数(ISSUE 184)で発行物として演出。'],
    ['ヘッダー', '紙面風のロゴ + 中央セクション(イタリック) + ISSUE番号。'],
    ['ヒーロー', '大見出し + リード(2段組) + Mono指標。読者を編集部の客にする。'],
    ['カード', 'リード記事(大)+周辺記事(小)。MRRはイタリックで控えめ。'],
    ['フィルター', 'Sectionsという紙面メタファ。所属でなく分類として扱う。'],
    ['多言語UI', 'Translated · 日本語 · 한국어 のように本文の延長として表示。'],
    ['Empty state', '"Press is in." 風の上品なメッセージ。次号の入稿時間を表示。'],
    ['フッター', '紙面奥付スタイル。発行人・編集部・連絡先・購読プラン。'],
    ['刺激する心理', '「自分は知的な情報源にアクセスしている」という所属感。'],
    ['Pros', '差別化大。"読み物として深い"印象。長期ブランド資産になりやすい。'],
    ['Cons', '"装置感"は弱い。データベース/AIツール感は薄れる。明るい紙面なので野心の熱量はやや控えめ。'],
  ]}
/>;

const Direction_C = () => <DirCard code="DIR-03 / INTEL DASHBOARD" name="Intel Dashboard"
  jp="インテル・ダッシュボード — 運用・密度・操作"
  sections={[
    ['世界観', 'Linear × Bloomberg × Hex.tech。情報運用ツール寄り。'],
    ['配色', '深いスレート #0E1117 / 紙青 #D8DEE8 / 電子シアン #5EE3D4 / 警告アンバー #F5C26B。'],
    ['タイポ', 'Inter (UI) + JetBrains Mono (データ・コマンド) 主体。Fraunceは見出しのみ。'],
    ['レイアウト', '上にKPIストリップ、ヒーロー横にソース分布、下にdense table。'],
    ['ヘッダー', '/feed /sources /operators ... CLI風タブ。LIVE状態を常に表示。'],
    ['ヒーロー', 'コマンドコメント風サブテキスト + 大見出し。データ可視化が右隣に。'],
    ['カード', '行型。MRR・Δ・heat・langが等幅で並ぶ。Excelでなく装置に見える密度。'],
    ['フィルター', 'order_by mrr_delta · window 7d 風、SQL/CLIメタファ。'],
    ['多言語UI', '4/9 のように"配信進捗"として見せる。translation indicator化。'],
    ['Empty state', 'console: awaiting next sweep · ascii radar pulse。'],
    ['フッター', '運用ステータス、API status、changelog、SLA。'],
    ['刺激する心理', '「これはプロのツールだ」という運用者プライド。'],
    ['Pros', '機能感・スケール感最大。data/dev/ops 文脈の信頼が高い。'],
    ['Cons', '"読み物としての温度"が出にくい。一般読者には冷たく見える可能性。AIっぽさを抑えにくい。'],
  ]}
/>;

Object.assign(window, {
  OptionA, OptionB, OptionC,
  Direction_A, Direction_B, Direction_C,
});
