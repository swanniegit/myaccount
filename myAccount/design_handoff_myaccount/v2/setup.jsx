// V2 deep-dive — Setup (Chart of Accounts, Company settings)

function V2_COA() {
  return (
    <Frame title="Setup · Chart of Accounts" subtitle="47 accounts · grouped by type · SA SME default" w={900} h={620}>
      <div style={{ display:'flex', height:'100%' }}>
        <SideNav items={['Home','Sales','Purchases','Banking','VAT 201','Reports','Setup']} active="Setup" />
        <div style={{ flex:1, padding: 14 }}>
          <div style={{ display:'flex', gap:6, marginBottom: 10 }}>
            <SField label="Search" w={240} value="🔍 type name or code"/>
            <SField label="Type" w={140} value="all"/>
            <div style={{ flex:1 }}/>
            <SBtn small>Import CSV</SBtn><SBtn small>Reset to SA default</SBtn><SBtn primary small>＋ Account</SBtn>
          </div>
          <table style={{ width:'100%', borderCollapse:'collapse', fontFamily:'JetBrains Mono', fontSize:11 }}>
            <thead style={{ fontFamily:'Patrick Hand', fontSize:12, borderBottom:`1.5px solid ${ink}` }}>
              <tr><th align="left">Code</th><th align="left">Name</th><th align="left">Type</th><th align="left">Tax</th><th align="right">Balance</th><th align="right">YTD movement</th><th></th></tr>
            </thead>
            <tbody>
              {[
                ['1000','FNB Cheque','Bank','—','(641.00)','30,441.00'],
                ['1010','Petty Cash','Bank','—','700.00','200.00'],
                ['1100','Accounts Receivable','Asset (current)','—','20,600.00','28,800.00'],
                ['1500','Stock on hand','Asset (current)','—','45,600.00','21,600.00'],
                ['1700','Equipment','Asset (fixed)','—','38,000.00','—'],
                ['2000','Accounts Payable','Liability (current)','—','(36,950.00)','22,432.00'],
                ['2100','PAYE Control','Liability (current)','SARS','(4,200.00)','12,600.00'],
                ['2150','UIF Control','Liability (current)','SARS','(360.00)','1,080.00'],
                ['2200','VAT Control','Liability (current)','SARS','(3,360.00)','5,817.00'],
                ['2210','VAT Input','Liability','15%','5,808.00','17,424.00'],
                ['2220','VAT Output','Liability','15%','(9,449.00)','28,347.00'],
                ['2500','Loan — Nedbank','Liability (long)','—','(60,000.00)','—'],
                ['3000','Owner equity','Equity','—','(40,000.00)','—'],
                ['4000','Sales','Income','15%','(62,993.00)','62,993.00'],
                ['5100','Rent','Expense','15%','32,000.00','32,000.00'],
                ['5200','Utilities','Expense','15%','4,820.00','4,820.00'],
                ['5300','Wages & salaries','Expense','—','36,000.00','36,000.00'],
                ['5310','UIF expense','Expense','—','360.00','360.00'],
              ].map((r,i)=>(
                <tr key={i} style={{ borderBottom:`1px dotted ${muted}` }}>
                  <td style={{ padding:'3px 4px' }}>{r[0]}</td>
                  <td style={{ fontFamily:'Patrick Hand', fontSize: 13 }}>{r[1]}</td>
                  <td><span style={{ fontFamily:'Patrick Hand', fontSize: 11, border:`1px solid ${ink2}`, borderRadius: 8, padding: '1px 6px' }}>{r[2]}</span></td>
                  <td>{r[3]==='15%' ? <span style={{ color: accent }}>{r[3]}</span> : r[3]}</td>
                  <td align="right" style={{ fontWeight:600 }}>{r[4]}</td>
                  <td align="right" style={{ color: ink2 }}>{r[5]}</td>
                  <td align="center" style={{ color: accent, fontFamily:'Caveat', fontSize: 14 }}>⊥ T</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Frame>
  );
}

function V2_Settings() {
  return (
    <Frame title="Setup · Company" subtitle="SARS / VAT / banking · used everywhere" w={900} h={620}>
      <div style={{ display:'flex', height:'100%' }}>
        <SideNav items={['Home','Sales','Purchases','Banking','VAT 201','Reports','Setup']} active="Setup" />
        <div style={{ flex:1, padding: 14 }}>
          <div style={{ display:'flex', gap: 6, marginBottom: 12 }}>
            {['Company','Tax & SARS','Bank accounts','Users','Year-end','Integrations'].map((t,i)=>(
              <div key={i} style={{
                padding:'4px 10px', fontFamily:'Patrick Hand', fontSize: 12,
                borderRadius: 3, border:`1.5px solid ${i===1?ink:ink2}`,
                background: i===1?ink:'transparent', color: i===1?paper:ink,
              }}>{t}</div>
            ))}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1.1fr 1fr', gap: 14 }}>
            <SBox pad={14} fill="#fff">
              <div style={{ fontFamily:'Caveat', fontSize: 18, marginBottom: 4 }}>Tax registration</div>
              <Squiggle/>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 8, marginTop: 8 }}>
                <SField label="Business name" w="100%" value="Thandi's Trading (Pty) Ltd"/>
                <SField label="Reg no." w="100%" value="2022/123456/07"/>
                <SField label="Tax / Income tax no." w="100%" value="9123456789"/>
                <SField label="VAT no." w="100%" value="4123456789"/>
                <SField label="VAT registration date" w="100%" value="01/03/2024"/>
                <SField label="VAT cycle" w="100%" value="Category A · bi-monthly"/>
                <SField label="PAYE / UIF / SDL ref" w="100%" value="7700123456"/>
                <SField label="SARS eFiling user" w="100%" value="TG-44 · linked ✓"/>
              </div>
              <Note style={{ marginTop: 10 }}>Used on every tax invoice, VAT 201 and EMP 201 submission</Note>
            </SBox>
            <SBox pad={14} fill="#fff">
              <div style={{ fontFamily:'Caveat', fontSize: 18, marginBottom: 4 }}>Accounting policy</div>
              <Squiggle/>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 8, marginTop: 8 }}>
                <SField label="Reporting standard" w="100%" value="IFRS for SMEs"/>
                <SField label="Functional currency" w="100%" value="ZAR (R)"/>
                <SField label="Year end" w="100%" value="28 February"/>
                <SField label="Books locked through" w="100%" value="31 January 2026"/>
                <SField label="Default VAT" w="100%" value="15% (standard)"/>
                <SField label="Inventory method" w="100%" value="FIFO · perpetual"/>
              </div>
              <Squiggle style={{ margin:'14px 0' }}/>
              <div style={{ fontFamily:'Caveat', fontSize: 16 }}>Status</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 6, marginTop: 6, fontFamily:'Patrick Hand', fontSize: 13 }}>
                <div>SARS eFiling <span style={{ color: accent }}>linked ✓</span></div>
                <div>FNB bank feed <span style={{ color: accent }}>linked ✓</span></div>
                <div>SimplePay (payroll) <span style={{ color: ink2 }}>not linked</span></div>
                <div>Yoco / Stitch (POS) <span style={{ color: ink2 }}>not linked</span></div>
              </div>
            </SBox>
          </div>

          <div style={{ display:'flex', justifyContent:'space-between', marginTop: 12 }}>
            <Note>Locking the books prevents back-dated journal entries · year-end runs the IT14 pack</Note>
            <SBtn primary small>Save settings</SBtn>
          </div>
        </div>
      </div>
    </Frame>
  );
}

window.V2Setup = { COA: V2_COA, Settings: V2_Settings };
