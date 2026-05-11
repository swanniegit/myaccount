// CHART OF ACCOUNTS — 4 variations.

function COA_V1_LedgerBook() {
  return (
    <Frame title="Chart of Accounts" subtitle="V1 · Ledger Book — classic SA SME COA, hand-listed">
      <div style={{ padding: 14, height:'100%' }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom: 6 }}>
          <div style={{ fontFamily:'Caveat', fontSize:20 }}>Chart of Accounts — bound book</div>
          <SBtn primary small>＋ Open new account</SBtn>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 14 }}>
          {[
            ['Assets (1xxx)', [['1000','FNB Cheque'],['1010','Petty Cash'],['1100','Accounts Receivable'],['1500','Stock on hand'],['1700','Equipment'],['1750','Acc. depreciation']]],
            ['Liabilities (2xxx)', [['2000','Accounts Payable'],['2100','PAYE Control'],['2150','UIF Control'],['2200','VAT Control'],['2210','VAT Input'],['2220','VAT Output'],['2500','Loan — Nedbank']]],
            ['Equity (3xxx)', [['3000','Owner equity'],['3100','Drawings'],['3200','Retained earnings']]],
            ['Income (4xxx)', [['4000','Sales'],['4100','Other income'],['4200','Interest received']]],
            ['Expense (5xxx)', [['5100','Rent'],['5200','Utilities'],['5300','Wages & salaries'],['5310','UIF expense'],['5400','Bank charges'],['5500','Stationery']]],
          ].map(([title, rows],i)=>(
            <SBox key={i} pad={10} fill="#fff" style={{ alignSelf:'start' }}>
              <div style={{ fontFamily:'Caveat', fontSize:16, marginBottom: 4 }}>{title}</div>
              <Squiggle/>
              {rows.map((r,k)=>(
                <div key={k} style={{ display:'flex', justifyContent:'space-between', fontFamily:'Patrick Hand', fontSize:12, padding:'2px 0', borderBottom:`1px dotted ${muted}` }}>
                  <span><span style={{ fontFamily:'JetBrains Mono', fontSize:10, color: ink2 }}>{r[0]}</span>  {r[1]}</span>
                  <span style={{ color: accent }}>⊥</span>
                </div>
              ))}
            </SBox>
          ))}
        </div>
      </div>
    </Frame>
  );
}

function COA_V2_ModernCards() {
  return (
    <Frame title="Chart of Accounts" subtitle="V2 · Modern — searchable table with badges">
      <div style={{ padding: 12, height:'100%' }}>
        <div style={{ display:'flex', gap:6, marginBottom: 8 }}>
          <SField label="Search" w={220} value="🔍 type to filter" />
          <SField label="Type" w={120} value="all" />
          <div style={{ flex:1 }}/>
          <SBtn small>Import from CSV</SBtn><SBtn primary small>＋ Account</SBtn>
        </div>
        <table style={{ width:'100%', borderCollapse:'collapse', fontFamily:'JetBrains Mono', fontSize:11 }}>
          <thead style={{ fontFamily:'Patrick Hand', fontSize:12, borderBottom:`1.5px solid ${ink}` }}>
            <tr><th align="left">Code</th><th align="left">Name</th><th align="left">Type</th><th align="left">Tax</th><th align="right">Balance</th><th align="right">Last entry</th></tr>
          </thead>
          <tbody>
            {[
              ['1000','FNB Cheque','Asset','—','(641.00)','14/03'],
              ['1010','Petty Cash','Asset','—','700.00','11/03'],
              ['1100','Accounts Receivable','Asset','—','20,600.00','14/03'],
              ['1500','Stock on hand','Asset','—','45,600.00','12/03'],
              ['2000','Accounts Payable','Liability','—','(36,950.00)','13/03'],
              ['2200','VAT Control','Liability','SARS','(3,360.00)','14/03'],
              ['2210','VAT Input','Liability','15%','5,808.00','14/03'],
              ['2220','VAT Output','Liability','15%','(9,449.00)','14/03'],
              ['4000','Sales','Income','15%','(62,993.00)','14/03'],
              ['5100','Rent','Expense','15%','32,000.00','13/03'],
              ['5300','Wages','Expense','—','36,000.00','11/03'],
            ].map((r,i)=>(
              <tr key={i} style={{ borderBottom:`1px dotted ${muted}` }}>
                <td style={{ padding:'4px 4px' }}>{r[0]}</td>
                <td style={{ fontFamily:'Patrick Hand', fontSize:13 }}>{r[1]}</td>
                <td><span style={{ fontFamily:'Patrick Hand', fontSize:11, border:`1px solid ${ink2}`, borderRadius: 8, padding:'1px 6px' }}>{r[2]}</span></td>
                <td>{r[3]==='15%' ? <span style={{ color: accent }}>{r[3]}</span> : r[3]}</td>
                <td align="right" style={{ fontWeight:600 }}>{r[4]}</td>
                <td align="right" style={{ color: ink2 }}>{r[5]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Frame>
  );
}

function COA_V3_TreeMap() {
  // Novel: tree-map sized by balance — see where the money lives
  const boxes = [
    { l:'Stock', v:'45,600', x:0,y:0,w:50,h:50, t:'Asset' },
    { l:'Equipment', v:'38,000', x:50,y:0,w:32,h:50, t:'Asset' },
    { l:'AR', v:'20,600', x:82,y:0,w:18,h:50, t:'Asset' },
    { l:'Loan', v:'60,000', x:0,y:50,w:40,h:25, t:'Liab' },
    { l:'Equity', v:'40,000', x:40,y:50,w:30,h:25, t:'Eq' },
    { l:'AP', v:'36,950', x:70,y:50,w:24,h:25, t:'Liab' },
    { l:'VAT', v:'3,360', x:94,y:50,w:6,h:25, t:'Liab', accent:true },
    { l:'Wages', v:'36,000', x:0,y:75,w:30,h:25, t:'Exp' },
    { l:'Rent', v:'32,000', x:30,y:75,w:27,h:25, t:'Exp' },
    { l:'Sales', v:'62,993', x:57,y:75,w:35,h:25, t:'Inc' },
    { l:'Other', v:'5,051', x:92,y:75,w:8,h:25, t:'Exp' },
  ];
  return (
    <Frame title="Chart of Accounts" subtitle="V3 · Treemap  ✦ novel — area = balance, color = type">
      <div style={{ padding: 12, height:'100%' }}>
        <div style={{ fontFamily:'Caveat', fontSize:18, marginBottom: 4 }}>Where the money lives — March</div>
        <div style={{ position:'relative', width:'100%', height: 320, border:`2px solid ${ink}`, borderRadius: 4, overflow:'hidden', background:'#fff' }}>
          {boxes.map((b,i)=>(
            <div key={i} style={{
              position:'absolute', left:b.x+'%', top:b.y+'%', width:b.w+'%', height:b.h+'%',
              border: `1.5px solid ${ink}`,
              background: b.accent ? accentSoft : (b.t==='Asset'?'#f0e9d4':b.t==='Liab'?'#e6dcd8':b.t==='Inc'?'#dde6dc':b.t==='Eq'?'#dadce6':'#f7eee2'),
              padding: 4, display:'flex', flexDirection:'column', justifyContent:'space-between',
            }}>
              <div style={{ fontFamily:'Patrick Hand', fontSize: b.w>20?13:11, lineHeight:1 }}>{b.l}</div>
              <div style={{ fontFamily:'JetBrains Mono', fontSize: b.w>20?11:9, color: ink2 }}>R {b.v}</div>
            </div>
          ))}
        </div>
        <div style={{ display:'flex', gap: 10, marginTop: 8, fontFamily:'Patrick Hand', fontSize:12 }}>
          {[['Asset','#f0e9d4'],['Liab','#e6dcd8'],['Equity','#dadce6'],['Income','#dde6dc'],['Expense','#f7eee2']].map(([l,c],i)=>(
            <div key={i} style={{ display:'flex', alignItems:'center', gap: 4 }}>
              <div style={{ width: 12, height: 12, background: c, border:`1px solid ${ink}` }}/>{l}
            </div>
          ))}
          <div style={{ flex:1 }}/>
          <Note>Click any tile → that T-account</Note>
        </div>
      </div>
    </Frame>
  );
}

function COA_V4_SplitGrid() {
  return (
    <Frame title="Chart of Accounts" subtitle="V4 · Split Grid — list + edit panel">
      <div style={{ display:'grid', gridTemplateColumns:'1.2fr 1fr', height:'100%' }}>
        <div style={{ borderRight:`1.5px solid ${ink}`, padding: 10, overflow:'hidden' }}>
          <SField w="100%" value="🔍 search 47 accounts" style={{ marginBottom: 6 }}/>
          <div style={{ fontFamily:'Patrick Hand', fontSize:12, color: ink2 }}>▾ ASSETS (6)</div>
          {[['1000','FNB Cheque',true],['1010','Petty Cash'],['1100','AR'],['1500','Stock'],['1700','Equipment'],['1750','Acc. depr']].map((r,i)=>(
            <div key={i} style={{
              display:'flex', justifyContent:'space-between',
              padding:'3px 8px', fontFamily:'Patrick Hand', fontSize:13,
              background: r[2]?accentSoft:'transparent',
              borderLeft: r[2]?`3px solid ${accent}`:'3px solid transparent',
            }}><span><span style={{ fontFamily:'JetBrains Mono', fontSize:10, color: ink2 }}>{r[0]}</span>  {r[1]}</span></div>
          ))}
          <div style={{ fontFamily:'Patrick Hand', fontSize:12, color: ink2, marginTop: 6 }}>▾ LIABILITIES (7)</div>
          {[['2000','AP'],['2100','PAYE Control'],['2150','UIF Control'],['2200','VAT Control'],['2500','Loan']].map((r,i)=>(
            <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'3px 8px', fontFamily:'Patrick Hand', fontSize:13 }}>
              <span><span style={{ fontFamily:'JetBrains Mono', fontSize:10, color: ink2 }}>{r[0]}</span>  {r[1]}</span>
            </div>
          ))}
          <div style={{ fontFamily:'Patrick Hand', fontSize:12, color: ink2, marginTop: 6 }}>▸ EQUITY · INCOME · EXPENSE</div>
        </div>
        <div style={{ padding: 12, background: paperEdge + '40' }}>
          <div style={{ fontFamily:'Caveat', fontSize:20 }}>1000 · FNB Cheque</div>
          <Squiggle style={{ margin:'4px 0 8px' }}/>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 8, marginBottom: 8 }}>
            <SField label="Code" w="100%" value="1000"/>
            <SField label="Type" w="100%" value="Asset · Bank"/>
            <SField label="Tax code" w="100%" value="None"/>
            <SField label="Bank acc" w="100%" value="62-0014…3201"/>
            <SField label="Currency" w="100%" value="ZAR"/>
            <SField label="Status" w="100%" value="Active"/>
          </div>
          <div style={{ fontFamily:'Patrick Hand', fontSize:13 }}>Current balance</div>
          <div style={{ fontFamily:'JetBrains Mono', fontSize:22, fontWeight:700 }}>R (641.00)</div>
          <div style={{ display:'flex', gap: 6, marginTop: 10 }}>
            <SBtn small>View T</SBtn><SBtn small>Reconcile</SBtn><SBtn primary small>Save</SBtn>
          </div>
        </div>
      </div>
    </Frame>
  );
}

window.COA = { V1: COA_V1_LedgerBook, V2: COA_V2_ModernCards, V3: COA_V3_TreeMap, V4: COA_V4_SplitGrid };
