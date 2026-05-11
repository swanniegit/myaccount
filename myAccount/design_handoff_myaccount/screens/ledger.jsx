// T-ACCOUNT LEDGER — the hero. 4 variations.

function Ledger_V1_LedgerBook() {
  return (
    <Frame title="T-Account Ledger" subtitle="V1 · Ledger Book — full-page T's, paper feel">
      <div style={{ padding: 14, height: '100%', background: 'repeating-linear-gradient(to bottom, transparent 0 28px, rgba(31,42,68,0.05) 28px 29px)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom: 8 }}>
          <div>
            <div style={{ fontFamily:'Caveat', fontSize:22, lineHeight:1 }}>General Ledger — March 2026</div>
            <div style={{ fontFamily:'Patrick Hand', fontSize:12, color:ink2 }}>5 of 47 accounts shown · 〈 prev page  next 〉</div>
          </div>
          <div style={{ display:'flex', gap:6 }}>
            <SBtn small>Filter ▾</SBtn><SBtn small>Period ▾</SBtn><SBtn primary small>＋ Account</SBtn>
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap: 14 }}>
          <TAccount name="1000 · FNB Cheque" w={200}
            debits={[{label:'Open', amount:'12,400'},{label:'INV-101', amount:'5,500'},{label:'INV-102', amount:'3,200'}]}
            credits={[{label:'Rent', amount:'8,000'},{label:'Eskom', amount:'1,741'},{label:'Wages', amount:'12,000'}]}
            balance="R(641.00) Dr" />
          <TAccount name="1100 · Accounts Recv" w={200}
            debits={[{label:'INV-100', amount:'8,200'},{label:'INV-103', amount:'12,400'}]}
            credits={[{label:'Receipt', amount:'8,200'}]}
            balance="R 12,400.00 Dr" />
          <TAccount name="2000 · Accounts Pay" w={200}
            debits={[{label:'Payment', amount:'1,741'}]}
            credits={[{label:'Eskom', amount:'1,741'},{label:'Supplier A', amount:'18,950'}]}
            balance="R 18,950.00 Cr" />
          <TAccount name="2200 · VAT Control" w={200} accentTop
            debits={[{label:'Input · Eskom', amount:'201'},{label:'Input · Stock', amount:'1,639'}]}
            credits={[{label:'Output · INV101', amount:'717'},{label:'Output · INV102', amount:'420'},{label:'Carried fwd', amount:'3,063'}]}
            balance="R 2,360.00 Cr" />
          <TAccount name="4000 · Sales" w={200}
            debits={[]}
            credits={[{label:'INV-100', amount:'7,130'},{label:'INV-101', amount:'4,783'},{label:'INV-102', amount:'2,780'}]}
            balance="R 14,693.00 Cr" />
          <TAccount name="5100 · Rent" w={200}
            debits={[{label:'March', amount:'8,000'}]}
            credits={[]}
            balance="R 8,000.00 Dr" />
        </div>
        <Note style={{ position:'absolute', bottom: 10, right: 14 }}>Every account is a T. Period.</Note>
      </div>
    </Frame>
  );
}

function Ledger_V2_ModernCards() {
  return (
    <Frame title="T-Account Ledger" subtitle="V2 · Modern — table by default, T on hover">
      <div style={{ display:'flex', height:'100%' }}>
        <SideNav items={['Assets','Liab.','Equity','Income','Expense','VAT']} active="Assets" />
        <div style={{ flex:1, padding: 10 }}>
          <div style={{ display:'flex', gap:6, marginBottom: 8 }}>
            <SField label="Search accounts" w={200} value="" />
            <SField label="Period" w={120} value="Mar 2026" />
            <div style={{ flex:1 }}/>
            <SBtn small>Export</SBtn><SBtn primary small>＋ Entry</SBtn>
          </div>
          <table style={{ width:'100%', borderCollapse:'collapse', fontFamily:'JetBrains Mono', fontSize:11 }}>
            <thead style={{ fontFamily:'Patrick Hand', fontSize:12, borderBottom:`1.5px solid ${ink}` }}>
              <tr>
                <th align="left">Code</th><th align="left">Account</th><th align="right">Open</th><th align="right">Dr</th><th align="right">Cr</th><th align="right">Close</th><th></th>
              </tr>
            </thead>
            <tbody>
              {[
                ['1000','FNB Cheque','12,400','8,700','21,741','(641)',true],
                ['1010','Petty Cash','500','200','0','700'],
                ['1100','Accounts Recv','8,200','20,600','8,200','20,600'],
                ['1500','Stock on hand','42,800','12,200','9,400','45,600'],
                ['2000','Accounts Pay','(18,000)','1,741','20,691','(36,950)'],
                ['2200','VAT Control','(1,223)','1,840','3,977','(3,360)'],
                ['3000','Owner equity','(40,000)','0','0','(40,000)'],
                ['4000','Sales','(48,300)','0','14,693','(62,993)'],
                ['5100','Rent','24,000','8,000','0','32,000'],
              ].map((r,i)=>(
                <tr key={i} style={{ borderBottom:`1px dotted ${muted}`, background: r[6]?accentSoft:'transparent' }}>
                  <td style={{ padding:'4px 4px' }}>{r[0]}</td>
                  <td style={{ fontFamily:'Patrick Hand', fontSize:13 }}>{r[1]}</td>
                  <td align="right">{r[2]}</td>
                  <td align="right">{r[3]}</td>
                  <td align="right">{r[4]}</td>
                  <td align="right" style={{ fontWeight:600 }}>{r[5]}</td>
                  <td align="center"><span style={{ fontFamily:'Caveat', fontSize:14, color: accent }}>⊥ peek</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Hover peek mock */}
          <div style={{ position:'absolute', right: 18, bottom: 14 }}>
            <SBox pad={6} fill="#fff" style={{ boxShadow: `3px 3px 0 ${paperEdge}` }}>
              <Note style={{ fontSize:11, padding:'0 6px', marginBottom:4 }}>Hover preview · FNB Cheque</Note>
              <TAccount name="1000 · FNB" w={180} compact
                debits={[{label:'Open', amount:'12,400'},{label:'Receipts', amount:'8,700'}]}
                credits={[{label:'Payments', amount:'21,741'}]}
                balance="R(641.00)" />
            </SBox>
          </div>
        </div>
      </div>
    </Frame>
  );
}

function Ledger_V3_MoneyFlow() {
  // Sankey-ish flow showing how one account's movements come from others
  return (
    <Frame title="T-Account Ledger" subtitle="V3 · Money Flow — Sankey-ish in & out  ✦ novel">
      <div style={{ display:'flex', height:'100%' }}>
        <div style={{ width: 150, borderRight:`1.5px solid ${ink}`, padding: 8, fontFamily:'Patrick Hand', fontSize:13 }}>
          <div style={{ fontFamily:'Caveat', fontSize:16, marginBottom: 6 }}>Pick account</div>
          {['1000 FNB','1100 AR','1500 Stock','2000 AP','2200 VAT','4000 Sales','5100 Rent'].map((a,i)=>(
            <div key={i} style={{
              padding: '3px 6px', borderRadius: 3,
              background: a==='4000 Sales' ? accentSoft : 'transparent',
              borderLeft: a==='4000 Sales' ? `3px solid ${accent}` : '3px solid transparent',
            }}>{a}</div>
          ))}
        </div>
        <div style={{ flex:1, position:'relative', padding: 10 }}>
          <div style={{ fontFamily:'Caveat', fontSize:20 }}>4000 · Sales — flow view</div>
          <div style={{ fontFamily:'Patrick Hand', fontSize:12, color: ink2, marginBottom: 8 }}>Where the credits come from → where they go on the income statement</div>
          {/* Center bar = the account */}
          <div style={{ position:'absolute', left: '46%', top: 70, width: 8, height: 280, background: ink }}/>
          <div style={{ position:'absolute', left:'42%', top: 55, fontFamily:'Caveat', fontSize:16 }}>SALES (Cr)</div>
          <div style={{ position:'absolute', left:'42%', top: 360, fontFamily:'Caveat', fontSize:16, color: accent }}>R 62,993 Cr</div>

          {/* Inflows on left */}
          <svg style={{ position:'absolute', inset:0, top:70, height:280, width:'100%', pointerEvents:'none' }}>
            {[
              ['INV-100  R 7,130', 30],
              ['INV-101  R 4,783', 90],
              ['INV-102  R 2,780', 150],
              ['Feb b/f  R 48,300', 220],
            ].map(([l,y],i)=>(
              <g key={i}>
                <path d={`M 30,${y} C 180,${y} 200,${140} 320,${140}`} fill="none" stroke={ink2} strokeWidth={Math.max(2, 14 - i*2)} strokeOpacity="0.4"/>
                <text x="34" y={y-4} fontFamily="Patrick Hand" fontSize="12" fill={ink}>{l}</text>
              </g>
            ))}
            {/* Outflow (to P&L) */}
            <path d="M 360,140 C 480,140 500,200 580,200" fill="none" stroke={accent} strokeWidth="14" strokeOpacity="0.5"/>
            <text x="430" y="190" fontFamily="Patrick Hand" fontSize="12" fill={accent}>→ Income statement (revenue)</text>
          </svg>
          <Note style={{ position:'absolute', bottom: 10, left: 14 }}>Drag-to-swap account · width = R amount</Note>
        </div>
      </div>
    </Frame>
  );
}

function Ledger_V4_SplitGrid() {
  return (
    <Frame title="T-Account Ledger" subtitle="V4 · Split Grid — pick row, T fills right panel">
      <div style={{ display:'grid', gridTemplateColumns:'1.3fr 1fr', height:'100%' }}>
        <div style={{ borderRight:`1.5px solid ${ink}`, padding: 10, overflow:'hidden' }}>
          <div style={{ fontFamily:'Caveat', fontSize:18, marginBottom:4 }}>Account list</div>
          <SField w="100%" value="🔍 search…" style={{ marginBottom: 6 }} />
          <table style={{ width:'100%', borderCollapse:'collapse', fontFamily:'JetBrains Mono', fontSize:11 }}>
            <thead style={{ fontFamily:'Patrick Hand', fontSize:12, borderBottom:`1.5px solid ${ink}` }}>
              <tr><th align="left">Code</th><th align="left">Account</th><th align="right">Movement</th><th align="right">Balance</th></tr>
            </thead>
            <tbody>
              {[
                ['1000','FNB Cheque','30,441','(641)'],
                ['1100','AR','28,800','20,600'],
                ['1500','Stock','21,600','45,600'],
                ['2000','AP','22,432','(36,950)',true],
                ['2200','VAT Ctrl','5,817','(3,360)'],
                ['4000','Sales','14,693','(62,993)'],
                ['5100','Rent','8,000','32,000'],
                ['5200','Utilities','1,540','4,820'],
                ['5300','Wages','12,000','36,000'],
              ].map((r,i)=>(
                <tr key={i} style={{ borderBottom:`1px dotted ${muted}`, background: r[4]?accentSoft:'transparent' }}>
                  <td style={{ padding:'3px 4px' }}>{r[0]}</td>
                  <td style={{ fontFamily:'Patrick Hand', fontSize:13 }}>{r[1]}</td>
                  <td align="right">{r[2]}</td>
                  <td align="right" style={{ fontWeight:600 }}>{r[3]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: 12, background: paperEdge + '40', display:'flex', flexDirection:'column' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
            <div style={{ fontFamily:'Caveat', fontSize:20 }}>2000 · Accounts Payable</div>
            <SBtn small>open full ↗</SBtn>
          </div>
          <Squiggle style={{ margin:'4px 0 8px' }}/>
          <TAccount name="" w="100%"
            debits={[
              {label:'12/03 Eskom pmt', amount:'1,741'},
              {label:'19/03 Supplier A', amount:'4,500'},
              {label:'22/03 Telkom', amount:'612'},
              {label:'28/03 Stock pmt', amount:'15,579'},
            ]}
            credits={[
              {label:'B/F Feb', amount:'18,000'},
              {label:'Eskom bill', amount:'1,741'},
              {label:'Supplier A inv', amount:'18,950'},
              {label:'Telkom bill', amount:'612'},
              {label:'Stock recv', amount:'18,049'},
            ]}
            balance="R 36,950.00 Cr" accentTop />
          <Note style={{ marginTop: 10 }}>click any row → drills to source doc</Note>
        </div>
      </div>
    </Frame>
  );
}

window.Ledger = { V1: Ledger_V1_LedgerBook, V2: Ledger_V2_ModernCards, V3: Ledger_V3_MoneyFlow, V4: Ledger_V4_SplitGrid };
