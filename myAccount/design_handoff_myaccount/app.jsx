// Main wireframes app — orchestrates all screens × variations on the design canvas.

const SCREENS = [
  { id: 'dashboard', title: 'Dashboard', subtitle: 'Morning landing — what does Thandi see when she opens the books?', comp: window.Dashboard },
  { id: 'ledger', title: 'T-Account Ledger', subtitle: 'The hero — how do we present accounts when T-accounts are central?', comp: window.Ledger },
  { id: 'journal', title: 'Journal Entry', subtitle: 'Drag-to-post is the headline interaction. Where else does that idea bend?', comp: window.Journal },
  { id: 'trial', title: 'Trial Balance & VAT 201', subtitle: 'Period close + SARS submission — same primitives, different presentation.', comp: window.TB },
  { id: 'chart', title: 'Chart of Accounts', subtitle: 'The 47-account spine. List, treemap, edit.', comp: window.COA },
];

const VARIANTS = [
  { key: 'V1', label: 'V1 · Ledger Book' },
  { key: 'V2', label: 'V2 · Modern Cards' },
  { key: 'V3', label: 'V3 · Novel ✦' },
  { key: 'V4', label: 'V4 · Split Grid' },
];

// Tweakable defaults — accent + which variants to show
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#d97757",
  "showV1": true,
  "showV2": true,
  "showV3": true,
  "showV4": true
}/*EDITMODE-END*/;

const ACCENT_OPTIONS = [
  '#d97757', // warm orange (default)
  '#2a6fdb', // ink blue
  '#1f8a5b', // accountant green
  '#a23b72', // plum
];

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // Apply accent + derived accent-soft + ink palette globally
  React.useEffect(() => {
    if (!t.accent) return;
    const root = document.documentElement;
    root.style.setProperty('--accent', t.accent);
    // Build a soft tint of the accent
    const hex = t.accent.replace('#','');
    const r = parseInt(hex.slice(0,2),16), g = parseInt(hex.slice(2,4),16), b = parseInt(hex.slice(4,6),16);
    const mix = (c) => Math.round(c + (250-c)*0.78);
    root.style.setProperty('--accent-soft', `rgb(${mix(r)},${mix(g)},${mix(b)})`);
  }, [t.accent]);

  const visibleVariants = VARIANTS.filter(v => t['show'+v.key]);

  const overviewArtboard = (
    <DCArtboard id="intro" label="Read me first" width={760} height={520}>
      <div style={{
        width:'100%', height:'100%', background: 'var(--paper, #faf7f0)',
        border: `2px solid ${ink}`, borderRadius: 6, padding: 28,
        fontFamily: 'Patrick Hand', color: ink, position:'relative',
      }}>
        <div style={{ fontFamily:'Caveat', fontSize: 44, lineHeight: 1, marginBottom: 8 }}>
          myAccount — T-side accounting <span style={{color: 'var(--accent)'}}>wireframes</span>
        </div>
        <div style={{ fontFamily:'Patrick Hand', fontSize: 15, color: ink2, marginBottom: 18 }}>
          Small biz · South Africa · ZAR · SARS / VAT 15% · IFRS for SMEs
        </div>
        <Squiggle/>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 18, marginTop: 14 }}>
          <div>
            <div style={{ fontFamily:'Caveat', fontSize: 22, color:'var(--accent)' }}>The challenge</div>
            <div style={{ fontFamily:'Patrick Hand', fontSize: 14, marginTop: 4 }}>
              Build a desktop bookkeeping app for South African small business owners (not accountants) where T-accounts are a primary view — with novel interactions like drag-to-post. Compliant with SA tax law: VAT 15%, VAT 201, SARS eFiling, PAYE/UIF support, IFRS for SMEs.
            </div>
          </div>
          <div>
            <div style={{ fontFamily:'Caveat', fontSize: 22, color:'var(--accent)' }}>How to read this doc</div>
            <ul style={{ fontFamily:'Patrick Hand', fontSize: 14, paddingLeft: 18, lineHeight: 1.5 }}>
              <li>5 screens, 4 variations each (20 artboards).</li>
              <li>Rows are screens; columns are mental models.</li>
              <li>Click any artboard → fullscreen focus.</li>
              <li>Tweaks panel (right) → swap accent + filter variants.</li>
            </ul>
          </div>
        </div>
        <Squiggle style={{ margin: '18px 0 12px' }}/>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 10 }}>
          {[
            ['V1 Ledger Book','Paper metaphor. T-accounts everywhere. Most literal.'],
            ['V2 Modern Cards','Tables & cards default; T-account drill-down. Closest to Xero/Sage.'],
            ['V3 Novel ✦','Different per screen — money-flow graph, Sankey ledger, drag-to-post, balance scale, treemap.'],
            ['V4 Split Grid','Spreadsheet-density list + live T-account peek. Power-user.'],
          ].map(([h,b],i)=>(
            <div key={i} style={{ border:`1.5px solid ${ink2}`, borderRadius: 3, padding: 8 }}>
              <div style={{ fontFamily:'Caveat', fontSize: 16 }}>{h}</div>
              <div style={{ fontFamily:'Patrick Hand', fontSize: 12, color: ink2 }}>{b}</div>
            </div>
          ))}
        </div>
        <Note style={{ position:'absolute', bottom: 16, right: 24 }}>Stage 1: explore. No design committed yet.</Note>
      </div>
    </DCArtboard>
  );

  return (
    <>
      <DesignCanvas title="myAccount · T-Account Wireframes" subtitle="Stage 1 · 5 screens × 4 mental models">
        <DCSection id="overview" title="Overview">
          {overviewArtboard}
        </DCSection>
        {SCREENS.map(s => (
          <DCSection key={s.id} id={s.id} title={s.title} subtitle={s.subtitle}>
            {visibleVariants.map(v => {
              const Comp = s.comp[v.key];
              if (!Comp) return null;
              return (
                <DCArtboard key={v.key} id={`${s.id}-${v.key}`} label={`${s.title} · ${v.label}`} width={720} height={520}>
                  <Comp />
                </DCArtboard>
              );
            })}
          </DCSection>
        ))}
      </DesignCanvas>

      <TweaksPanel title="Tweaks">
        <TweakSection title="Accent">
          <TweakColor t={t} k="accent" options={ACCENT_OPTIONS} />
        </TweakSection>
        <TweakSection title="Show variations">
          <TweakToggle t={t} k="showV1" label="V1 · Ledger Book" />
          <TweakToggle t={t} k="showV2" label="V2 · Modern Cards" />
          <TweakToggle t={t} k="showV3" label="V3 · Novel ✦" />
          <TweakToggle t={t} k="showV4" label="V4 · Split Grid" />
        </TweakSection>
        <TweakSection title="Notes">
          <div style={{ fontFamily:'Patrick Hand', fontSize: 13, color: '#555', lineHeight: 1.4 }}>
            Tip — toggle off 3 variations to compare just two side-by-side at full width.
          </div>
        </TweakSection>
      </TweaksPanel>

      {/* SVG defs for sketch wobble filter (used by SBox via style) */}
      <svg width="0" height="0" style={{ position:'absolute' }}>
        <filter id="wobble">
          <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" result="t"/>
          <feDisplacementMap in="SourceGraphic" in2="t" scale="1.2"/>
        </filter>
      </svg>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
