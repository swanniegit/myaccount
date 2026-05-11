// V2 Payroll — South African payroll module.
//
// SA-specific logic baked in:
//   • PAYE — SARS 2025/26 tax tables (annual brackets, monthly = ÷12)
//   • Rebates — Primary R17,235 · 65+ R9,444 · 75+ R3,145 (annual)
//   • UIF — 1% employee + 1% employer, capped at R17,712 earnings = R177.12 each
//   • SDL — 1% of payroll, employer only, exempt if annual payroll < R500k
//   • Medical Aid Tax Credit — R364 main + R364 first dep + R246 each additional (monthly)
//   • Retirement Annuity — 27.5% of remuneration deductible, capped R350k/year
//   • EMP201 — monthly return, due by 7th of following month
//   • IRP5 / EMP501 — annual employee certificate + bi-annual employer recon
//   • COIDA — Compensation Fund letter of good standing
//   • BCEA leave — 15 annual / 30 sick (3yr) / 3 family responsibility / 4mo maternity (UIF)

function V2_PayrollDashboard() {
  return (
    <Frame title="Payroll · March 2026" subtitle="Monthly run · EMP201 due 7 Apr" w={900} h={620}>
      <div style={{ display:'flex', height:'100%' }}>
        <SideNav items={['Home','Sales','Purchases','Banking','Payroll','VAT 201','Reports','Setup']} active="Payroll" />
        <div style={{ flex:1, padding: 14 }}>
          <div style={{ display:'flex', gap: 6, marginBottom: 12 }}>
            {['Overview','Employees (8)','Run payroll','EMP201','IRP5 / EMP501','Leave'].map((t,i)=>(
              <div key={i} style={{
                padding:'4px 10px', fontFamily:'Patrick Hand', fontSize: 12,
                borderRadius: 3, border: `1.5px solid ${i===0?ink:ink2}`,
                background: i===0?ink:'transparent', color: i===0?paper:ink,
              }}>{t}</div>
            ))}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 10 }}>
            {[
              { l:'Headcount', v:'8', s:'7 monthly · 1 weekly' },
              { l:'Gross pay (Mar)', v:'R 184,500', s:'+R 4,200 vs Feb' },
              { l:'Net pay', v:'R 142,180', s:'after PAYE + UIF + RA' },
              { l:'Statutory due', v:'R 38,920', s:'PAYE + UIF + SDL · 7 Apr', highlight: true },
            ].map((k,i)=>(
              <SBox key={i} pad={10} fill={k.highlight?accentSoft:'#fff'} accent={k.highlight}>
                <div style={{ fontFamily:'Patrick Hand', fontSize: 11, color: ink2 }}>{k.l}</div>
                <div style={{ fontFamily:'Caveat', fontSize: 26, lineHeight: 1.1 }}>{k.v}</div>
                <div style={{ fontFamily:'Patrick Hand', fontSize: 11, color: ink2 }}>{k.s}</div>
              </SBox>
            ))}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr', gap: 12, marginTop: 12 }}>
            <SBox pad={12}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
                <div style={{ fontFamily:'Caveat', fontSize: 20 }}>March run · status</div>
                <div style={{ fontFamily:'Patrick Hand', fontSize: 12, color: ink2 }}>pay date · 25 Mar 2026</div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap: 6, marginTop: 8 }}>
                {[
                  { n:1, t:'Inputs', s:'leave · OT · bonuses', done:true },
                  { n:2, t:'Calculate', s:'PAYE · UIF · SDL', done:true },
                  { n:3, t:'Review payslips', s:'8 of 8 approved', active:true },
                  { n:4, t:'Pay & file', s:'EFT batch + EMP201' },
                ].map((s,i)=>(
                  <div key={i} style={{
                    padding: 8, border: `1.5px solid ${s.active?accent:s.done?ink:ink2}`,
                    background: s.active?accentSoft:s.done?'#fff':'#fafafa', borderRadius: 4,
                  }}>
                    <div style={{ fontFamily:'Caveat', fontSize: 14, color: s.done?ink:s.active?accent:ink2 }}>{s.done?'✓':s.n}. {s.t}</div>
                    <div style={{ fontFamily:'Patrick Hand', fontSize: 11, color: ink2 }}>{s.s}</div>
                  </div>
                ))}
              </div>
              <Squiggle style={{ margin:'10px 0' }}/>
              <div style={{ fontFamily:'Caveat', fontSize: 16, marginBottom: 4 }}>Statutory breakdown</div>
              <table style={{ width:'100%', fontFamily:'JetBrains Mono', fontSize: 11, borderCollapse:'collapse' }}>
                <tbody>
                  {[
                    ['PAYE', '32,140.00', 'EMP201 line A'],
                    ['UIF — employee 1%', '1,604.18', 'capped @ R177.12 × 8'],
                    ['UIF — employer 1%', '1,604.18', 'EMP201 line B'],
                    ['SDL — 1% of payroll', '1,845.00', 'EMP201 line C · exempt if <R500k/y'],
                    ['Total to SARS', '37,193.36', 'paid via eFiling by 7 Apr'],
                  ].map((r,i)=>(
                    <tr key={i} style={{
                      borderBottom: `1px dotted ${muted}`,
                      fontWeight: i===4?700:400,
                      background: i===4?accentSoft:'transparent',
                    }}>
                      <td style={{ padding:'4px 6px', fontFamily:'Patrick Hand', fontSize: 13 }}>{r[0]}</td>
                      <td align="right">{r[1]}</td>
                      <td style={{ fontFamily:'Patrick Hand', fontSize: 11, color: ink2, padding:'4px 6px' }}>{r[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </SBox>

            <SBox pad={12}>
              <div style={{ fontFamily:'Caveat', fontSize: 20 }}>Needs you</div>
              <div style={{ display:'flex', flexDirection:'column', gap: 6, marginTop: 6 }}>
                {[
                  { t:'EMP501 mid-year recon', s:'due 31 Oct · 6 months away', tone:'soft' },
                  { t:'Sipho — RA contribution change', s:'increase from 7.5% to 10%', tone:'accent' },
                  { t:'COIDA letter of good standing', s:'renew before 31 Mar', tone:'warn' },
                  { t:'Mandla — birthday 12 Apr (turns 65)', s:'apply additional age rebate', tone:'soft' },
                ].map((x,i)=>(
                  <div key={i} style={{
                    padding: '6px 8px',
                    border: `1.5px solid ${x.tone==='accent'?accent:x.tone==='warn'?'#c0392b':ink2}`,
                    background: x.tone==='accent'?accentSoft:x.tone==='warn'?'#fdecea':'#fff',
                    borderRadius: 3,
                  }}>
                    <div style={{ fontFamily:'Caveat', fontSize: 14 }}>{x.t}</div>
                    <div style={{ fontFamily:'Patrick Hand', fontSize: 11, color: ink2 }}>{x.s}</div>
                  </div>
                ))}
              </div>
            </SBox>
          </div>
          <Note style={{ position:'absolute', bottom: 14, right: 14 }}>tax tables · SARS 2025/26 · auto-updates each March</Note>
        </div>
      </div>
    </Frame>
  );
}

function V2_Employees() {
  const rows = [
    { id:'EMP-001', name:'Thandi Mokoena', role:'Director', tax:'TI-4421', basic:42000, paye:8920, uif:177, net:32903, status:'active' },
    { id:'EMP-002', name:'Sipho Dlamini', role:'Senior dev', tax:'TI-3920', basic:38000, paye:7140, uif:177, net:30683, status:'active' },
    { id:'EMP-003', name:'Lerato Nkosi', role:'Designer', tax:'TI-2810', basic:28000, paye:3820, uif:177, net:24003, status:'active' },
    { id:'EMP-004', name:'Mandla Khumalo', role:'Operations', tax:'TI-3110', basic:25000, paye:2890, uif:177, net:21933, status:'active', flag:'65 next month' },
    { id:'EMP-005', name:'Aisha Patel', role:'Accountant', tax:'TI-2540', basic:24000, paye:2410, uif:177, net:21413, status:'active' },
    { id:'EMP-006', name:'Pieter van Wyk', role:'Sales', tax:'TI-2220', basic:18000, paye:980, uif:180, net:16840, status:'active' },
    { id:'EMP-007', name:'Naledi Sithole', role:'Intern', tax:'IT3a', basic:6500, paye:0, uif:65, net:6435, status:'active', flag:'IT3a · below threshold' },
    { id:'EMP-008', name:'James Botha', role:'Driver (weekly)', tax:'TI-1840', basic:3000, paye:0, uif:30, net:2970, status:'weekly' },
  ];
  return (
    <Frame title="Employees" subtitle="8 active · annual cost-to-company R 2.34m" w={900} h={620}>
      <div style={{ display:'flex', height:'100%' }}>
        <SideNav items={['Home','Sales','Purchases','Banking','Payroll','VAT 201','Reports','Setup']} active="Payroll" />
        <div style={{ flex:1, padding: 14 }}>
          <div style={{ display:'flex', gap: 6, marginBottom: 10 }}>
            {['Overview','Employees (8)','Run payroll','EMP201','IRP5 / EMP501','Leave'].map((t,i)=>(
              <div key={i} style={{
                padding:'4px 10px', fontFamily:'Patrick Hand', fontSize: 12,
                borderRadius: 3, border: `1.5px solid ${i===1?ink:ink2}`,
                background: i===1?ink:'transparent', color: i===1?paper:ink,
              }}>{t}</div>
            ))}
            <div style={{ flex:1 }}/>
            <SBtn small>Import IRP5</SBtn>
            <SBtn primary small>＋ New employee</SBtn>
          </div>

          <table style={{ width:'100%', borderCollapse:'collapse', fontFamily:'JetBrains Mono', fontSize: 11 }}>
            <thead style={{ fontFamily:'Patrick Hand', fontSize: 12, borderBottom: `2px solid ${ink}` }}>
              <tr>
                <th align="left">ID</th>
                <th align="left">Name · Role</th>
                <th align="left">Tax #</th>
                <th align="right">Basic</th>
                <th align="right">PAYE</th>
                <th align="right">UIF</th>
                <th align="right">Net</th>
                <th align="left">Flags</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r,i)=>(
                <tr key={i} style={{ borderBottom:`1px dotted ${muted}`, height: 32 }}>
                  <td style={{ padding:'4px 6px', color: ink2 }}>{r.id}</td>
                  <td style={{ fontFamily:'Patrick Hand', fontSize: 13 }}>
                    {r.name} <span style={{ color: ink2, fontSize: 11 }}>· {r.role}</span>
                  </td>
                  <td>{r.tax}</td>
                  <td align="right">{r.basic.toLocaleString()}</td>
                  <td align="right">{r.paye.toLocaleString()}</td>
                  <td align="right">{r.uif}</td>
                  <td align="right" style={{ fontWeight: 700 }}>{r.net.toLocaleString()}</td>
                  <td>{r.flag && <span style={{ fontFamily:'Patrick Hand', fontSize: 11, color: accent, background: accentSoft, padding:'1px 5px', borderRadius: 3 }}>{r.flag}</span>}</td>
                </tr>
              ))}
              <tr style={{ borderTop:`2px solid ${ink}`, fontWeight:700, background: accentSoft }}>
                <td colSpan="3" style={{ padding:'6px 6px', fontFamily:'Caveat', fontSize: 15 }}>Total · 8 employees</td>
                <td align="right">184,500</td>
                <td align="right">32,140</td>
                <td align="right">1,160</td>
                <td align="right">157,360</td>
                <td/>
              </tr>
            </tbody>
          </table>
          <Note style={{ position:'absolute', bottom: 14, right: 14 }}>click any row → employee profile (tax · banking · leave · benefits · history)</Note>
        </div>
      </div>
    </Frame>
  );
}

function V2_RunPayroll() {
  return (
    <Frame title="Run payroll · March 2026" subtitle="Step 2 of 4 · Calculate · review variances before approving" w={900} h={620}>
      <div style={{ display:'flex', height:'100%' }}>
        <SideNav items={['Home','Sales','Purchases','Banking','Payroll','VAT 201','Reports','Setup']} active="Payroll" />
        <div style={{ flex:1, padding: 14 }}>
          <div style={{ display:'flex', gap: 4, marginBottom: 10, alignItems:'center' }}>
            {['1. Inputs','2. Calculate','3. Review','4. Pay & file'].map((s,i)=>(
              <React.Fragment key={i}>
                <div style={{
                  padding:'4px 10px', fontFamily:'Caveat', fontSize: 14,
                  background: i<=1?ink:'transparent', color: i<=1?paper:ink,
                  border:`1.5px solid ${ink}`, borderRadius: 3,
                }}>{s}</div>
                {i<3 && <div style={{ width: 12, borderTop:`1.5px ${i<1?'solid':'dashed'} ${ink}` }}/>}
              </React.Fragment>
            ))}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1.5fr 1fr', gap: 12 }}>
            <SBox pad={12}>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <div style={{ fontFamily:'Caveat', fontSize: 18 }}>Sipho Dlamini · Senior dev</div>
                <div style={{ fontFamily:'Patrick Hand', fontSize: 12, color: ink2 }}>3 of 8 · ←  →</div>
              </div>
              <Squiggle style={{ margin: '6px 0' }}/>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 8, fontFamily:'JetBrains Mono', fontSize: 11 }}>
                <div>
                  <div style={{ fontFamily:'Patrick Hand', fontSize: 12, color: ink2 }}>Earnings</div>
                  <Row k="Basic salary" v="38,000.00"/>
                  <Row k="Travel allowance (80%)" v=" 4,000.00"/>
                  <Row k="Overtime · 4hrs @ 1.5×" v=" 1,250.00" sub="approved by Thandi 20 Mar"/>
                  <Row k="Performance bonus" v=" 2,500.00"/>
                  <Row k="— Gross —" v="45,750.00" bold/>
                </div>
                <div>
                  <div style={{ fontFamily:'Patrick Hand', fontSize: 12, color: ink2 }}>Deductions</div>
                  <Row k="PAYE" v=" 8,420.00" sub="tax tables · primary rebate"/>
                  <Row k="UIF — 1%" v="   177.12" sub="capped @ R17,712 earn"/>
                  <Row k="RA · 10% (was 7.5%)" v=" 3,800.00" sub="↑ change effective Mar"/>
                  <Row k="Medical aid (main+2)" v=" 4,210.00"/>
                  <Row k="— Total —" v="16,607.12" bold/>
                </div>
              </div>
              <Squiggle style={{ margin: '8px 0' }}/>
              <div style={{ display:'flex', justifyContent:'space-between', fontFamily:'Caveat', fontSize: 22 }}>
                <span>Net pay</span>
                <span style={{ color: accent }}>R 29,142.88</span>
              </div>
              <Note style={{ marginTop: 6 }}>variance vs Feb · +R 6,250 (RA change · OT · bonus) — flagged for review</Note>
            </SBox>

            <SBox pad={12} fill={accentSoft}>
              <div style={{ fontFamily:'Caveat', fontSize: 18 }}>How PAYE was calculated</div>
              <div style={{ fontFamily:'Patrick Hand', fontSize: 12, color: ink2, marginBottom: 4 }}>SARS 2025/26 monthly equivalent · Sipho is under 65</div>
              <div style={{ fontFamily:'JetBrains Mono', fontSize: 10, lineHeight: 1.7, background:'#fff', padding: 8, borderRadius: 3, border:`1px solid ${muted}` }}>
                Taxable income (annual)..548,400<br/>
                Bracket: 370k-512k → 27%<br/>
                Tax before rebate.........115,418<br/>
                – Primary rebate.......... 17,235<br/>
                – Medical credit (3 dep).. 11,472<br/>
                Annual PAYE...............86,711<br/>
                ÷ 12 = <b>R 7,226</b>/mo base<br/>
                + bonus annualization.... 1,194<br/>
                = <b>R 8,420 this month</b>
              </div>
              <Squiggle style={{ margin:'10px 0' }}/>
              <div style={{ fontFamily:'Caveat', fontSize: 16 }}>Will post to GL</div>
              <div style={{ fontFamily:'JetBrains Mono', fontSize: 10, lineHeight: 1.5, marginTop: 4 }}>
                Dr 6500 Salaries .... 45,750<br/>
                  Cr 2100 PAYE control . 8,420<br/>
                  Cr 2110 UIF control .. 354 (emp+er)<br/>
                  Cr 2120 RA payable . 3,800<br/>
                  Cr 2130 Med aid .... 4,210<br/>
                  Cr 1000 FNB ........ 28,966<br/>
                Dr 6510 UIF/SDL er .. 354<br/>
                  Cr 2110/2140 ........ 354
              </div>
            </SBox>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', marginTop: 12 }}>
            <SBtn small>← Back · Inputs</SBtn>
            <div style={{ display:'flex', gap: 6 }}>
              <SBtn small>Skip review</SBtn>
              <SBtn primary small>Approve & next →</SBtn>
            </div>
          </div>
        </div>
      </div>
    </Frame>
  );
}

function Row({ k, v, sub, bold }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', padding:'2px 0', borderBottom: `1px dotted ${muted}` }}>
      <div style={{ fontFamily:'Patrick Hand', fontSize: 12, fontWeight: bold?700:400 }}>
        {k}
        {sub && <div style={{ fontSize: 10, color: ink2 }}>{sub}</div>}
      </div>
      <div style={{ fontWeight: bold?700:400, fontFamily:'JetBrains Mono', fontSize: 11 }}>{v}</div>
    </div>
  );
}

function V2_Payslip() {
  return (
    <Frame title="Payslip preview" subtitle="emailed encrypted · SARS-compliant format" w={900} h={620}>
      <div style={{ display:'flex', height:'100%' }}>
        <SideNav items={['Home','Sales','Purchases','Banking','Payroll','VAT 201','Reports','Setup']} active="Payroll" />
        <div style={{ flex:1, padding: 18, background:'#f4f1ea' }}>
          <div style={{ background:'#fff', padding: 22, border:`1px solid ${muted}`, fontFamily:'Helvetica', fontSize: 11, height:'100%', position:'relative' }}>
            <div style={{ display:'flex', justifyContent:'space-between', borderBottom:`2px solid ${ink}`, paddingBottom: 8, marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: 0.5 }}>PAYSLIP</div>
                <div style={{ color: ink2 }}>Pay period · 1–31 March 2026 · paid 25 Mar</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontWeight: 700 }}>Acme Trading (Pty) Ltd</div>
                <div style={{ color: ink2 }}>Reg 2018/123456/07 · PAYE 7440123456</div>
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 20, marginBottom: 10 }}>
              <div>
                <div style={{ color: ink2, fontSize: 10 }}>EMPLOYEE</div>
                <div style={{ fontWeight: 700 }}>Sipho Dlamini · EMP-002</div>
                <div>ID 8503125678082 · Tax # TI-3920</div>
                <div>Position · Senior Developer</div>
              </div>
              <div>
                <div style={{ color: ink2, fontSize: 10 }}>PAID INTO</div>
                <div>FNB Cheque · 62123••••89</div>
                <div style={{ color: ink2, fontSize: 10, marginTop: 6 }}>YEAR-TO-DATE (Mar fiscal)</div>
                <div>Gross R 533,200 · PAYE R 95,140</div>
              </div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 20 }}>
              <div>
                <div style={{ background: '#f4f1ea', padding: '4px 8px', fontWeight: 700 }}>EARNINGS</div>
                <PRow k="Basic salary" v="38,000.00"/>
                <PRow k="Travel allowance (80% taxable)" v="4,000.00"/>
                <PRow k="Overtime · 4hr × 1.5" v="1,250.00"/>
                <PRow k="Performance bonus" v="2,500.00"/>
                <PRow k="Gross earnings" v="45,750.00" bold/>
              </div>
              <div>
                <div style={{ background: '#f4f1ea', padding: '4px 8px', fontWeight: 700 }}>DEDUCTIONS</div>
                <PRow k="PAYE (tax)" v="8,420.00"/>
                <PRow k="UIF (1%, capped)" v="177.12"/>
                <PRow k="Retirement annuity (10%)" v="3,800.00"/>
                <PRow k="Medical aid (Discovery · main+2)" v="4,210.00"/>
                <PRow k="Total deductions" v="16,607.12" bold/>
              </div>
            </div>

            <div style={{ marginTop: 14, borderTop:`2px solid ${ink}`, paddingTop: 8, display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>NET PAY</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>R 29,142.88</div>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap: 12, marginTop: 14, fontSize: 10, color: ink2 }}>
              <div>
                <div style={{ fontWeight: 700, color: ink }}>EMPLOYER CONTRIBUTIONS</div>
                UIF · R 177.12<br/>SDL · R 457.50<br/>Med aid · R 2,800.00
              </div>
              <div>
                <div style={{ fontWeight: 700, color: ink }}>LEAVE BALANCE</div>
                Annual · 14.5 days<br/>Sick · 28 days (3yr cycle)<br/>Family · 3 days
              </div>
              <div>
                <div style={{ fontWeight: 700, color: ink }}>NOTES</div>
                RA increased from 7.5% → 10%<br/>effective this period
              </div>
            </div>
            <Note style={{ position:'absolute', bottom: 14, right: 14 }}>BCEA s.33 · all statutory fields present</Note>
          </div>
        </div>
      </div>
    </Frame>
  );
}

function PRow({ k, v, bold }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', padding:'3px 8px', borderBottom:`1px dotted ${muted}`, fontWeight: bold?700:400, background: bold?'#faf7f0':'transparent' }}>
      <span>{k}</span><span style={{ fontFamily:'JetBrains Mono' }}>{v}</span>
    </div>
  );
}

function V2_EMP201() {
  return (
    <Frame title="EMP201 · March 2026" subtitle="Monthly PAYE / UIF / SDL return · due 7 April · submit to SARS eFiling" w={900} h={620}>
      <div style={{ display:'flex', height:'100%' }}>
        <SideNav items={['Home','Sales','Purchases','Banking','Payroll','VAT 201','Reports','Setup']} active="Payroll" />
        <div style={{ flex:1, padding: 14 }}>
          <div style={{ display:'flex', gap: 6, marginBottom: 10 }}>
            <div style={{ padding:'4px 10px', fontFamily:'Patrick Hand', fontSize: 12, borderRadius: 3, border:`1.5px solid ${ink}`, background: ink, color: paper }}>EMP201</div>
            <div style={{ padding:'4px 10px', fontFamily:'Patrick Hand', fontSize: 12, color: ink2 }}>← Feb (filed 5 Mar)</div>
            <div style={{ flex:1 }}/>
            <div style={{ fontFamily:'Patrick Hand', fontSize: 12, color: ink2 }}>PAYE 7440123456 · period 03/2026</div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1.3fr 1fr', gap: 12 }}>
            <SBox pad={14}>
              <div style={{ fontFamily:'Caveat', fontSize: 22, marginBottom: 4 }}>Return summary</div>
              <table style={{ width:'100%', fontFamily:'JetBrains Mono', fontSize: 11, borderCollapse:'collapse' }}>
                <tbody>
                  {[
                    ['', 'Line', 'Description', 'Amount'],
                    ['', '1101', 'PAYE liability', '32,140.00'],
                    ['', '1102', 'UIF liability (employer + employee)', '3,208.36'],
                    ['', '1103', 'SDL liability (1% of payroll)', '1,845.00'],
                    ['', '1104', 'ETI (Employment Tax Incentive) claimed', '-1,000.00', 'soft'],
                    ['', '— ', 'Total payable', '36,193.36', 'total'],
                  ].map((r,i)=>(
                    <tr key={i} style={{
                      borderBottom: `1px solid ${i===0?ink:muted}`,
                      fontWeight: i===0||r[4]==='total'?700:400,
                      fontFamily: i===0?'Patrick Hand':'JetBrains Mono',
                      fontSize: i===0?12:11,
                      background: r[4]==='total'?accentSoft:r[4]==='soft'?'#fff9f4':'transparent',
                      color: r[4]==='soft'?accent:ink,
                    }}>
                      <td width="20"></td>
                      <td style={{ padding:'5px 4px' }}>{r[1]}</td>
                      <td style={{ fontFamily:'Patrick Hand', fontSize: 13 }}>{r[2]}</td>
                      <td align="right">{r[3]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Squiggle style={{ margin:'12px 0' }}/>
              <div style={{ fontFamily:'Caveat', fontSize: 16 }}>Reconciliation · payroll → EMP201</div>
              <div style={{ fontFamily:'JetBrains Mono', fontSize: 10, marginTop: 4, lineHeight: 1.6, color: ink2 }}>
                Sum of payslip PAYE ........ 32,140.00 ✓ matches line 1101<br/>
                Sum of payslip UIF (1%×2) .. 3,208.36 ✓ matches line 1102<br/>
                1% × gross payroll ......... 1,845.00 ✓ matches line 1103<br/>
                ETI · 1 employee qualifies . 1,000.00 ✓ (Naledi · age 22 · salary &lt; R6.5k)
              </div>
            </SBox>

            <SBox pad={12} fill={accentSoft}>
              <div style={{ fontFamily:'Caveat', fontSize: 18 }}>Submission</div>
              <div style={{ fontFamily:'Patrick Hand', fontSize: 12, color: ink2, marginTop: 4 }}>Two ways to file. Both update GL the same.</div>
              <SBtn primary small style={{ width:'100%', justifyContent:'center', marginTop: 8 }}>Submit via eFiling →</SBtn>
              <SBtn small style={{ width:'100%', justifyContent:'center', marginTop: 6 }}>Download XML (manual upload)</SBtn>
              <Squiggle style={{ margin:'12px 0' }}/>
              <div style={{ fontFamily:'Caveat', fontSize: 16 }}>Payment</div>
              <div style={{ fontFamily:'Patrick Hand', fontSize: 12, color: ink2 }}>Pay SARS via eFiling debit-pull or EFT before 7 Apr 23:59</div>
              <div style={{ fontFamily:'JetBrains Mono', fontSize: 11, padding: 8, marginTop: 6, background:'#fff', border:`1px solid ${muted}`, borderRadius: 3 }}>
                Beneficiary · SARS-PAYE<br/>
                Account .... 4055700729<br/>
                Branch .... 632005 (Absa)<br/>
                Reference . PAYE7440123456 M2603
              </div>
              <Note style={{ marginTop: 8 }}>late submission → 10% penalty + interest @ SARS rate</Note>
            </SBox>
          </div>
        </div>
      </div>
    </Frame>
  );
}

function V2_IRP5() {
  return (
    <Frame title="IRP5 / EMP501 · year-end" subtitle="Annual employer reconciliation · period 1 Mar 2025 – 28 Feb 2026 · due 31 May" w={900} h={620}>
      <div style={{ display:'flex', height:'100%' }}>
        <SideNav items={['Home','Sales','Purchases','Banking','Payroll','VAT 201','Reports','Setup']} active="Payroll" />
        <div style={{ flex:1, padding: 14 }}>
          <div style={{ display:'flex', gap:6, marginBottom: 10 }}>
            {['Overview','Employees (8)','Run payroll','EMP201','IRP5 / EMP501','Leave'].map((t,i)=>(
              <div key={i} style={{
                padding:'4px 10px', fontFamily:'Patrick Hand', fontSize: 12,
                borderRadius: 3, border:`1.5px solid ${i===4?ink:ink2}`,
                background: i===4?ink:'transparent', color: i===4?paper:ink,
              }}>{t}</div>
            ))}
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1.2fr 1fr', gap: 12 }}>
            <SBox pad={12}>
              <div style={{ fontFamily:'Caveat', fontSize: 20 }}>Reconciliation check</div>
              <div style={{ fontFamily:'Patrick Hand', fontSize: 12, color: ink2, marginBottom: 6 }}>Sum of 12 × EMP201 must equal sum of IRP5 certificates.</div>
              <table style={{ width:'100%', borderCollapse:'collapse', fontFamily:'JetBrains Mono', fontSize: 11 }}>
                <thead style={{ fontFamily:'Patrick Hand', fontSize: 12, borderBottom:`1.5px solid ${ink}` }}>
                  <tr><th align="left">Code</th><th align="left">Description</th><th align="right">EMP201 sum</th><th align="right">IRP5 sum</th><th align="center">Δ</th></tr>
                </thead>
                <tbody>
                  {[
                    ['4001','PAYE','385,680.00','385,680.00','✓'],
                    ['4141','UIF (employee)','19,300.32','19,300.32','✓'],
                    ['4142','UIF (employer)','19,300.32','19,300.32','✓'],
                    ['4150','SDL','22,140.00','22,140.00','✓'],
                    ['3601','Income — salary','1,945,000.00','1,945,000.00','✓'],
                    ['3701','Travel allowance','48,000.00','48,000.00','✓'],
                    ['3810','Med aid contribution (er)','33,600.00','33,600.00','✓'],
                  ].map((r,i)=>(
                    <tr key={i} style={{ borderBottom:`1px dotted ${muted}` }}>
                      <td style={{ padding:'4px 4px' }}>{r[0]}</td>
                      <td style={{ fontFamily:'Patrick Hand', fontSize: 13 }}>{r[1]}</td>
                      <td align="right">{r[2]}</td>
                      <td align="right">{r[3]}</td>
                      <td align="center" style={{ color:'#1f8a5b', fontWeight: 700 }}>{r[4]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Note style={{ marginTop: 8 }}>any Δ ≠ 0 must be resolved before submission · usually due to mid-year adjustments not posted to GL</Note>
            </SBox>

            <SBox pad={12} fill={accentSoft}>
              <div style={{ fontFamily:'Caveat', fontSize: 20 }}>Output</div>
              <div style={{ display:'flex', flexDirection:'column', gap: 6, marginTop: 6 }}>
                {[
                  { t:'EMP501 declaration (CSV/XML)', s:'employer-level totals', primary:true },
                  { t:'IRP5 certificates × 7', s:'PAYE was deducted' },
                  { t:'IT3(a) certificates × 1', s:'Naledi · below threshold' },
                  { t:'e@syFile bundle (.zip)', s:'one-click upload to eFiling' },
                ].map((x,i)=>(
                  <div key={i} style={{
                    padding: '6px 8px', display:'flex', justifyContent:'space-between', alignItems:'center',
                    border:`1.5px solid ${x.primary?accent:ink2}`,
                    background: x.primary?'#fff':'transparent',
                    borderRadius: 3,
                  }}>
                    <div>
                      <div style={{ fontFamily:'Caveat', fontSize: 14 }}>{x.t}</div>
                      <div style={{ fontFamily:'Patrick Hand', fontSize: 11, color: ink2 }}>{x.s}</div>
                    </div>
                    <SBtn small primary={x.primary}>Download</SBtn>
                  </div>
                ))}
              </div>
              <Squiggle style={{ margin:'12px 0' }}/>
              <div style={{ fontFamily:'Caveat', fontSize: 16 }}>Timeline</div>
              <div style={{ fontFamily:'Patrick Hand', fontSize: 12, lineHeight: 1.6 }}>
                Bi-annual recon → <b>31 Oct</b> (mid-year)<br/>
                Annual recon → <b>31 May</b> (year-end)<br/>
                Employees receive IRP5 → <b>by 31 May</b>
              </div>
            </SBox>
          </div>
        </div>
      </div>
    </Frame>
  );
}

function V2_Leave() {
  return (
    <Frame title="Leave · BCEA tracker" subtitle="Statutory minimums · annual 15 · sick 30/3yr · family 3 · maternity 4mo (UIF)" w={900} h={620}>
      <div style={{ display:'flex', height:'100%' }}>
        <SideNav items={['Home','Sales','Purchases','Banking','Payroll','VAT 201','Reports','Setup']} active="Payroll" />
        <div style={{ flex:1, padding: 14 }}>
          <div style={{ display:'flex', gap:6, marginBottom: 10 }}>
            {['Overview','Employees (8)','Run payroll','EMP201','IRP5 / EMP501','Leave'].map((t,i)=>(
              <div key={i} style={{
                padding:'4px 10px', fontFamily:'Patrick Hand', fontSize: 12, borderRadius: 3,
                border:`1.5px solid ${i===5?ink:ink2}`,
                background: i===5?ink:'transparent', color: i===5?paper:ink,
              }}>{t}</div>
            ))}
          </div>

          <table style={{ width:'100%', fontFamily:'JetBrains Mono', fontSize: 11, borderCollapse:'collapse' }}>
            <thead style={{ fontFamily:'Patrick Hand', fontSize: 12, borderBottom:`2px solid ${ink}` }}>
              <tr>
                <th align="left">Employee</th>
                <th align="center" colSpan="3">Annual · 15/yr</th>
                <th align="center" colSpan="3">Sick · 30/3yr</th>
                <th align="center">Family</th>
                <th align="left">Pending</th>
              </tr>
              <tr style={{ fontSize: 10, color: ink2 }}>
                <th/>
                <th>Accrued</th><th>Taken</th><th>Balance</th>
                <th>Cycle</th><th>Taken</th><th>Balance</th>
                <th>3/yr</th>
                <th/>
              </tr>
            </thead>
            <tbody>
              {[
                ['Thandi Mokoena', 17.5, 3, 14.5, '2024-26', 4, 26, 3, '—'],
                ['Sipho Dlamini', 12.5, 0, 12.5, '2024-26', 1, 29, 3, '—'],
                ['Lerato Nkosi', 15, 5, 10, '2024-26', 6, 24, 2, '2 days · 14-15 Apr ⏳'],
                ['Mandla Khumalo', 22, 8, 14, '2024-26', 12, 18, 0, '—'],
                ['Aisha Patel', 11, 0, 11, '2024-26', 2, 28, 3, '5 days · maternity prep ⏳'],
                ['Pieter van Wyk', 10, 7, 3, '2024-26', 8, 22, 3, '—'],
                ['Naledi Sithole', 5.5, 0, 5.5, '2024-26', 0, 30, 3, '—'],
                ['James Botha', 8, 4, 4, '2024-26', 3, 27, 1, '—'],
              ].map((r,i)=>(
                <tr key={i} style={{ borderBottom:`1px dotted ${muted}`, height: 28 }}>
                  <td style={{ fontFamily:'Patrick Hand', fontSize: 13, padding:'3px 4px' }}>{r[0]}</td>
                  <td align="center">{r[1]}</td>
                  <td align="center">{r[2]}</td>
                  <td align="center" style={{ fontWeight: 700 }}>{r[3]}</td>
                  <td align="center" style={{ color: ink2 }}>{r[4]}</td>
                  <td align="center">{r[5]}</td>
                  <td align="center" style={{ fontWeight: 700 }}>{r[6]}</td>
                  <td align="center">{r[7]}</td>
                  <td style={{ fontFamily:'Patrick Hand', fontSize: 12, color: r[8]==='—'?ink2:accent }}>{r[8]}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Note style={{ position:'absolute', bottom: 14, right: 14 }}>maternity (4mo) is UIF-claimable · system pre-fills UI19 form when requested</Note>
        </div>
      </div>
    </Frame>
  );
}

window.V2Payroll = {
  Dashboard: V2_PayrollDashboard,
  Employees: V2_Employees,
  Run: V2_RunPayroll,
  Payslip: V2_Payslip,
  EMP201: V2_EMP201,
  IRP5: V2_IRP5,
  Leave: V2_Leave,
};
