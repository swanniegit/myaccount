// V2 deep-dive — extras: Quote, Payment received, Onboarding (first-run)

function V2_Quote() {
  return (
    <Frame title="Sales · Quote" subtitle="Step 1 of the flow · QU-024 → can convert to invoice" w={900} h={620}>
      <div style={{ display:'flex', height:'100%' }}>
        <SideNav items={['Home','Sales','Purchases','Banking','VAT 201','Reports','Setup']} active="Sales" />
        <div style={{ flex:1, padding: 14 }}>
          <div style={{ display:'flex', gap: 6, marginBottom: 10 }}>
            {['Quotes (5)','Invoices (12)','Customers (20)','Statements'].map((t,i)=>(
              <div key={i} style={{
                padding:'4px 10px', fontFamily:'Patrick Hand', fontSize: 12,
                borderRadius: 3, border: `1.5px solid ${i===0?ink:ink2}`,
                background: i===0?ink:'transparent', color: i===0?paper:ink,
              }}>{t}</div>
            ))}
            <div style={{ flex:1 }}/>
            <SBtn primary small>＋ New quote</SBtn>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1.3fr 1fr', gap: 12 }}>
            <div>
              <div style={{ fontFamily:'Caveat', fontSize: 22 }}>QU-024 · sent · expires 28/03</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 8, marginTop: 10 }}>
                <SField label="Customer" w="100%" value="Woolworths Pty Ltd"/>
                <SField label="VAT no." w="100%" value="4123456789"/>
                <SField label="Quote date" w="100%" value="08/03/2026"/>
                <SField label="Valid until" w="100%" value="28/03/2026 (20d)"/>
              </div>
              <div style={{ fontFamily:'Patrick Hand', fontSize: 13, marginTop: 10, marginBottom: 4 }}>Line items</div>
              <table style={{ width:'100%', borderCollapse:'collapse', fontFamily:'JetBrains Mono', fontSize: 11 }}>
                <thead style={{ fontFamily:'Patrick Hand', fontSize: 12, borderBottom: `1.5px solid ${ink}` }}>
                  <tr><th align="left">Description</th><th align="right">Qty</th><th align="right">Unit excl</th><th align="right">VAT</th><th align="right">Total</th></tr>
                </thead>
                <tbody>
                  {[
                    ['Consulting — March', 20, '500.00', '15%', '11,500.00'],
                    ['Travel reimbursement', 1, '2,400.00', '15%', '2,760.00'],
                  ].map((r,i)=>(
                    <tr key={i} style={{ borderBottom: `1px dotted ${muted}` }}>
                      <td style={{ padding: '5px 4px', fontFamily:'Patrick Hand', fontSize: 13 }}>{r[0]}</td>
                      <td align="right">{r[1]}</td><td align="right">{r[2]}</td><td align="right">{r[3]}</td><td align="right">{r[4]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <SBox pad={12} fill={accentSoft}>
              <div style={{ fontFamily:'Caveat', fontSize: 18 }}>Totals</div>
              <div style={{ display:'flex', justifyContent:'space-between', fontFamily:'Patrick Hand', fontSize: 13, padding: '3px 0' }}><span>Subtotal</span><span style={{ fontFamily:'JetBrains Mono', fontSize: 12 }}>12,400.00</span></div>
              <div style={{ display:'flex', justifyContent:'space-between', fontFamily:'Patrick Hand', fontSize: 13, padding: '3px 0' }}><span>VAT 15%</span><span style={{ fontFamily:'JetBrains Mono', fontSize: 12 }}>1,860.00</span></div>
              <Squiggle/>
              <div style={{ display:'flex', justifyContent:'space-between', fontFamily:'Caveat', fontSize: 20 }}>
                <span>Quote</span><span style={{ color: accent }}>R 14,260.00</span>
              </div>
              <Squiggle style={{ margin: '12px 0' }}/>
              <div style={{ fontFamily:'Caveat', fontSize: 16 }}>Next step</div>
              <SBtn primary small style={{ marginTop: 6 }}>Convert to invoice →</SBtn>
              <Note style={{ marginTop: 8 }}>quote leaves no GL entry · only the invoice posts to T-accounts</Note>
            </SBox>
          </div>
          <Note style={{ position:'absolute', bottom: 14, right: 14 }}>flow: Quote → Invoice → Payment → VAT 201</Note>
        </div>
      </div>
    </Frame>
  );
}

function V2_RecordPayment() {
  return (
    <Frame title="Record payment" subtitle="Step 3 of the flow · pay an invoice or apply a deposit" w={900} h={620}>
      <div style={{ display:'flex', height:'100%' }}>
        <SideNav items={['Home','Sales','Purchases','Banking','VAT 201','Reports','Setup']} active="Sales" />
        <div style={{ flex:1, padding: 14 }}>
          <div style={{ fontFamily:'Caveat', fontSize: 22, marginBottom: 4 }}>Payment from Woolworths</div>
          <div style={{ fontFamily:'Patrick Hand', fontSize: 12, color: ink2, marginBottom: 10 }}>Match a receipt against one or more outstanding invoices.</div>

          <div style={{ display:'grid', gridTemplateColumns:'1.2fr 1fr', gap: 12 }}>
            <SBox pad={12} fill="#fff">
              <div style={{ fontFamily:'Caveat', fontSize: 16, marginBottom: 6 }}>Payment details</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 8 }}>
                <SField label="From" w="100%" value="Woolworths Pty Ltd"/>
                <SField label="Received on" w="100%" value="22/03/2026"/>
                <SField label="Amount received" w="100%" value="14,260.00"/>
                <SField label="Into account" w="100%" value="1000 · FNB Cheque"/>
                <SField label="Method" w="100%" value="EFT"/>
                <SField label="Reference" w="100%" value="WLW INV103"/>
              </div>

              <div style={{ fontFamily:'Caveat', fontSize: 16, marginTop: 12, marginBottom: 4 }}>Apply to invoices</div>
              <table style={{ width:'100%', borderCollapse:'collapse', fontFamily:'JetBrains Mono', fontSize: 11 }}>
                <thead style={{ fontFamily:'Patrick Hand', fontSize: 12, borderBottom: `1.5px solid ${ink}` }}>
                  <tr><th></th><th align="left">#</th><th align="left">Date</th><th align="right">Owed</th><th align="right">Applying</th></tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom:`1px dotted ${muted}`, background: accentSoft }}>
                    <td style={{ padding:'5px 4px' }}>☑</td>
                    <td>INV-103</td><td>14/03/26</td>
                    <td align="right">14,260.00</td>
                    <td align="right" style={{ fontWeight: 700 }}>14,260.00</td>
                  </tr>
                  <tr style={{ borderBottom:`1px dotted ${muted}`, color: ink2 }}>
                    <td>☐</td><td>INV-099</td><td>24/02/26</td><td align="right">13,800.00</td><td align="right">—</td>
                  </tr>
                </tbody>
              </table>
              <Note style={{ marginTop: 8 }}>over-payment goes to Customer credit (1110)</Note>
            </SBox>

            <SBox pad={12} fill={accentSoft}>
              <div style={{ fontFamily:'Caveat', fontSize: 16 }}>Will post</div>
              <div style={{ fontFamily:'JetBrains Mono', fontSize: 11, marginTop: 6, lineHeight: 1.5 }}>
                Dr 1000 FNB ............. 14,260.00<br/>
                  Cr 1100 AR — Woolworths . 14,260.00
              </div>
              <Squiggle style={{ margin: '12px 0' }}/>
              <div style={{ fontFamily:'Caveat', fontSize: 16 }}>After this</div>
              <div style={{ fontFamily:'Patrick Hand', fontSize: 13, marginTop: 4, lineHeight: 1.5 }}>
                INV-103 → <span style={{ color: accent }}>Paid</span><br/>
                Woolworths AR → R 0.00<br/>
                FNB balance → R 14,901.00
              </div>
              <Squiggle style={{ margin:'12px 0' }}/>
              <SBtn primary small style={{ width: '100%', justifyContent: 'center' }}>Record payment</SBtn>
              <Note style={{ marginTop: 8 }}>auto-matched to FNB bank feed if amount + date agree</Note>
            </SBox>
          </div>
        </div>
      </div>
    </Frame>
  );
}

function V2_Onboarding() {
  return (
    <Frame title="Welcome to myAccount" subtitle="First run · ~5 minutes to your first invoice" w={900} h={620}>
      <div style={{ padding: 24, height: '100%', display:'flex', flexDirection:'column' }}>
        <div style={{ fontFamily:'Caveat', fontSize: 32, lineHeight: 1 }}>Let's get your books open.</div>
        <div style={{ fontFamily:'Patrick Hand', fontSize: 14, color: ink2, marginTop: 4 }}>5 quick steps · designed for South African small business · we'll figure out VAT, PAYE & SARS along the way.</div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(5, 1fr)', gap: 10, marginTop: 18 }}>
          {[
            { n:1, t:'Your business', s:'Name, reg no., year-end', done:true },
            { n:2, t:'Tax setup', s:'VAT no., PAYE ref, eFiling user', done:true, active:false },
            { n:3, t:'Connect bank', s:'FNB · Absa · Nedbank · Standard · Capitec', active:true },
            { n:4, t:'Chart of accounts', s:'Use SA default (47 accounts) or upload your own' },
            { n:5, t:'First entry', s:'Post your opening balances' },
          ].map((s,i)=>(
            <SBox key={i} pad={10}
              fill={s.active?accentSoft:s.done?'#fff':paperEdge+'40'}
              accent={s.active}
              style={{ position:'relative', opacity: s.done?0.7:1 }}>
              <div style={{
                width: 26, height: 26, borderRadius:'50%',
                border:`1.5px solid ${s.active?accent:s.done?ink:ink2}`,
                background: s.done?ink:s.active?accent:'#fff',
                color: s.done||s.active?paper:ink,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontFamily:'Caveat', fontSize: 16, marginBottom: 6,
              }}>{s.done?'✓':s.n}</div>
              <div style={{ fontFamily:'Caveat', fontSize: 16 }}>{s.t}</div>
              <div style={{ fontFamily:'Patrick Hand', fontSize: 12, color: ink2 }}>{s.s}</div>
            </SBox>
          ))}
        </div>

        <div style={{ flex:1, marginTop: 18, display:'grid', gridTemplateColumns:'1fr 1fr', gap: 14 }}>
          <SBox pad={14} fill="#fff">
            <div style={{ fontFamily:'Caveat', fontSize: 20 }}>Step 3 · Connect your bank</div>
            <div style={{ fontFamily:'Patrick Hand', fontSize: 13, color: ink2, marginTop: 4 }}>Pulls last 90 days of transactions and matches them to your invoices. You can skip and add manually.</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap: 8, marginTop: 12 }}>
              {['FNB','Absa','Nedbank','Standard Bank','Capitec','Tyme'].map((b,i)=>(
                <div key={i} style={{
                  padding: '14px 10px', textAlign:'center',
                  border: `1.5px solid ${b==='FNB'?accent:ink2}`,
                  borderRadius: 4,
                  background: b==='FNB'?accentSoft:'#fff',
                  fontFamily:'Caveat', fontSize: 16,
                  position:'relative',
                }}>{b}{b==='FNB' && <Note style={{ position:'absolute', top:-10, right:-6, fontSize: 11 }}>linked ✓</Note>}</div>
              ))}
            </div>
            <Note style={{ marginTop: 10 }}>read-only OAuth via Stitch · no credentials stored</Note>
          </SBox>
          <SBox pad={14} fill="#fff">
            <div style={{ fontFamily:'Caveat', fontSize: 20 }}>While you wait, here's what we'll set up</div>
            <ul style={{ fontFamily:'Patrick Hand', fontSize: 13, paddingLeft: 18, lineHeight: 1.7 }}>
              <li>SA-standard 47-account chart of accounts</li>
              <li>VAT 201 schedule (Category A · bi-monthly)</li>
              <li>SARS eFiling submission templates</li>
              <li>PAYE / UIF / SDL control accounts</li>
              <li>FIFO perpetual inventory</li>
              <li>IFRS for SMEs reporting</li>
            </ul>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop: 14 }}>
              <SBtn small>Skip for now</SBtn>
              <SBtn primary small>Connect FNB →</SBtn>
            </div>
          </SBox>
        </div>
      </div>
    </Frame>
  );
}

window.V2Extras = { Quote: V2_Quote, Payment: V2_RecordPayment, Onboarding: V2_Onboarding };
