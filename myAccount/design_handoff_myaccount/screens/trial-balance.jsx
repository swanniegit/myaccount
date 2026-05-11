// TRIAL BALANCE + VAT 201 — 4 variations.

function TB_V1_LedgerBook() {
  return (
    <Frame title="Trial Balance" subtitle="V1 · Ledger Book — paper trial balance, March '26">
      <div style={{ padding: 14, height:'100%', background: 'repeating-linear-gradient(to bottom, transparent 0 24px, rgba(31,42,68,0.05) 24px 25px)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom: 6 }}>
          <div style={{ fontFamily:'Caveat', fontSize:22 }}>Trial Balance — 31 March 2026</div>
          <SBtn small>Print / Sign</SBtn>
        </div>
        <table style={{ width:'100%', borderCollapse:'collapse', fontFamily:'JetBrains Mono', fontSize:12 }}>
          <thead style={{ fontFamily:'Patrick Hand', fontSize:13, borderBottom:`2px solid ${ink}` }}>
            <tr><th align="left">Code</th><th align="left">Account</th><th align="right">Debit</th><th align="right">Credit</th></tr>
          </thead>
          <tbody>
            {[
              ['1000','FNB Cheque','—','641.00'],
              ['1010','Petty Cash','700.00','—'],
              ['1100','Accounts Receivable','20,600.00','—'],
              ['1500','Stock on hand','45,600.00','—'],
              ['1700','Equipment','38,000.00','—'],
              ['2000','Accounts Payable','—','36,950.00'],
              ['2200','VAT Control','—','3,360.00'],
              ['2500','Loan — Nedbank','—','60,000.00'],
              ['3000','Owner equity','—','40,000.00'],
              ['4000','Sales','—','62,993.00'],
              ['5100','Rent','32,000.00','—'],
              ['5200','Utilities','4,820.00','—'],
              ['5300','Wages','36,000.00','—'],
              ['5400','Other','25,224.00','—'],
            ].map((r,i)=>(
              <tr key={i} style={{ borderBottom:`1px dotted ${muted}` }}>
                <td style={{ padding:'3px 4px' }}>{r[0]}</td>
                <td style={{ fontFamily:'Patrick Hand', fontSize:13 }}>{r[1]}</td>
                <td align="right">{r[2]}</td><td align="right">{r[3]}</td>
              </tr>
            ))}
            <tr style={{ borderTop:`2px solid ${ink}`, fontWeight:700, background: accentSoft }}>
              <td colSpan="2" style={{ padding:'5px 4px', fontFamily:'Patrick Hand', fontSize:14 }}>Totals</td>
              <td align="right">202,944.00</td><td align="right">202,944.00</td>
            </tr>
          </tbody>
        </table>
        <Note style={{ marginTop: 8 }}>✓ Balanced  · IFRS for SMEs compliant</Note>
      </div>
    </Frame>
  );
}

function TB_V2_ModernCards() {
  return (
    <Frame title="Reports" subtitle="V2 · Modern — statements as cards, TB as one">
      <div style={{ display:'flex', height:'100%' }}>
        <SideNav items={['Trial Bal.','Income','Balance Sh.','Cash flow','VAT 201','SARS pack']} active="Trial Bal." />
        <div style={{ flex:1, padding: 12 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom: 8 }}>
            <div style={{ fontFamily:'Caveat', fontSize:20 }}>Trial Balance · Mar 2026</div>
            <div style={{ display:'flex', gap: 6 }}>
              <SBtn small>Compare ▾</SBtn><SBtn small>Export PDF</SBtn><SBtn primary small>To SARS eFiling</SBtn>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap: 8, marginBottom: 10 }}>
            {[['Assets','R 104,259','#'],['Liabilities','R 100,310','#'],['Equity','R 40,000','#'],['Income','R 62,993','#'],['Expense','R 98,044','#']].map(([k,v],i)=>(
              <SBox key={i} pad={8} fill="#fff">
                <div style={{ fontFamily:'Patrick Hand', fontSize:11, color: ink2 }}>{k}</div>
                <div style={{ fontFamily:'JetBrains Mono', fontSize:14, fontWeight:700 }}>{v}</div>
              </SBox>
            ))}
          </div>
          <table style={{ width:'100%', borderCollapse:'collapse', fontFamily:'JetBrains Mono', fontSize:11 }}>
            <thead style={{ fontFamily:'Patrick Hand', fontSize:12, borderBottom:`1.5px solid ${ink}` }}>
              <tr><th align="left">Account</th><th align="right">Dr</th><th align="right">Cr</th><th align="right">vs Feb</th></tr>
            </thead>
            <tbody>
              {[
                ['Cash & equivalents','59','—','▲'],
                ['Receivables','20,600','—','▲'],
                ['Inventory','45,600','—','▲'],
                ['Payables','—','36,950','▲'],
                ['VAT Control','—','3,360','▲'],
                ['Sales','—','62,993','▲'],
                ['Operating expenses','98,044','—','▲'],
              ].map((r,i)=>(
                <tr key={i} style={{ borderBottom:`1px dotted ${muted}` }}>
                  <td style={{ padding:'3px 4px', fontFamily:'Patrick Hand', fontSize:13 }}>{r[0]}</td>
                  <td align="right">{r[1]}</td><td align="right">{r[2]}</td><td align="right" style={{ color:accent }}>{r[3]}</td>
                </tr>
              ))}
              <tr style={{ borderTop:`1.5px solid ${ink}`, fontWeight:700, background: accentSoft }}>
                <td style={{ padding:'4px 4px', fontFamily:'Patrick Hand', fontSize:13 }}>Totals</td>
                <td align="right">202,944</td><td align="right">202,944</td><td/>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </Frame>
  );
}

function TB_V3_BalanceScale() {
  // Novel: TB as a physical balance scale, Dr vs Cr
  return (
    <Frame title="Trial Balance" subtitle="V3 · Balance Scale  ✦ novel — see balance physically">
      <div style={{ padding: 14, height:'100%', position:'relative' }}>
        <div style={{ fontFamily:'Caveat', fontSize:20 }}>Are the books balanced?</div>
        <div style={{ fontFamily:'Patrick Hand', fontSize:12, color: ink2 }}>If the beam tilts, find the missing entry.</div>

        <svg viewBox="0 0 700 320" style={{ width:'100%', height: 320, marginTop: 6 }}>
          {/* pillar */}
          <line x1="350" y1="80" x2="350" y2="280" stroke={ink} strokeWidth="3"/>
          <polygon points="320,290 380,290 360,280 340,280" fill={ink}/>
          <line x1="280" y1="290" x2="420" y2="290" stroke={ink} strokeWidth="3"/>
          {/* beam (slight balance) */}
          <line x1="120" y1="80" x2="580" y2="80" stroke={ink} strokeWidth="3"/>
          {/* left chain */}
          <line x1="180" y1="80" x2="180" y2="140" stroke={ink2} strokeWidth="1.5" strokeDasharray="3 3"/>
          <line x1="520" y1="80" x2="520" y2="140" stroke={ink2} strokeWidth="1.5" strokeDasharray="3 3"/>
          {/* pans */}
          <ellipse cx="180" cy="150" rx="90" ry="12" fill="#fff" stroke={ink} strokeWidth="2"/>
          <ellipse cx="520" cy="150" rx="90" ry="12" fill="#fff" stroke={ink} strokeWidth="2"/>
          <text x="180" y="76" fontFamily="Caveat" fontSize="22" textAnchor="middle" fill={ink}>DEBITS</text>
          <text x="520" y="76" fontFamily="Caveat" fontSize="22" textAnchor="middle" fill={ink}>CREDITS</text>
          {/* stacked weights = accounts, height ~ amount */}
          {[['Cash',12],['AR',35],['Stock',60],['Equip',45],['Expense',90]].map((a,i)=>{
            const heights = [12,35,60,45,90];
            let y = 148; for (let k=0;k<i;k++) y -= heights[k]/2;
            const h = a[1]/2;
            return <g key={i}>
              <rect x={180 - 40 - i*4} y={y - h} width={80 + i*8} height={h} fill={accentSoft} stroke={ink}/>
              <text x={180} y={y - h/2 + 4} fontFamily="Patrick Hand" fontSize="11" textAnchor="middle">{a[0]}</text>
            </g>;
          })}
          {[['AP',37],['VAT',4],['Loan',60],['Equity',40],['Sales',63]].map((a,i)=>{
            const heights = [37,4,60,40,63];
            let y = 148; for (let k=0;k<i;k++) y -= heights[k]/2;
            const h = a[1]/2;
            return <g key={i}>
              <rect x={520 - 40 - i*4} y={y - h} width={80 + i*8} height={h} fill="#fff" stroke={ink}/>
              <text x={520} y={y - h/2 + 4} fontFamily="Patrick Hand" fontSize="11" textAnchor="middle">{a[0]}</text>
            </g>;
          })}
          <text x="350" y="310" fontFamily="Caveat" fontSize="20" fill={accent} textAnchor="middle">⚖ Balanced  R 202,944 = R 202,944</text>
        </svg>
        <div style={{ display:'flex', justifyContent:'space-between' }}>
          <Note>Tap any block → drill to that account's T</Note>
          <SBtn primary small>Sign-off period</SBtn>
        </div>
      </div>
    </Frame>
  );
}

function TB_V4_SplitGrid() {
  return (
    <Frame title="Trial Balance + VAT 201" subtitle="V4 · Split Grid — TB on left, SARS VAT 201 ready on right">
      <div style={{ display:'grid', gridTemplateColumns:'1.2fr 1fr', height:'100%' }}>
        <div style={{ borderRight:`1.5px solid ${ink}`, padding: 10, overflow:'hidden' }}>
          <div style={{ fontFamily:'Caveat', fontSize:18 }}>Trial Balance · Mar 26</div>
          <table style={{ width:'100%', borderCollapse:'collapse', fontFamily:'JetBrains Mono', fontSize:11, marginTop: 6 }}>
            <thead style={{ fontFamily:'Patrick Hand', fontSize:12, borderBottom:`1.5px solid ${ink}` }}>
              <tr><th align="left">Acc</th><th align="right">Dr</th><th align="right">Cr</th></tr>
            </thead>
            <tbody>
              {[
                ['FNB Cheque','—','641'],
                ['Petty Cash','700','—'],
                ['AR','20,600','—'],
                ['Stock','45,600','—'],
                ['Equipment','38,000','—'],
                ['AP','—','36,950'],
                ['VAT Control','—','3,360'],
                ['Loan','—','60,000'],
                ['Equity','—','40,000'],
                ['Sales','—','62,993'],
                ['Rent','32,000','—'],
                ['Util.','4,820','—'],
                ['Wages','36,000','—'],
                ['Other','25,224','—'],
              ].map((r,i)=>(
                <tr key={i} style={{ borderBottom:`1px dotted ${muted}`, background: r[0]==='VAT Control'?accentSoft:'transparent' }}>
                  <td style={{ padding:'2px 4px', fontFamily:'Patrick Hand', fontSize:12 }}>{r[0]}</td>
                  <td align="right">{r[1]}</td><td align="right">{r[2]}</td>
                </tr>
              ))}
              <tr style={{ borderTop:`1.5px solid ${ink}`, fontWeight:700 }}>
                <td style={{ padding:'3px 4px', fontFamily:'Patrick Hand', fontSize:13 }}>Σ</td>
                <td align="right">202,944</td><td align="right">202,944</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div style={{ padding: 12, background: paperEdge + '40' }}>
          <div style={{ fontFamily:'Caveat', fontSize:18 }}>VAT 201 — preview</div>
          <div style={{ fontFamily:'Patrick Hand', fontSize:11, color: ink2 }}>Period 202603 · standard 15%</div>
          <Squiggle style={{ margin:'4px 0 8px' }}/>
          {[
            ['1. Standard rated supplies','62,993.00'],
            ['4. Total output tax (15%)','9,449.00'],
            ['14. Capital goods','—'],
            ['15. Other goods/services','38,720.00'],
            ['18. Input tax — std','5,808.00'],
            ['20. Total input tax','5,808.00'],
          ].map(([k,v],i)=>(
            <div key={i} style={{ display:'flex', justifyContent:'space-between', fontFamily:'Patrick Hand', fontSize:12, padding:'3px 0', borderBottom:`1px dotted ${muted}` }}>
              <span>{k}</span><span style={{ fontFamily:'JetBrains Mono', fontSize:11 }}>{v}</span>
            </div>
          ))}
          <div style={{ display:'flex', justifyContent:'space-between', marginTop: 6, fontFamily:'Caveat', fontSize:18 }}>
            <span>Payable to SARS</span><span style={{ color: accent }}>R 3,641.00</span>
          </div>
          <div style={{ display:'flex', gap: 6, marginTop: 10 }}>
            <SBtn small>Review</SBtn><SBtn primary small>File via eFiling →</SBtn>
          </div>
          <Note style={{ marginTop: 8 }}>SARS deadline · 25 May 2026 (14 days)</Note>
        </div>
      </div>
    </Frame>
  );
}

window.TB = { V1: TB_V1_LedgerBook, V2: TB_V2_ModernCards, V3: TB_V3_BalanceScale, V4: TB_V4_SplitGrid };
