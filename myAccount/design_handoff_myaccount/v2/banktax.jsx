// V2 deep-dive — Banking & Tax (Reconcile, VAT 201, Trial Balance, Reports)

function V2_BankReconcile() {
  return (
    <Frame title="Bank reconciliation" subtitle="FNB Cheque · matching imported txns to your books" w={900} h={620}>
      <div style={{ display:'flex', height:'100%' }}>
        <SideNav items={['Home','Sales','Purchases','Banking','VAT 201','Reports','Setup']} active="Banking" />
        <div style={{ flex:1, padding: 14 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom: 10 }}>
            <div>
              <div style={{ fontFamily:'Caveat', fontSize: 20 }}>FNB Cheque · 62-0014…3201</div>
              <div style={{ fontFamily:'Patrick Hand', fontSize: 12, color: ink2 }}>Last import 14/03 · 24 txns to review</div>
            </div>
            <div style={{ display:'flex', gap: 6 }}>
              <SBtn small>Re-import</SBtn><SBtn primary small>Finish reconcile</SBtn>
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap: 10, marginBottom: 12 }}>
            {[['Imported','24'],['Auto-matched','19'],['Needs review','5', true],['Closing balance','R (641)']].map(([k,v,hi],i)=>(
              <SBox key={i} pad={8} fill="#fff" accent={hi}>
                <div style={{ fontFamily:'Patrick Hand', fontSize: 11, color: ink2 }}>{k}</div>
                <div style={{ fontFamily:'JetBrains Mono', fontSize: 18, fontWeight:700 }}>{v}</div>
              </SBox>
            ))}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 30px 1fr', gap: 8 }}>
            <div>
              <div style={{ fontFamily:'Caveat', fontSize: 16, marginBottom: 4 }}>Bank statement</div>
              {[
                ['14/03','POS Pick n Pay 12345','3,200.00','in', true],
                ['13/03','EFT Rent City of CT','-8,000.00','out'],
                ['12/03','DD Eskom 9988','-1,741.00','out'],
                ['11/03','Salaries batch','-12,000.00','out'],
                ['10/03','Card fee','-45.00','out', 'new'],
              ].map((r,i)=>(
                <div key={i} style={{
                  display:'grid', gridTemplateColumns:'50px 1fr auto', gap: 4,
                  padding:'5px 6px', border:`1px solid ${r[4]?accent:ink2}`, borderRadius: 3, marginBottom: 4,
                  background: r[4]?accentSoft:'#fff',
                  fontFamily:'Patrick Hand', fontSize: 12,
                }}>
                  <span style={{ fontFamily:'JetBrains Mono', fontSize: 10, color: ink2 }}>{r[0]}</span>
                  <span>{r[1]}</span>
                  <span style={{ fontFamily:'JetBrains Mono', fontSize: 11, color: r[3]==='in'?accent:ink, fontWeight:600 }}>{r[2]}</span>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap: 28, paddingTop: 30 }}>
              {['✓','✓','✓','✓','?'].map((m,i)=>(
                <div key={i} style={{
                  width: 26, height: 26, borderRadius: '50%',
                  border: `1.5px solid ${m==='?'?accent:ink}`,
                  background: m==='?'?accentSoft:'#fff',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontFamily:'Caveat', fontSize: 16, color: m==='?'?accent:ink,
                }}>{m}</div>
              ))}
            </div>
            <div>
              <div style={{ fontFamily:'Caveat', fontSize: 16, marginBottom: 4 }}>Your books</div>
              {[
                ['14/03','INV-102 — Pick n Pay','3,200.00','Dr 1000 / Cr 4000+2220'],
                ['13/03','BILL-44 — Rent','-8,000.00','Cr 1000 / Dr 5100'],
                ['12/03','BILL-45 — Eskom','-1,741.00','Cr 1000 / Dr 5200+2210'],
                ['11/03','SAL-08 — Wages','-12,000.00','Cr 1000 / Dr 5300'],
                ['—','no match found','?','suggested: Dr 5400 Bank charges'],
              ].map((r,i)=>(
                <div key={i} style={{
                  display:'grid', gridTemplateColumns:'50px 1fr auto', gap: 4,
                  padding:'5px 6px', border:`1px solid ${r[2]==='?'?accent:ink2}`, borderRadius: 3, marginBottom: 4,
                  background: r[2]==='?'?accentSoft:'#fff',
                  fontFamily:'Patrick Hand', fontSize: 12,
                }}>
                  <span style={{ fontFamily:'JetBrains Mono', fontSize: 10, color: ink2 }}>{r[0]}</span>
                  <span>{r[1]}<div style={{ fontFamily:'JetBrains Mono', fontSize: 9, color: ink2 }}>{r[3]}</div></span>
                  <span style={{ fontFamily:'JetBrains Mono', fontSize: 11, color: r[2]==='?'?accent:ink, fontWeight:600 }}>{r[2]}</span>
                </div>
              ))}
            </div>
          </div>
          <Note style={{ marginTop: 8 }}>5 needs review · ⌘↵ accept suggestion · drag bank row → book row to match manually</Note>
        </div>
      </div>
    </Frame>
  );
}

function V2_VAT201() {
  return (
    <Frame title="VAT 201 · SARS submission" subtitle="Period 202603 · standard 15%" w={900} h={620}>
      <div style={{ display:'flex', height:'100%' }}>
        <SideNav items={['Home','Sales','Purchases','Banking','VAT 201','Reports','Setup']} active="VAT 201" />
        <div style={{ flex:1, padding: 14 }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom: 12 }}>
            <div>
              <div style={{ fontFamily:'Caveat', fontSize: 22 }}>VAT 201 · March 2026</div>
              <div style={{ fontFamily:'Patrick Hand', fontSize: 12, color: ink2 }}>Period 202603 · due 25 May · 14 days · eFiling user TG-44</div>
            </div>
            <div style={{ display:'flex', gap: 4 }}>
              <SBtn small>Open SARS form</SBtn><SBtn small>Save draft</SBtn><SBtn primary small>Submit via eFiling →</SBtn>
            </div>
          </div>

          {/* Stepper */}
          <div style={{ display:'flex', alignItems:'center', gap: 8, marginBottom: 10 }}>
            {['1 Output VAT','2 Input VAT','3 Adjustments','4 Review & submit'].map((s,i)=>(
              <React.Fragment key={i}>
                <div style={{
                  padding: '4px 10px',
                  border: `1.5px solid ${i<=1?ink:ink2}`,
                  background: i===1?ink:i===0?accentSoft:'#fff',
                  color: i===1?paper:ink,
                  borderRadius: 14,
                  fontFamily:'Patrick Hand', fontSize: 12,
                }}>{s}</div>
                {i<3 && <div style={{ flex: 0, width: 18, height: 1.5, background: ink2, borderTop: `1.5px dashed ${ink2}` }}/>}
              </React.Fragment>
            ))}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap: 12 }}>
            <SBox pad={12} fill="#fff">
              <div style={{ fontFamily:'Caveat', fontSize: 18, marginBottom: 6 }}>Input VAT (claims from suppliers)</div>
              <table style={{ width:'100%', borderCollapse:'collapse', fontFamily:'JetBrains Mono', fontSize: 11 }}>
                <thead style={{ fontFamily:'Patrick Hand', fontSize: 12, borderBottom:`1.5px solid ${ink}` }}>
                  <tr><th align="left">Box</th><th align="left">Field</th><th align="right">Excl</th><th align="right">VAT</th></tr>
                </thead>
                <tbody>
                  {[
                    ['14','Capital goods (15%)','—','—'],
                    ['15','Other goods/services (15%)','38,720.00','5,808.00'],
                    ['16','Imports (15%)','—','—'],
                    ['17','Change in use','—','—'],
                    ['18','Bad debts','—','—'],
                    ['19','Other','—','—'],
                  ].map((r,i)=>(
                    <tr key={i} style={{ borderBottom:`1px dotted ${muted}` }}>
                      <td style={{ padding:'4px 4px', color: ink2 }}>{r[0]}</td>
                      <td style={{ fontFamily:'Patrick Hand', fontSize: 12 }}>{r[1]}</td>
                      <td align="right">{r[2]}</td><td align="right">{r[3]}</td>
                    </tr>
                  ))}
                  <tr style={{ borderTop:`1.5px solid ${ink}`, fontWeight: 700, background: accentSoft }}>
                    <td colSpan="3" style={{ padding:'5px 4px', fontFamily:'Patrick Hand', fontSize: 13 }}>Box 20 · Total input tax</td>
                    <td align="right">5,808.00</td>
                  </tr>
                </tbody>
              </table>
              <Note style={{ marginTop: 8 }}>23 SARS-compliant tax invoices on file backing this claim · 1 missing VAT no. ⚠</Note>
            </SBox>
            <SBox pad={12} fill={accentSoft}>
              <div style={{ fontFamily:'Caveat', fontSize: 18 }}>This return</div>
              <Squiggle/>
              {[['Output VAT (Box 13)','9,449.00'],['Input VAT (Box 20)','5,808.00']].map(([k,v],i)=>(
                <div key={i} style={{ display:'flex', justifyContent:'space-between', fontFamily:'Patrick Hand', fontSize: 13, padding: '3px 0' }}>
                  <span>{k}</span><span style={{ fontFamily:'JetBrains Mono', fontSize: 12 }}>{v}</span>
                </div>
              ))}
              <Squiggle style={{ margin: '4px 0' }}/>
              <div style={{ display:'flex', justifyContent:'space-between', fontFamily:'Caveat', fontSize: 22 }}>
                <span>Payable</span><span style={{ color: accent }}>R 3,641.00</span>
              </div>
              <Squiggle style={{ margin: '10px 0' }}/>
              <div style={{ fontFamily:'Caveat', fontSize: 14 }}>Will post on submission</div>
              <div style={{ fontFamily:'JetBrains Mono', fontSize: 11, color: ink2, marginTop: 4, lineHeight: 1.5 }}>
                Dr 2220 VAT Output ... 9,449.00<br/>
                Cr 2210 VAT Input .... 5,808.00<br/>
                Cr 2200 SARS payable . 3,641.00
              </div>
            </SBox>
          </div>
        </div>
      </div>
    </Frame>
  );
}

function V2_TrialBalance() {
  return (
    <Frame title="Reports · Trial Balance" subtitle="31 March 2026 · IFRS for SMEs" w={900} h={620}>
      <div style={{ display:'flex', height:'100%' }}>
        <SideNav items={['Home','Sales','Purchases','Banking','VAT 201','Reports','Setup']} active="Reports" />
        <div style={{ flex:1, padding: 14 }}>
          <div style={{ display:'flex', gap: 6, marginBottom: 8 }}>
            {['Trial Balance','Income Statement','Balance Sheet','Cash Flow','VAT Detail','SARS pack'].map((t,i)=>(
              <div key={i} style={{
                padding:'4px 10px', fontFamily:'Patrick Hand', fontSize: 12,
                borderRadius: 3, border:`1.5px solid ${i===0?ink:ink2}`,
                background: i===0?ink:'transparent', color: i===0?paper:ink,
              }}>{t}</div>
            ))}
            <div style={{ flex:1 }}/>
            <SBtn small>Compare vs Feb</SBtn><SBtn small>Export PDF</SBtn>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap: 8, marginBottom: 10 }}>
            {[['Assets','R 104,259','+8%'],['Liab.','R 100,310','+12%'],['Equity','R 40,000','—'],['Income','R 62,993','+22%'],['Expense','R 98,044','+18%']].map(([k,v,d],i)=>(
              <SBox key={i} pad={8} fill="#fff">
                <div style={{ fontFamily:'Patrick Hand', fontSize: 11, color: ink2 }}>{k}</div>
                <div style={{ fontFamily:'JetBrains Mono', fontSize: 16, fontWeight:700 }}>{v}</div>
                <div style={{ fontFamily:'Caveat', fontSize: 13, color: accent }}>{d}</div>
              </SBox>
            ))}
          </div>
          <table style={{ width:'100%', borderCollapse:'collapse', fontFamily:'JetBrains Mono', fontSize:11 }}>
            <thead style={{ fontFamily:'Patrick Hand', fontSize:12, borderBottom:`1.5px solid ${ink}` }}>
              <tr><th align="left">Code</th><th align="left">Account</th><th align="right">Debit</th><th align="right">Credit</th><th align="right">vs Feb</th></tr>
            </thead>
            <tbody>
              {[
                ['1000','FNB Cheque','—','641.00','▼'],
                ['1010','Petty Cash','700.00','—','▲'],
                ['1100','Accounts Receivable','20,600.00','—','▲'],
                ['1500','Stock on hand','45,600.00','—','▲'],
                ['1700','Equipment','38,000.00','—','—'],
                ['2000','Accounts Payable','—','36,950.00','▲'],
                ['2200','VAT payable','—','3,360.00','▲'],
                ['2500','Loan — Nedbank','—','60,000.00','▼'],
                ['3000','Owner equity','—','40,000.00','—'],
                ['4000','Sales','—','62,993.00','▲'],
                ['5100','Rent','32,000.00','—','▲'],
                ['5200','Utilities','4,820.00','—','▲'],
                ['5300','Wages','36,000.00','—','▲'],
                ['5400','Other','25,224.00','—','▲'],
              ].map((r,i)=>(
                <tr key={i} style={{ borderBottom:`1px dotted ${muted}` }}>
                  <td style={{ padding:'3px 4px' }}>{r[0]}</td>
                  <td style={{ fontFamily:'Patrick Hand', fontSize: 13 }}>{r[1]}</td>
                  <td align="right">{r[2]}</td><td align="right">{r[3]}</td>
                  <td align="right" style={{ color: accent }}>{r[4]}</td>
                </tr>
              ))}
              <tr style={{ borderTop:`2px solid ${ink}`, fontWeight:700, background: accentSoft }}>
                <td colSpan="2" style={{ padding:'5px 4px', fontFamily:'Patrick Hand', fontSize: 14 }}>Totals</td>
                <td align="right">202,944.00</td><td align="right">202,944.00</td><td/>
              </tr>
            </tbody>
          </table>
          <Note style={{ marginTop: 8 }}>✓ Balanced · click any row to see the T-account behind it</Note>
        </div>
      </div>
    </Frame>
  );
}

function V2_ReportsHub() {
  return (
    <Frame title="Reports" subtitle="Pinned · Statements · SARS pack · Custom" w={900} h={620}>
      <div style={{ display:'flex', height:'100%' }}>
        <SideNav items={['Home','Sales','Purchases','Banking','VAT 201','Reports','Setup']} active="Reports" />
        <div style={{ flex:1, padding: 14 }}>
          <div style={{ fontFamily:'Caveat', fontSize: 18, marginBottom: 6 }}>Pinned this month</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
            {[
              ['Income statement', 'Profit R -35,051'],
              ['Cash position', 'R 87,420'],
              ['Customer aging', '3 overdue · R 18,400'],
            ].map(([t,sub],i)=>(
              <SBox key={i} pad={10} fill="#fff">
                <div style={{ fontFamily:'Caveat', fontSize: 16 }}>{t}</div>
                <div style={{ fontFamily:'Patrick Hand', fontSize: 12, color: ink2 }}>{sub}</div>
                <Hatch h={50} dense label="sparkline" style={{ marginTop: 6 }}/>
              </SBox>
            ))}
          </div>
          <div style={{ fontFamily:'Caveat', fontSize: 18, marginBottom: 6 }}>Standard statements</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 8, marginBottom: 14 }}>
            {['Trial balance','Income statement','Balance sheet','Cash flow','Equity changes','General ledger','VAT detail','PAYE summary'].map((t,i)=>(
              <div key={i} style={{ padding: 8, border:`1.5px solid ${ink}`, borderRadius: 3, fontFamily:'Patrick Hand', fontSize: 13, background: '#fff' }}>{t} ›</div>
            ))}
          </div>
          <div style={{ fontFamily:'Caveat', fontSize: 18, marginBottom: 6 }}>SARS submission packs</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap: 8 }}>
            {[
              ['VAT 201', 'due 25 May', true],
              ['EMP 201 (PAYE/UIF)', 'due 7 Apr'],
              ['IT14 / ITR14 — annual', 'Feb 2027'],
            ].map(([t,sub,hi],i)=>(
              <SBox key={i} pad={10} fill={hi?accentSoft:'#fff'} accent={hi}>
                <div style={{ fontFamily:'Caveat', fontSize: 16 }}>{t}</div>
                <div style={{ fontFamily:'Patrick Hand', fontSize: 12, color: hi?accent:ink2 }}>{sub}</div>
              </SBox>
            ))}
          </div>
        </div>
      </div>
    </Frame>
  );
}

window.V2BankTax = { Reconcile: V2_BankReconcile, VAT201: V2_VAT201, TB: V2_TrialBalance, Reports: V2_ReportsHub };
