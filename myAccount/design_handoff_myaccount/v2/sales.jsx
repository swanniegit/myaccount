// V2 deep-dive — Sales & Purchases (AR / AP)

function V2_Invoices() {
  return (
    <Frame title="Sales · Invoices" subtitle="List → status · 2 overdue, 1 draft" w={900} h={620}>
      <div style={{ display:'flex', height:'100%' }}>
        <SideNav items={['Home','Sales','Purchases','Banking','VAT 201','Reports','Setup']} active="Sales" />
        <div style={{ flex:1, padding: 14 }}>
          <div style={{ display:'flex', gap:6, marginBottom: 10 }}>
            {['All (12)','Draft (1)','Sent (4)','Paid (5)','Overdue (2)'].map((t,i)=>(
              <div key={i} style={{
                padding:'4px 10px', fontFamily:'Patrick Hand', fontSize: 13,
                borderRadius: 3, border: `1.5px solid ${i===0?ink:ink2}`,
                background: i===0?ink:'transparent', color: i===0?paper:ink,
              }}>{t}</div>
            ))}
            <div style={{ flex:1 }}/>
            <SBtn small>📎 Quote</SBtn><SBtn primary small>＋ New invoice</SBtn>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap: 10, marginBottom: 12 }}>
            {[['Outstanding','R 42,180','12 invoices'],['Overdue','R 18,400','2 invoices', true],['Paid (30d)','R 84,300','5 invoices'],['Avg days to pay','27d','target 14d']].map(([k,v,sub,hi],i)=>(
              <SBox key={i} pad={10} fill="#fff" accent={hi}>
                <div style={{ fontFamily:'Patrick Hand', fontSize: 11, color: ink2 }}>{k}</div>
                <div style={{ fontFamily:'JetBrains Mono', fontSize: 18, fontWeight: 700 }}>{v}</div>
                <div style={{ fontFamily:'Caveat', fontSize: 14, color: hi?accent:ink2 }}>{sub}</div>
              </SBox>
            ))}
          </div>

          <table style={{ width:'100%', borderCollapse:'collapse', fontFamily:'JetBrains Mono', fontSize:11 }}>
            <thead style={{ fontFamily:'Patrick Hand', fontSize:12, borderBottom:`1.5px solid ${ink}` }}>
              <tr><th align="left">#</th><th align="left">Customer</th><th align="left">Date</th><th align="left">Due</th><th align="right">Excl</th><th align="right">VAT</th><th align="right">Total</th><th>Status</th></tr>
            </thead>
            <tbody>
              {[
                ['INV-102','Pick n Pay','14/03/26','28/03/26','2,780.00','420.00','3,200.00','Sent'],
                ['INV-101','Shoprite','12/03/26','26/03/26','4,783.00','717.45','5,500.45','Paid'],
                ['INV-100','Spar','01/03/26','15/03/26','7,130.00','1,069.50','8,199.50','Paid'],
                ['INV-099','Boxer Stores','24/02/26','10/03/26','12,000.00','1,800.00','13,800.00','Overdue'],
                ['INV-098','Cape Union','21/02/26','07/03/26','4,000.00','600.00','4,600.00','Overdue'],
                ['INV-103','Woolworths','—','—','12,400.00','1,860.00','14,260.00','Draft'],
              ].map((r,i)=>(
                <tr key={i} style={{ borderBottom:`1px dotted ${muted}`, background: r[7]==='Overdue'?accentSoft:'transparent' }}>
                  <td style={{ padding:'5px 4px' }}>{r[0]}</td>
                  <td style={{ fontFamily:'Patrick Hand', fontSize:13 }}>{r[1]}</td>
                  <td>{r[2]}</td><td>{r[3]}</td>
                  <td align="right">{r[4]}</td><td align="right">{r[5]}</td>
                  <td align="right" style={{ fontWeight:600 }}>{r[6]}</td>
                  <td><span style={{
                    fontFamily:'Patrick Hand', fontSize: 11,
                    border: `1px solid ${r[7]==='Overdue'?accent:ink2}`, borderRadius: 8, padding:'1px 6px',
                    color: r[7]==='Overdue'?accent:ink,
                  }}>{r[7]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>

          <Note style={{ position:'absolute', bottom: 14, right: 14 }}>SARS-compliant tax invoice fields auto-populated</Note>
        </div>
      </div>
    </Frame>
  );
}

function V2_InvoiceCreate() {
  return (
    <Frame title="New invoice" subtitle="SARS-compliant tax invoice · VAT 15%" w={900} h={620}>
      <div style={{ display:'flex', height:'100%' }}>
        <SideNav items={['Home','Sales','Purchases','Banking','VAT 201','Reports','Setup']} active="Sales" />
        <div style={{ flex:1, padding: 14, display:'grid', gridTemplateColumns:'1.4fr 1fr', gap: 12 }}>
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
                <div style={{ fontFamily:'Caveat', fontSize:22 }}>INV-103 · draft</div>
                <div style={{ display:'flex', gap: 4 }}>
                  <SBtn small>Preview PDF</SBtn><SBtn small>Save draft</SBtn><SBtn primary small>Send via email</SBtn>
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 8, marginTop: 10 }}>
                <SField label="Bill to (customer)" w="100%" value="Woolworths Pty Ltd"/>
                <SField label="VAT registration no." w="100%" value="4123456789"/>
                <SField label="Invoice date" w="100%" value="14/03/2026"/>
                <SField label="Due date" w="100%" value="14/04/2026 (Net 30)"/>
              </div>

              <div style={{ fontFamily:'Patrick Hand', fontSize: 13, marginTop: 10, marginBottom: 4 }}>Line items</div>
              <table style={{ width:'100%', borderCollapse:'collapse', fontFamily:'JetBrains Mono', fontSize:11 }}>
                <thead style={{ fontFamily:'Patrick Hand', fontSize: 12, borderBottom:`1.5px solid ${ink}` }}>
                  <tr><th align="left">Description</th><th align="right">Qty</th><th align="right">Unit (excl)</th><th align="right">VAT</th><th align="right">Total</th></tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom:`1px dotted ${muted}` }}>
                    <td style={{ padding:'5px 4px', fontFamily:'Patrick Hand', fontSize:13 }}>Consulting — March</td>
                    <td align="right">20</td><td align="right">500.00</td><td align="right">15%</td><td align="right">11,500.00</td>
                  </tr>
                  <tr style={{ borderBottom:`1px dotted ${muted}` }}>
                    <td style={{ padding:'5px 4px', fontFamily:'Patrick Hand', fontSize:13 }}>Travel reimbursement</td>
                    <td align="right">1</td><td align="right">2,400.00</td><td align="right">15%</td><td align="right">2,760.00</td>
                  </tr>
                  <tr style={{ color: muted }}>
                    <td style={{ padding:'5px 4px', fontFamily:'Patrick Hand', fontSize:13 }}>＋ add line…</td>
                    <td/><td/><td/><td align="right">___</td>
                  </tr>
                </tbody>
              </table>
              <Note style={{ marginTop: 10 }}>Bank details from Settings inserted automatically on PDF</Note>
            </div>
            <div style={{ background: paperEdge+'40', padding: 12, borderRadius: 4 }}>
              <div style={{ fontFamily:'Caveat', fontSize:18 }}>Totals</div>
              {[['Subtotal','12,400.00'],['VAT (15%)','1,860.00']].map(([k,v],i)=>(
                <div key={i} style={{ display:'flex', justifyContent:'space-between', fontFamily:'Patrick Hand', fontSize: 13, padding: '3px 0' }}>
                  <span>{k}</span><span style={{ fontFamily:'JetBrains Mono', fontSize: 12 }}>{v}</span>
                </div>
              ))}
              <Squiggle style={{ margin: '4px 0' }}/>
              <div style={{ display:'flex', justifyContent:'space-between', fontFamily:'Caveat', fontSize: 20 }}>
                <span>Total</span><span style={{ color: accent }}>R 14,260.00</span>
              </div>
              <Squiggle style={{ margin: '10px 0' }}/>
              <div style={{ fontFamily:'Caveat', fontSize: 16 }}>Will post (preview)</div>
              <div style={{ fontFamily:'JetBrains Mono', fontSize: 11, color: ink2, marginTop: 4, lineHeight: 1.5 }}>
                Dr 1100 AR  ........ 14,260.00<br/>
                  Cr 4000 Sales ..... 12,400.00<br/>
                  Cr 2220 VAT Out ... 1,860.00
              </div>
              <Note style={{ marginTop: 10 }}>view T-accounts ›</Note>
            </div>
        </div>
      </div>
    </Frame>
  );
}

function V2_Customers() {
  return (
    <Frame title="Customers" subtitle="20 active · R 42,180 outstanding total" w={900} h={620}>
      <div style={{ display:'flex', height:'100%' }}>
        <SideNav items={['Home','Sales','Purchases','Banking','VAT 201','Reports','Setup']} active="Sales" />
        <div style={{ flex:1, padding: 14 }}>
          <div style={{ display:'flex', gap:6, marginBottom: 10 }}>
            <SField label="Search" w={220} value="🔍 customer name"/>
            <SField label="Status" w={120} value="active"/>
            <div style={{ flex:1 }}/>
            <SBtn small>Statements run</SBtn><SBtn primary small>＋ Customer</SBtn>
          </div>
          <div style={{ fontFamily:'Caveat', fontSize: 16, marginBottom: 4 }}>AR aging</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap: 8, marginBottom: 12 }}>
            {[['Current','23,780','55%'],['1–30 days','13,800','33%'],['31–60','4,600','11%', true],['61–90','—','—'],['90+','—','—']].map(([k,v,p,hi],i)=>(
              <SBox key={i} pad={8} fill="#fff" accent={hi}>
                <div style={{ fontFamily:'Patrick Hand', fontSize: 11, color: ink2 }}>{k}</div>
                <div style={{ fontFamily:'JetBrains Mono', fontSize: 16, fontWeight:700 }}>R {v}</div>
                <div style={{ fontFamily:'Caveat', fontSize: 13, color: hi?accent:ink2 }}>{p}</div>
              </SBox>
            ))}
          </div>
          <table style={{ width:'100%', borderCollapse:'collapse', fontFamily:'JetBrains Mono', fontSize:11 }}>
            <thead style={{ fontFamily:'Patrick Hand', fontSize: 12, borderBottom:`1.5px solid ${ink}` }}>
              <tr><th align="left">Customer</th><th align="left">VAT no.</th><th align="right">Open</th><th align="right">Overdue</th><th align="right">YTD sales</th><th>Last txn</th></tr>
            </thead>
            <tbody>
              {[
                ['Pick n Pay','4123456789','3,200.00','—','45,300.00','14/03'],
                ['Shoprite','4234567890','—','—','38,200.00','12/03'],
                ['Spar','4345678901','—','—','27,400.00','01/03'],
                ['Boxer Stores','4456789012','13,800.00','13,800.00','13,800.00','24/02', true],
                ['Cape Union','4567890123','4,600.00','4,600.00','9,200.00','21/02', true],
                ['Woolworths','4678901234','14,260.00','—','14,260.00','draft'],
                ['Massmart','4789012345','6,320.00','—','22,100.00','08/03'],
              ].map((r,i)=>(
                <tr key={i} style={{ borderBottom:`1px dotted ${muted}`, background: r[6]?accentSoft:'transparent' }}>
                  <td style={{ padding:'4px 4px', fontFamily:'Patrick Hand', fontSize: 13 }}>{r[0]}</td>
                  <td>{r[1]}</td>
                  <td align="right">{r[2]}</td>
                  <td align="right" style={{ color: r[3]==='—'?ink2:accent }}>{r[3]}</td>
                  <td align="right">{r[4]}</td>
                  <td align="right" style={{ color: ink2 }}>{r[5]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Frame>
  );
}

function V2_Bills() {
  return (
    <Frame title="Purchases · Bills" subtitle="What I owe · OCR-from-receipt enabled" w={900} h={620}>
      <div style={{ display:'flex', height:'100%' }}>
        <SideNav items={['Home','Sales','Purchases','Banking','VAT 201','Reports','Setup']} active="Purchases" />
        <div style={{ flex:1, padding: 14 }}>
          <div style={{ display:'flex', gap:6, marginBottom: 10 }}>
            {['All (18)','Awaiting approval (3)','Approved (4)','Paid (11)'].map((t,i)=>(
              <div key={i} style={{
                padding:'4px 10px', fontFamily:'Patrick Hand', fontSize: 13,
                borderRadius: 3, border: `1.5px solid ${i===0?ink:ink2}`,
                background: i===0?ink:'transparent', color: i===0?paper:ink,
              }}>{t}</div>
            ))}
            <div style={{ flex:1 }}/>
            <SBtn small>📎 Drop receipt</SBtn><SBtn primary small>＋ New bill</SBtn>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap: 12 }}>
            <div>
              <table style={{ width:'100%', borderCollapse:'collapse', fontFamily:'JetBrains Mono', fontSize:11 }}>
                <thead style={{ fontFamily:'Patrick Hand', fontSize: 12, borderBottom:`1.5px solid ${ink}` }}>
                  <tr><th align="left">Ref</th><th align="left">Supplier</th><th align="left">Due</th><th align="right">Excl</th><th align="right">VAT</th><th align="right">Total</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {[
                    ['BILL-44','City of Cape Town · Rent','15/03','8,000.00','—','8,000.00','Paid'],
                    ['BILL-45','Eskom','20/03','1,540.00','201.00','1,741.00','Paid'],
                    ['BILL-46','Telkom','22/03','533.00','79.50','612.50','Approved'],
                    ['BILL-47','Sars Wholesale','28/03','15,696.00','2,354.00','18,050.00','Awaiting', true],
                    ['BILL-48','Office Stationery','30/03','783.00','117.45','900.45','Awaiting', true],
                    ['BILL-49','MTN — data','01/04','434.00','65.10','499.10','Awaiting', true],
                  ].map((r,i)=>(
                    <tr key={i} style={{ borderBottom:`1px dotted ${muted}`, background: r[7]?accentSoft:'transparent' }}>
                      <td style={{ padding:'5px 4px' }}>{r[0]}</td>
                      <td style={{ fontFamily:'Patrick Hand', fontSize: 13 }}>{r[1]}</td>
                      <td>{r[2]}</td>
                      <td align="right">{r[3]}</td><td align="right">{r[4]}</td>
                      <td align="right" style={{ fontWeight:600 }}>{r[5]}</td>
                      <td><span style={{
                        fontFamily:'Patrick Hand', fontSize: 11,
                        border: `1px solid ${r[7]?accent:ink2}`, borderRadius: 8, padding:'1px 6px',
                        color: r[7]?accent:ink,
                      }}>{r[6]}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ background: paperEdge+'40', padding: 12, borderRadius: 4 }}>
              <div style={{ fontFamily:'Caveat', fontSize: 18 }}>BILL-47 preview</div>
              <Hatch h={100} label="receipt PDF / photo" />
              <div style={{ marginTop: 8, fontFamily:'Patrick Hand', fontSize: 12, lineHeight: 1.5 }}>
                <div>Supplier: <b>Sars Wholesale</b></div>
                <div>VAT no: <b style={{ color: accent }}>4998877665 ✓</b></div>
                <div>Excl: R 15,696.00 · VAT R 2,354.00</div>
                <div>Total: <b>R 18,050.00</b></div>
              </div>
              <div style={{ display:'flex', gap: 6, marginTop: 10 }}>
                <SBtn small>Reject</SBtn><SBtn primary small>Approve</SBtn>
              </div>
              <Note style={{ marginTop: 8 }}>2-person approval rule on bills &gt; R 10k</Note>
            </div>
          </div>
        </div>
      </div>
    </Frame>
  );
}

window.V2Sales = { Invoices: V2_Invoices, InvoiceCreate: V2_InvoiceCreate, Customers: V2_Customers, Bills: V2_Bills };
