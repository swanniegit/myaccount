// DASHBOARD — 4 variations
// Persona: small biz owner in SA, lands here each morning.

function Dashboard_V1_LedgerBook() {
  return (
    <Frame title="Dashboard" subtitle="V1 · Ledger Book — paper-bookkeeping metaphor">
      <div style={{ display: 'flex', height: '100%' }}>
        <SideNav items={['Dashboard','Ledger','Journal','Reports','VAT 201','Accounts']} active="Dashboard" />
        <div style={{ flex: 1, padding: '14px 18px', background: 'repeating-linear-gradient(to bottom, transparent 0 24px, rgba(31,42,68,0.05) 24px 25px)' }}>
          <div style={{ fontFamily: 'Caveat', fontSize: 22, marginBottom: 4 }}>Good morning, Thandi.</div>
          <div style={{ fontFamily: 'Patrick Hand', fontSize: 12, color: ink2, marginBottom: 12 }}>Books opened: 11 Feb 2026 · 47 unposted entries</div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 14 }}>
            <TAccount name="Bank — FNB Cheque" w={180} compact
              debits={[{label:'Open bal', amount:'12,400'},{label:'Sale #102', amount:'3,200'}]}
              credits={[{label:'Rent', amount:'8,000'}]}
              balance="R 7,600.00" />
            <TAccount name="VAT Control" w={180} compact
              debits={[{label:'Input', amount:'1,840'}]}
              credits={[{label:'Output', amount:'4,200'}]}
              balance="R 2,360.00 Cr" accentTop />
            <TAccount name="Sales" w={180} compact
              debits={[]}
              credits={[{label:'Feb', amount:'28,000'},{label:'Mar', amount:'32,500'}]}
              balance="R 60,500.00 Cr" />
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <SBox style={{ flex: 1, background: '#fff' }} pad={10}>
              <div style={{ fontFamily: 'Caveat', fontSize: 18, marginBottom: 4 }}>Today's diary</div>
              <Squiggle />
              {['09:14 — Eskom invoice posted','10:02 — Sale to Pick n Pay','11:30 — VAT201 due in 6 days','14:00 — Reconcile FNB'].map((t,i)=>(
                <div key={i} style={{ fontFamily: 'Patrick Hand', fontSize: 12, padding: '3px 0', borderBottom: `1px dotted ${muted}` }}>{t}</div>
              ))}
            </SBox>
            <SBox style={{ width: 200, background: accentSoft }} pad={10}>
              <Note style={{ border: 'none', padding: 0 }}>SARS reminder</Note>
              <div style={{ fontFamily: 'Caveat', fontSize: 28, fontWeight: 700, lineHeight: 1 }}>R 2,360</div>
              <div style={{ fontFamily: 'Patrick Hand', fontSize: 12 }}>VAT owing · due 25 May</div>
              <SBtn primary small style={{ marginTop: 8 }}>File via eFiling →</SBtn>
            </SBox>
          </div>
        </div>
      </div>
    </Frame>
  );
}

function Dashboard_V2_ModernCards() {
  return (
    <Frame title="Dashboard" subtitle="V2 · Modern Cards — tables-and-cards default">
      <div style={{ display: 'flex', height: '100%' }}>
        <SideNav items={['Home','Sales','Purchases','Banking','VAT','Reports']} active="Home" />
        <div style={{ flex: 1, padding: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontFamily: 'Caveat', fontSize: 22 }}>This month · March 2026</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <SBtn small>＋ Quote</SBtn><SBtn small>＋ Invoice</SBtn><SBtn primary small>＋ Entry</SBtn>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 12 }}>
            {[
              ['Cash on hand','R 87,420','+12%'],
              ['Money owed to me','R 42,180','3 overdue'],
              ['I owe','R 18,950','due Fri'],
              ['VAT to SARS','R 2,360','25 May'],
            ].map(([k,v,sub],i)=>(
              <SBox key={i} pad={10} fill="#fff" accent={i===3}>
                <div style={{ fontFamily: 'Patrick Hand', fontSize: 11, color: ink2 }}>{k}</div>
                <div style={{ fontFamily: 'JetBrains Mono', fontSize: 18, fontWeight: 700 }}>{v}</div>
                <div style={{ fontFamily: 'Caveat', fontSize: 14, color: i===3?accent:ink2 }}>{sub}</div>
              </SBox>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
            <SBox pad={10} fill="#fff">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <div style={{ fontFamily: 'Caveat', fontSize: 18 }}>Cash flow — 30 days</div>
                <Note style={{ fontSize: 12, padding: '0 6px' }}>tap → drill into T</Note>
              </div>
              <Hatch h={120} label="line chart: in vs out, ZAR" />
            </SBox>
            <SBox pad={10} fill="#fff">
              <div style={{ fontFamily: 'Caveat', fontSize: 18, marginBottom: 4 }}>Needs you</div>
              {[['4 receipts to file','📎'],['2 unreconciled (FNB)','🏦'],['VAT 201 ready','📨']].map(([t,i],k)=>(
                <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom: `1px dotted ${muted}`, fontFamily: 'Patrick Hand', fontSize: 13 }}>
                  <span>{t}</span><span>›</span>
                </div>
              ))}
            </SBox>
          </div>
        </div>
      </div>
    </Frame>
  );
}

function Dashboard_V3_MoneyFlow() {
  // Node-graph of money flow
  const nodes = [
    { id: 'bank', x: 80, y: 130, label: 'FNB Bank', sub: 'R 87,420', size: 64 },
    { id: 'sales', x: 240, y: 50, label: 'Sales', sub: 'R 60,500', size: 54 },
    { id: 'cust', x: 240, y: 200, label: 'Customers', sub: 'R 42,180 owed', size: 54 },
    { id: 'vat', x: 400, y: 100, label: 'VAT (SARS)', sub: 'R 2,360 Cr', size: 48, accent: true },
    { id: 'rent', x: 400, y: 220, label: 'Rent', sub: 'R 8,000', size: 42 },
    { id: 'supp', x: 540, y: 160, label: 'Suppliers', sub: 'R 18,950', size: 50 },
  ];
  const flows = [
    ['cust','bank','R 38k'],['sales','bank','R 22k'],['bank','vat','file'],['bank','rent','paid'],['bank','supp','due Fri'],['sales','vat','15%'],
  ];
  const find = id => nodes.find(n=>n.id===id);
  return (
    <Frame title="Dashboard" subtitle="V3 · Money Flow — accounts as nodes, txns as flows  ✦ novel">
      <div style={{ position: 'relative', height: '100%', padding: '8px 12px' }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom: 4 }}>
          <Note color={ink2}>Drag any node to re-arrange · scroll to zoom · click for T-account</Note>
          <SBtn small>This month ▾</SBtn>
        </div>
        <svg style={{ position: 'absolute', inset: 0, top: 36, width: '100%', height: 'calc(100% - 60px)', pointerEvents: 'none' }}>
          <defs>
            <marker id="flowArr" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 z" fill={ink2}/>
            </marker>
          </defs>
          {flows.map(([a,b,l],i)=>{
            const A=find(a), B=find(b);
            return (
              <g key={i}>
                <path d={`M${A.x},${A.y} Q${(A.x+B.x)/2},${(A.y+B.y)/2 - 25} ${B.x},${B.y}`}
                  fill="none" stroke={ink2} strokeWidth="1.5" strokeDasharray="3 3" markerEnd="url(#flowArr)"/>
                <text x={(A.x+B.x)/2} y={(A.y+B.y)/2 - 30} fontFamily="Caveat" fontSize="13" fill={ink2} textAnchor="middle">{l}</text>
              </g>
            );
          })}
        </svg>
        {nodes.map(n=>(
          <div key={n.id} style={{
            position: 'absolute', left: n.x - n.size/2, top: n.y + 36 - n.size/2,
            width: n.size, height: n.size, borderRadius: '50%',
            border: `2px solid ${n.accent? accent : ink}`,
            background: n.accent ? accentSoft : '#fff',
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
            textAlign:'center', padding: 4,
          }}>
            <div style={{ fontFamily:'Caveat', fontSize: 13, lineHeight: 1, fontWeight:700 }}>{n.label}</div>
            <div style={{ fontFamily:'JetBrains Mono', fontSize: 9, color: ink2 }}>{n.sub}</div>
          </div>
        ))}
        <div style={{ position:'absolute', bottom: 10, left: 12, right: 12, display:'flex', gap: 8 }}>
          <SBox pad={8} fill="#fff" style={{ flex: 1 }}>
            <div style={{ fontFamily:'Caveat', fontSize:16 }}>Net this month <span style={{color:accent}}>+R 24,180</span></div>
          </SBox>
          <SBtn small>＋ Account node</SBtn>
          <SBtn primary small>＋ Post entry</SBtn>
        </div>
      </div>
    </Frame>
  );
}

function Dashboard_V4_SplitGrid() {
  return (
    <Frame title="Dashboard" subtitle="V4 · Split Grid — spreadsheet + live T peek">
      <TopNav items={['Overview','Journal','Ledger','VAT','Customers','Suppliers']} active="Overview" />
      <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', height:'calc(100% - 38px)' }}>
        <div style={{ borderRight: `1.5px solid ${ink}`, padding: 10, overflow:'hidden' }}>
          <div style={{ fontFamily:'Caveat', fontSize:18, marginBottom: 6 }}>Recent activity</div>
          <table style={{ width:'100%', borderCollapse:'collapse', fontFamily:'JetBrains Mono', fontSize:11 }}>
            <thead>
              <tr style={{ borderBottom: `1.5px solid ${ink}`, fontFamily:'Patrick Hand', fontSize:12 }}>
                <th align="left">Date</th><th align="left">Ref</th><th align="left">Description</th><th align="right">Dr</th><th align="right">Cr</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['03/14','INV-102','Sale — Pick n Pay','3,200',''],
                ['03/14','INV-102','VAT output','','420'],
                ['03/14','INV-102','Sales','','2,780'],
                ['03/13','BILL-44','Rent — March','8,000',''],
                ['03/13','BILL-44','Bank','','8,000'],
                ['03/12','REC-19','Eskom — utilities','1,540',''],
                ['03/12','REC-19','VAT input','201',''],
                ['03/12','REC-19','Bank','','1,741'],
                ['03/11','SAL-08','Wages','12,000',''],
              ].map((r,i)=>(
                <tr key={i} style={{ borderBottom: `1px dotted ${muted}`, background: i===0||i===1||i===2 ? accentSoft : 'transparent' }}>
                  {r.map((c,j)=><td key={j} align={j>=3?'right':'left'} style={{ padding:'3px 4px' }}>{c}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: 10, background: paperEdge + '40' }}>
          <div style={{ fontFamily:'Caveat', fontSize:18, marginBottom: 6 }}>T-peek <Note style={{ fontSize: 11 }}>follows your cursor</Note></div>
          <TAccount name="Sales" w={250}
            debits={[]}
            credits={[
              {label:'Feb open', amount:'28,000'},
              {label:'INV-101', amount:'5,500'},
              {label:'INV-102', amount:'2,780', highlight:true},
            ]}
            balance="R 36,280.00 Cr" accentTop />
          <Squiggle style={{ margin: '10px 0' }} />
          <TAccount name="VAT Output" w={250}
            debits={[]}
            credits={[
              {label:'Feb open', amount:'4,200'},
              {label:'INV-102', amount:'420', highlight:true},
            ]}
            balance="R 4,620.00 Cr" />
        </div>
      </div>
    </Frame>
  );
}

window.Dashboard = { V1: Dashboard_V1_LedgerBook, V2: Dashboard_V2_ModernCards, V3: Dashboard_V3_MoneyFlow, V4: Dashboard_V4_SplitGrid };
