// Shared sketchy wireframe primitives.
// Off-white paper, ink-blue strokes, slight wobble.

const ink = 'var(--ink, #1f2a44)';
const ink2 = 'var(--ink-2, #4b5470)';
const paper = 'var(--paper, #faf7f0)';
const paperEdge = 'var(--paper-edge, #ece6d4)';
const accent = 'var(--accent, #d97757)';
const accentSoft = 'var(--accent-soft, #f4d7c8)';
const muted = 'var(--muted, #b8b09a)';

// A wavy/sketchy border using SVG filter for a hand-drawn feel
const wobble = { filter: 'url(#wobble)' };

// Hatched fill for image/placeholder regions
function Hatch({ w = '100%', h = 40, label, dense, style }) {
  const stripe = dense ? 5 : 8;
  return (
    <div style={{
      width: w, height: h,
      backgroundImage: `repeating-linear-gradient(135deg, ${ink2} 0 1px, transparent 1px ${stripe}px)`,
      border: `1.5px dashed ${ink2}`,
      borderRadius: 3,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: ink2, fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
      letterSpacing: 0.4,
      ...style
    }}>{label ? `// ${label}` : ''}</div>
  );
}

// Sketchy box: irregular pen-stroke border
function SBox({ children, style, pad = 12, rotate = 0, dashed, fill, accent: useAccent, onClick, title }) {
  return (
    <div onClick={onClick} title={title} style={{
      border: `${dashed ? '1.5px dashed' : '2px solid'} ${useAccent ? accent : ink}`,
      borderRadius: 4,
      padding: pad,
      background: fill || 'transparent',
      transform: `rotate(${rotate}deg)`,
      position: 'relative',
      cursor: onClick ? 'pointer' : 'default',
      ...style,
    }}>{children}</div>
  );
}

// Sketchy button shape
function SBtn({ children, primary, small, style }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: small ? '4px 10px' : '6px 14px',
      border: `1.8px solid ${ink}`,
      borderRadius: 18,
      background: primary ? accent : paper,
      color: primary ? '#fff' : ink,
      fontFamily: 'Patrick Hand, sans-serif',
      fontSize: small ? 13 : 15,
      lineHeight: 1,
      boxShadow: primary ? `2px 2px 0 ${ink}` : 'none',
      ...style,
    }}>{children}</div>
  );
}

// Input field placeholder
function SField({ label, value, w = 160, style }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, ...style }}>
      {label && <div style={{ fontFamily: 'Patrick Hand', fontSize: 11, color: ink2 }}>{label}</div>}
      <div style={{
        width: w, height: 26, borderRadius: 3,
        border: `1.5px solid ${ink}`,
        background: '#fff',
        padding: '4px 8px',
        fontFamily: value && /^[\d.,R\-]+$/.test(value) ? 'JetBrains Mono, monospace' : 'Patrick Hand',
        fontSize: 13, color: value ? ink : muted,
        display: 'flex', alignItems: 'center',
      }}>{value || '_____'}</div>
    </div>
  );
}

// The hero T-account shape
function TAccount({ name, debits = [], credits = [], balance, w = 240, h, accentTop, compact }) {
  const lineH = compact ? 18 : 22;
  const rows = Math.max(debits.length, credits.length, 3);
  const bodyH = h || (rows * lineH + 16);
  return (
    <div style={{ width: w, fontFamily: 'Patrick Hand', color: ink, position: 'relative' }}>
      <div style={{
        textAlign: 'center', fontFamily: 'Caveat', fontSize: 18, fontWeight: 700,
        paddingBottom: 4, color: accentTop ? accent : ink,
      }}>{name}</div>
      {/* The T */}
      <div style={{ borderTop: `2.5px solid ${ink}`, position: 'relative' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2px 1fr', minHeight: bodyH }}>
          {/* Debit side */}
          <div style={{ padding: '4px 8px' }}>
            <div style={{ fontSize: 10, color: ink2, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 }}>Dr</div>
            {debits.map((d, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between',
                fontFamily: 'JetBrains Mono', fontSize: 11, lineHeight: `${lineH}px`,
                color: d.highlight ? accent : ink,
              }}>
                <span style={{ fontFamily: 'Patrick Hand', fontSize: 13 }}>{d.label}</span>
                <span>{d.amount}</span>
              </div>
            ))}
          </div>
          <div style={{ background: ink }}></div>
          {/* Credit side */}
          <div style={{ padding: '4px 8px' }}>
            <div style={{ fontSize: 10, color: ink2, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2, textAlign: 'right' }}>Cr</div>
            {credits.map((c, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between',
                fontFamily: 'JetBrains Mono', fontSize: 11, lineHeight: `${lineH}px`,
                color: c.highlight ? accent : ink,
              }}>
                <span style={{ fontFamily: 'Patrick Hand', fontSize: 13 }}>{c.label}</span>
                <span>{c.amount}</span>
              </div>
            ))}
          </div>
        </div>
        {balance && (
          <div style={{
            borderTop: `1.5px dashed ${ink2}`,
            padding: '3px 8px', display: 'flex', justifyContent: 'space-between',
            fontFamily: 'JetBrains Mono', fontSize: 11, fontWeight: 600,
            background: accentSoft,
          }}>
            <span style={{ fontFamily: 'Patrick Hand', fontSize: 13 }}>Bal</span>
            <span>{balance}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Hand-drawn arrow callout
function Arrow({ from, to, dx = 0, dy = 0, label, color, curve = 30 }) {
  const c = color || accent;
  return (
    <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }}>
      <defs>
        <marker id="arr" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill={c} />
        </marker>
      </defs>
      <path
        d={`M${from[0]},${from[1]} Q${(from[0]+to[0])/2 + dx},${(from[1]+to[1])/2 + dy - curve} ${to[0]},${to[1]}`}
        fill="none" stroke={c} strokeWidth="1.8" markerEnd="url(#arr)" strokeDasharray="4 3"
      />
      {label && (
        <text x={(from[0]+to[0])/2 + dx} y={(from[1]+to[1])/2 + dy - curve - 4}
          fontFamily="Caveat" fontSize="15" fill={c} textAnchor="middle">{label}</text>
      )}
    </svg>
  );
}

// Squiggly underline / divider
function Squiggle({ w = '100%', color, style }) {
  const c = color || ink2;
  return (
    <svg width={w} height="6" style={{ display: 'block', ...style }} preserveAspectRatio="none" viewBox="0 0 100 6">
      <path d="M0,3 Q5,0 10,3 T20,3 T30,3 T40,3 T50,3 T60,3 T70,3 T80,3 T90,3 T100,3"
        fill="none" stroke={c} strokeWidth="1" />
    </svg>
  );
}

// A page-frame: header bar + label
function Frame({ title, subtitle, children, w = 720, h = 520 }) {
  return (
    <div style={{
      width: w, height: h,
      background: paper,
      border: `2px solid ${ink}`,
      borderRadius: 6,
      boxShadow: `4px 4px 0 ${paperEdge}`,
      position: 'relative',
      overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'Patrick Hand',
      color: ink,
    }}>
      {/* Browser-ish chrome */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '8px 12px', borderBottom: `1.5px solid ${ink}`,
        background: '#fff',
      }}>
        <div style={{ display: 'flex', gap: 4 }}>
          <div style={{ width: 9, height: 9, borderRadius: '50%', border: `1.2px solid ${ink}` }} />
          <div style={{ width: 9, height: 9, borderRadius: '50%', border: `1.2px solid ${ink}` }} />
          <div style={{ width: 9, height: 9, borderRadius: '50%', border: `1.2px solid ${ink}` }} />
        </div>
        <div style={{ flex: 1, height: 16, border: `1.2px solid ${ink2}`, borderRadius: 8, padding: '0 8px', fontFamily: 'JetBrains Mono', fontSize: 10, color: ink2, display: 'flex', alignItems: 'center' }}>
          myaccount.co.za / {title.toLowerCase().replace(/\s+/g, '-')}
        </div>
        <div style={{ fontFamily: 'Caveat', fontSize: 14, color: ink2 }}>🇿🇦 ZAR</div>
      </div>
      {/* Title row */}
      <div style={{ padding: '10px 16px 6px', borderBottom: `1.5px dashed ${ink2}` }}>
        <div style={{ fontFamily: 'Caveat', fontSize: 24, fontWeight: 700, lineHeight: 1 }}>{title}</div>
        {subtitle && <div style={{ fontFamily: 'Patrick Hand', fontSize: 12, color: ink2, marginTop: 2 }}>{subtitle}</div>}
      </div>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );
}

// Annotation pill (developer/designer note)
function Note({ children, style, color }) {
  const c = color || accent;
  return (
    <div style={{
      fontFamily: 'Caveat', fontSize: 14, color: c,
      border: `1.5px dashed ${c}`, borderRadius: 3,
      padding: '2px 8px', display: 'inline-block',
      background: 'rgba(255,255,255,0.7)',
      ...style,
    }}>{children}</div>
  );
}

// Sidebar nav helper
function SideNav({ items, active }) {
  return (
    <div style={{ width: 130, borderRight: `1.5px solid ${ink}`, padding: '8px 0', background: '#fff' }}>
      {items.map((it, i) => (
        <div key={i} style={{
          padding: '6px 12px', fontFamily: 'Patrick Hand', fontSize: 13,
          background: it === active ? accentSoft : 'transparent',
          borderLeft: it === active ? `3px solid ${accent}` : '3px solid transparent',
          color: ink,
        }}>{it}</div>
      ))}
    </div>
  );
}

// Top nav helper
function TopNav({ items, active }) {
  return (
    <div style={{
      display: 'flex', gap: 4, padding: '6px 12px',
      borderBottom: `1.5px solid ${ink}`, background: '#fff',
    }}>
      {items.map((it, i) => (
        <div key={i} style={{
          padding: '4px 10px', fontFamily: 'Patrick Hand', fontSize: 13,
          background: it === active ? ink : 'transparent',
          color: it === active ? paper : ink,
          borderRadius: 3,
        }}>{it}</div>
      ))}
    </div>
  );
}

// Money cell
const R = (n) => 'R' + n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

Object.assign(window, {
  Hatch, SBox, SBtn, SField, TAccount, Arrow, Squiggle, Frame, Note, SideNav, TopNav, R,
  ink, ink2, paper, paperEdge, accent, accentSoft, muted, wobble,
});
