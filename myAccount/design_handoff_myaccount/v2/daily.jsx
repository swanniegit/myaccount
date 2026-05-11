// V2 deep-dive screens — Modern Cards aesthetic across the full app.
// Daily: Dashboard, Journal (drag-to-post grafted from V3), Ledger.

function V2_Dashboard() {
  return (
    <Frame title="Dashboard" subtitle="Morning landing · Mar 2026" w={900} h={620}>
      <div style={{ display:'flex', height:'100%' }}>
        <SideNav items={['Home','Sales','Purchases','Banking','VAT 201','Reports','Setup']} active="Home" />
        <div style={{ flex:1, padding: 16 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom: 10 }}>
            <div>
              <div style={{ fontFamily:'Caveat', fontSize:24, lineHeight:1 }}>Good morning, Thandi</div>
              <div style={{ fontFamily:'Patrick Hand', fontSize:12, color:ink2 }}>Books up-to-date · 47 accounts · last entry 14/03 14:02</div>
            </div>
            <div style={{ display:'flex', gap:6 }}>
              <SBtn small>＋ Quote</SBtn><SBtn small>＋ Invoice</SBtn><SBtn small>＋ Bill</SBtn><SBtn primary small>＋ Journal entry</SBtn>
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap: 10, marginBottom: 12 }}>
            {[
              ['Cash on hand','R 87,420','+12% vs Feb', false],
              ['Money owed to me','R 42,180','3 overdue', false],
              ['I owe','R 18,950','due Fri', false],
              ['VAT 201 to SARS','R 3,641','due 25 May · 14d', true],
            ].map(([k,v,sub,hi],i)=>(
              <SBox key={i} pad={10} fill="#fff" accent={hi}>
                <div style={{ fontFamily:'Patrick Hand', fontSize:11, color:ink2 }}>{k}</div>
                <div style={{ fontFamily:'JetBrains Mono', fontSize:20, fontWeight:700 }}>{v}</div>
                <div style={{ fontFamily:'Caveat', fontSize:14, color: hi?accent:ink2 }}>{sub}</div>
              </SBox>
            ))}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap: 10, marginBottom: 10 }}>
            <SBox pad={10} fill="#fff">
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom: 4 }}>
                <div style={{ fontFamily:'Caveat', fontSize:18 }}>Cash flow — last 30 days</div>
                <SBtn small>30d ▾</SBtn>
              </div>
              <Hatch h={140} label="line chart: money in (green) vs money out (orange)" />
            </SBox>
            <SBox pad={10} fill="#fff">
              <div style={{ fontFamily:'Caveat', fontSize:18, marginBottom: 4 }}>Income vs expense</div>
              <Hatch h={140} label="bar chart by month" />
            </SBox>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap: 10 }}>
            <SBox pad={10} fill="#fff">
              <div style={{ fontFamily:'Caveat', fontSize:16, marginBottom: 4 }}>Needs you</div>
              {[['4 receipts to file','📎'],['2 unreconciled (FNB)','🏦'],['VAT 201 ready to review','📨'],['INV-098 overdue 22d','⚠']].map(([t],k)=>(
                <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'4px 0', borderBottom: `1px dotted ${muted}`, fontFamily: 'Patrick Hand', fontSize: 13 }}>
                  <span>{t}</span><span style={{ color: ink2 }}>›</span>
                </div>
              ))}
            </SBox>
            <SBox pad={10} fill="#fff">
              <div style={{ fontFamily:'Caveat', fontSize:16, marginBottom: 4 }}>Recent activity</div>
              {[['14:02','INV-102 posted','R 3,200 Cr'],['11:18','Eskom bill','R 1,741 Dr'],['10:30','Bank import','24 txns'],['09:14','Sale receipt OCR','R 980']].map(([t,d,a],k)=>(
                <div key={k} style={{ display:'grid', gridTemplateColumns:'42px 1fr auto', gap: 4, padding:'3px 0', borderBottom:`1px dotted ${muted}`, fontFamily:'Patrick Hand', fontSize: 12 }}>
                  <span style={{ fontFamily:'JetBrains Mono', fontSize: 10, color: ink2 }}>{t}</span>
                  <span>{d}</span>
                  <span style={{ fontFamily:'JetBrains Mono', fontSize: 11, color: a.includes('Cr')?accent:ink }}>{a}</span>
                </div>
              ))}
            </SBox>
            <SBox pad={10} fill={accentSoft}>
              <Note style={{ border:'none', padding:0 }}>SARS reminder</Note>
              <div style={{ fontFamily:'Caveat', fontSize:30, fontWeight:700, lineHeight: 1 }}>R 3,641</div>
              <div style={{ fontFamily:'Patrick Hand', fontSize: 12 }}>VAT 201 owing · period 202603</div>
              <SBtn primary small style={{ marginTop: 6 }}>Review & file →</SBtn>
              <div style={{ fontFamily:'Patrick Hand', fontSize: 11, color: ink2, marginTop: 6 }}>also tracking: PAYE 5 Apr · EMP201 due 7 Apr</div>
            </SBox>
          </div>
        </div>
      </div>
    </Frame>
  );
}

function V2_Journal_DragToPost() {
  return (
    <Frame title="Journal Entry" subtitle="Drag-to-post · the headline interaction" w={900} h={620}>
      <div style={{ display:'flex', height:'100%' }}>
        <SideNav items={['Home','Sales','Purchases','Banking','VAT 201','Reports','Setup']} active="Banking" />
        <div style={{ flex:1, padding: 14, position:'relative' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom: 8 }}>
            <div>
              <div style={{ fontFamily:'Caveat', fontSize:22 }}>New journal entry · JE-0319</div>
              <div style={{ fontFamily:'Patrick Hand', fontSize:12, color:ink2 }}>Drag any pending txn into the Dr or Cr side of a T-account · ⌥ to split · auto VAT 15%</div>
            </div>
            <SBtn primary small>Post · balanced ✓</SBtn>
          </div>

          {/* Pending transaction chips, like a tray */}
          <div style={{ display:'flex', gap: 8, padding: 8, background: paperEdge+'80', border:`1.5px dashed ${ink2}`, borderRadius: 4, marginBottom: 12 }}>
            <div style={{ fontFamily:'Caveat', fontSize:14, alignSelf:'center', marginRight: 4 }}>Pending tray →</div>
            {[
              ['R 3,200.00','Pick n Pay sale','INV-102', true],
              ['R 1,741.00','Eskom utilities','REC-19', false],
              ['R 980.00','Walk-in cash','RCP-44', false],
              ['R 12,000.00','March wages','SAL-08', false],
            ].map(([amt,desc,ref,active],i)=>(
              <div key={i} style={{
                padding: 6, minWidth: 140,
                background: active?'#fff':'#fffd',
                border: `${active?2:1.5}px ${active?'solid':'dashed'} ${active?accent:ink2}`,
                borderRadius: 5,
                boxShadow: active?`2px 2px 0 ${ink}`:'none',
                transform: active?'rotate(-2deg)':'none',
              }}>
                <div style={{ fontFamily:'Caveat', fontSize: 16, color: active?accent:ink, lineHeight: 1 }}>{amt}</div>
                <div style={{ fontFamily:'Patrick Hand', fontSize: 12 }}>{desc}</div>
                <div style={{ fontFamily:'JetBrains Mono', fontSize: 9, color: ink2 }}>{ref}</div>
              </div>
            ))}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap: 12 }}>
            <div>
              <TAccount name="1000 · FNB Cheque" w="100%" accentTop
                debits={[{label:'(new) INV-102', amount:'3,200.00', highlight:true}]}
                credits={[]}
                balance="+R 3,200.00" />
              <Note style={{ marginTop: 4 }}>dropped on Dr</Note>
            </div>
            <div>
              <TAccount name="4000 · Sales" w="100%"
                debits={[]}
                credits={[{label:'(new) excl VAT', amount:'2,780.00', highlight:true}]}
                balance="+R 2,780.00" />
              <Note style={{ marginTop: 4 }}>auto-split 87%</Note>
            </div>
            <div>
              <TAccount name="2220 · VAT Output" w="100%"
                debits={[]}
                credits={[{label:'(new) 15%', amount:'420.00', highlight:true}]}
                balance="+R 420.00" />
              <Note style={{ marginTop: 4 }}>auto-split 13% (SA VAT)</Note>
            </div>
          </div>

          {/* arrows from active chip to first T */}
          <svg style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
            <defs>
              <marker id="jarr2" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
                <path d="M0,0 L10,5 L0,10 z" fill={accent}/>
              </marker>
            </defs>
            <path d="M 230,140 C 280,140 280,260 250,290" fill="none" stroke={accent} strokeWidth="2" strokeDasharray="5 4" markerEnd="url(#jarr2)"/>
            <text x="240" y="190" fontFamily="Caveat" fontSize="14" fill={accent} transform="rotate(20 240 190)">drop here</text>
          </svg>

          <div style={{ position:'absolute', bottom: 14, left: 14, right: 14, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ display:'flex', gap: 14, fontFamily:'JetBrains Mono', fontSize: 12 }}>
              <span>Σ Dr R 3,200.00</span><span>Σ Cr R 3,200.00</span><span style={{ color: accent }}>✓ balanced</span>
            </div>
            <Note>⌘↵ post · ⌫ pop chip back to tray · / search account</Note>
          </div>
        </div>
      </div>
    </Frame>
  );
}

function V2_Ledger() {
  return (
    <Frame title="T-Account Ledger" subtitle="Table default · click any row → T peek panel" w={900} h={620}>
      <div style={{ display:'flex', height:'100%' }}>
        <SideNav items={['Home','Sales','Purchases','Banking','VAT 201','Reports','Setup']} active="Reports" />
        <div style={{ flex:1, display:'grid', gridTemplateColumns:'1.4fr 1fr' }}>
          <div style={{ borderRight: `1.5px solid ${ink}`, padding: 12 }}>
            <div style={{ display:'flex', gap:6, marginBottom: 8 }}>
              <SField label="Search" w={200} value="🔍 stock" />
              <SField label="Type" w={100} value="all" />
              <SField label="Period" w={120} value="Mar 2026" />
              <div style={{ flex:1 }}/>
              <SBtn small>Export</SBtn>
            </div>
            <table style={{ width:'100%', borderCollapse:'collapse', fontFamily:'JetBrains Mono', fontSize:11 }}>
              <thead style={{ fontFamily:'Patrick Hand', fontSize:12, borderBottom:`1.5px solid ${ink}` }}>
                <tr><th align="left">Code</th><th align="left">Account</th><th align="right">Open</th><th align="right">Dr</th><th align="right">Cr</th><th align="right">Close</th></tr>
              </thead>
              <tbody>
                {[
                  ['1000','FNB Cheque','12,400','8,700','21,741','(641)',false],
                  ['1010','Petty Cash','500','200','0','700',false],
                  ['1100','AR','8,200','20,600','8,200','20,600',false],
                  ['1500','Stock on hand','42,800','12,200','9,400','45,600',true],
                  ['1700','Equipment','38,000','0','0','38,000',false],
                  ['2000','AP','(18,000)','1,741','20,691','(36,950)',false],
                  ['2200','VAT Control','(1,223)','1,840','3,977','(3,360)',false],
                  ['3000','Equity','(40,000)','0','0','(40,000)',false],
                  ['4000','Sales','(48,300)','0','14,693','(62,993)',false],
                  ['5100','Rent','24,000','8,000','0','32,000',false],
                  ['5300','Wages','24,000','12,000','0','36,000',false],
                ].map((r,i)=>(
                  <tr key={i} style={{ borderBottom:`1px dotted ${muted}`, background: r[6]?accentSoft:'transparent' }}>
                    <td style={{ padding:'4px 4px' }}>{r[0]}</td>
                    <td style={{ fontFamily:'Patrick Hand', fontSize:13 }}>{r[1]}</td>
                    <td align="right">{r[2]}</td>
                    <td align="right">{r[3]}</td>
                    <td align="right">{r[4]}</td>
                    <td align="right" style={{ fontWeight:600 }}>{r[5]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: 12, background: paperEdge+'40' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
              <div style={{ fontFamily:'Caveat', fontSize:20 }}>1500 · Stock</div>
              <SBtn small>open full ↗</SBtn>
            </div>
            <Squiggle style={{ margin:'4px 0 8px' }}/>
            <TAccount name="" w="100%" accentTop
              debits={[
                {label:'B/F Feb', amount:'42,800'},
                {label:'04/03 PO-101', amount:'4,200'},
                {label:'12/03 PO-104', amount:'8,000'},
              ]}
              credits={[
                {label:'08/03 COGS INV-100', amount:'3,100'},
                {label:'14/03 COGS INV-102', amount:'2,200'},
                {label:'Stock take adj.', amount:'4,100'},
              ]}
              balance="R 45,600.00 Dr" />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 6, marginTop: 10 }}>
              <SBox pad={6} fill="#fff"><div style={{ fontFamily:'Patrick Hand', fontSize:11, color:ink2 }}>Movement</div><div style={{ fontFamily:'JetBrains Mono', fontSize:14, fontWeight:700 }}>R 21,600</div></SBox>
              <SBox pad={6} fill="#fff"><div style={{ fontFamily:'Patrick Hand', fontSize:11, color:ink2 }}>vs Feb</div><div style={{ fontFamily:'JetBrains Mono', fontSize:14, color:accent }}>+R 2,800</div></SBox>
            </div>
            <Note style={{ marginTop: 8 }}>click any line → source doc · hover for context</Note>
          </div>
        </div>
      </div>
    </Frame>
  );
}

window.V2Daily = { Dashboard: V2_Dashboard, Journal: V2_Journal_DragToPost, Ledger: V2_Ledger };
