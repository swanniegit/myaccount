// JOURNAL ENTRY — drag-to-post is the headline interaction. 4 variations.

function Journal_V1_LedgerBook() {
  return (
    <Frame title="Journal Entry" subtitle="V1 · Ledger Book — write it like a journal page">
      <div style={{ padding: 14, height: '100%', background: 'repeating-linear-gradient(to bottom, transparent 0 26px, rgba(31,42,68,0.05) 26px 27px)' }}>
        <div style={{ display:'flex', justifyContent:'space-between' }}>
          <div style={{ fontFamily:'Caveat', fontSize:22 }}>Journal · entry #JE-0319</div>
          <div style={{ display:'flex', gap:6 }}>
            <SField label="Date" w={100} value="14/03/26" />
            <SField label="Ref" w={100} value="INV-102" />
          </div>
        </div>
        <SField label="Narration" w="100%" value="Sale to Pick n Pay, cash" style={{ margin:'8px 0' }}/>

        <table style={{ width:'100%', borderCollapse:'collapse', fontFamily:'JetBrains Mono', fontSize:12, marginTop: 6 }}>
          <thead style={{ fontFamily:'Patrick Hand', fontSize:13, borderBottom:`2px solid ${ink}` }}>
            <tr><th align="left">Account</th><th align="left">Memo</th><th align="right">Dr</th><th align="right">Cr</th></tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom:`1px dotted ${muted}` }}>
              <td style={{ padding:'5px 4px', fontFamily:'Patrick Hand', fontSize:13 }}>1000 · FNB Cheque</td>
              <td style={{ fontFamily:'Patrick Hand', fontSize:12, color:ink2 }}>cash in</td>
              <td align="right">3,200.00</td><td align="right"></td>
            </tr>
            <tr style={{ borderBottom:`1px dotted ${muted}` }}>
              <td style={{ padding:'5px 4px', fontFamily:'Patrick Hand', fontSize:13 }}>4000 · Sales</td>
              <td style={{ fontFamily:'Patrick Hand', fontSize:12, color:ink2 }}>revenue (excl VAT)</td>
              <td align="right"></td><td align="right">2,780.00</td>
            </tr>
            <tr style={{ borderBottom:`1px dotted ${muted}` }}>
              <td style={{ padding:'5px 4px', fontFamily:'Patrick Hand', fontSize:13 }}>2200 · VAT Output</td>
              <td style={{ fontFamily:'Patrick Hand', fontSize:12, color:ink2 }}>15% SA VAT</td>
              <td align="right"></td><td align="right">420.00</td>
            </tr>
            <tr style={{ borderBottom:`1px dotted ${muted}`, color: muted }}>
              <td style={{ padding:'5px 4px', fontFamily:'Patrick Hand', fontSize:13 }}>＋ add line…</td>
              <td/><td align="right">___</td><td align="right">___</td>
            </tr>
            <tr style={{ borderTop:`2px solid ${ink}`, fontWeight:700 }}>
              <td colSpan="2" style={{ padding:'5px 4px', fontFamily:'Patrick Hand', fontSize:13 }}>Totals  (must match)</td>
              <td align="right">3,200.00</td><td align="right">3,200.00</td>
            </tr>
          </tbody>
        </table>
        <div style={{ display:'flex', justifyContent:'space-between', marginTop: 14 }}>
          <Note>✓ Balanced · VAT auto-calc on</Note>
          <div style={{ display:'flex', gap: 6 }}>
            <SBtn small>Save draft</SBtn><SBtn small>Save & new</SBtn><SBtn primary small>Post →</SBtn>
          </div>
        </div>
      </div>
    </Frame>
  );
}

function Journal_V2_ModernCards() {
  return (
    <Frame title="Journal Entry" subtitle="V2 · Modern — receipt-in, smart split, post">
      <div style={{ padding: 14, height:'100%', display:'grid', gridTemplateColumns:'1fr 1.2fr', gap: 12 }}>
        <div>
          <div style={{ fontFamily:'Caveat', fontSize:20, marginBottom: 6 }}>Source</div>
          <Hatch h={140} label="drop receipt / invoice PDF" />
          <Note style={{ marginTop:6 }}>OCR reads SARS-compliant tax invoices</Note>
          <Squiggle style={{ margin:'12px 0' }} />
          <div style={{ fontFamily:'Patrick Hand', fontSize:13 }}>Detected</div>
          <div style={{ background:'#fff', border:`1.5px solid ${ink}`, borderRadius:4, padding:8, fontFamily:'JetBrains Mono', fontSize:11, marginTop:4 }}>
            <div>Supplier: <b style={{ fontFamily:'Patrick Hand', fontSize:13 }}>Pick n Pay</b></div>
            <div>Total: <b>R 3,200.00</b></div>
            <div>VAT (15%): <b>R 420.00</b></div>
            <div>Date: <b>14 Mar 2026</b></div>
            <div style={{ color: accent }}>VAT no: 4123456789 ✓</div>
          </div>
        </div>
        <div>
          <div style={{ fontFamily:'Caveat', fontSize:20, marginBottom: 6 }}>Will post as</div>
          {[
            ['1000 · FNB Cheque','Asset',3200,0,true],
            ['4000 · Sales','Income',0,2780],
            ['2200 · VAT Output','Liab',0,420],
          ].map(([acc,kind,dr,cr,hl],i)=>(
            <SBox key={i} pad={8} fill={hl?accentSoft:'#fff'} style={{ marginBottom: 6 }}>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <div>
                  <div style={{ fontFamily:'Patrick Hand', fontSize:14 }}>{acc}</div>
                  <div style={{ fontFamily:'Patrick Hand', fontSize:11, color: ink2 }}>{kind} · auto-suggested</div>
                </div>
                <div style={{ fontFamily:'JetBrains Mono', fontSize:13, textAlign:'right' }}>
                  <div>Dr {dr ? dr.toFixed(2) : '—'}</div>
                  <div>Cr {cr ? cr.toFixed(2) : '—'}</div>
                </div>
              </div>
            </SBox>
          ))}
          <div style={{ fontFamily:'Patrick Hand', fontSize:12, color:ink2, textAlign:'right' }}>Σ Dr R 3,200 = Σ Cr R 3,200 ✓</div>
          <div style={{ display:'flex', gap:6, justifyContent:'flex-end', marginTop: 10 }}>
            <SBtn small>Tweak split</SBtn><SBtn primary small>Post entry</SBtn>
          </div>
        </div>
      </div>
    </Frame>
  );
}

function Journal_V3_DragToPost() {
  // The novel hero — drag a transaction chip into one or two T-accounts
  return (
    <Frame title="Journal Entry" subtitle="V3 · Drag-to-Post  ✦ novel hero">
      <div style={{ position:'relative', height:'100%', padding: 10 }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom: 4 }}>
          <div style={{ fontFamily:'Caveat', fontSize:18 }}>Drag the chip into the Dr/Cr side of any T</div>
          <SBtn small>Undo last drag</SBtn>
        </div>

        {/* The chip (transaction) */}
        <div style={{ position:'absolute', left: 28, top: 200, width: 170, padding: 10,
          background:'#fff', border:`2px solid ${accent}`, borderRadius: 6,
          boxShadow:`3px 3px 0 ${ink}`, transform: 'rotate(-3deg)',
        }}>
          <div style={{ fontFamily:'Caveat', fontSize:18, color: accent }}>R 3,200.00</div>
          <div style={{ fontFamily:'Patrick Hand', fontSize:12 }}>Pick n Pay sale</div>
          <div style={{ fontFamily:'JetBrains Mono', fontSize:10, color: ink2 }}>14/03 · cash</div>
          <Note style={{ marginTop: 4, fontSize:11, padding:'0 6px' }}>↖ grab & drag</Note>
        </div>

        {/* Three drop-target T's */}
        <div style={{ position:'absolute', left: 230, top: 60, display:'grid', gridTemplateColumns:'repeat(3, 200px)', gap: 14 }}>
          {[
            { name:'1000 · FNB', debits:[{label:'INV-102', amount:'3,200', highlight:true}], credits:[], hint:'dropped here →' },
            { name:'4000 · Sales', debits:[], credits:[{label:'INV-102 (excl VAT)', amount:'2,780', highlight:true}], hint:'auto split: 87%' },
            { name:'2200 · VAT Output', debits:[], credits:[{label:'INV-102 (15%)', amount:'420', highlight:true}], hint:'auto split: 13%' },
          ].map((t,i)=>(
            <div key={i}>
              <TAccount {...t} w={200} accentTop={i===0} />
              <Note style={{ marginTop: 4, fontSize: 11 }}>{t.hint}</Note>
            </div>
          ))}
        </div>

        {/* Arrows from chip to first T */}
        <svg style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
          <defs>
            <marker id="jarr" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
              <path d="M0,0 L10,5 L0,10 z" fill={accent}/>
            </marker>
          </defs>
          <path d="M 200,230 C 240,230 240,140 290,140" fill="none" stroke={accent} strokeWidth="2" strokeDasharray="5 4" markerEnd="url(#jarr)"/>
          <text x="220" y="170" fontFamily="Caveat" fontSize="14" fill={accent}>drop on Dr →</text>
        </svg>

        <div style={{ position:'absolute', bottom: 10, left: 10, right: 10, display:'flex', justifyContent:'space-between' }}>
          <Note>Hold ⌥ to split across multiple T's · VAT auto-splits at 15%</Note>
          <SBtn primary small>Post entry · balanced ✓</SBtn>
        </div>
      </div>
    </Frame>
  );
}

function Journal_V4_SplitGrid() {
  return (
    <Frame title="Journal Entry" subtitle="V4 · Split Grid — keyboard ledger + live T preview">
      <div style={{ display:'grid', gridTemplateColumns:'1.3fr 1fr', height:'100%' }}>
        <div style={{ borderRight:`1.5px solid ${ink}`, padding: 10 }}>
          <div style={{ fontFamily:'Caveat', fontSize:18, marginBottom: 4 }}>JE-0319 · keyboard-first</div>
          <div style={{ display:'flex', gap:6, marginBottom:6 }}>
            <SField label="Date" w={90} value="14/03/26" />
            <SField label="Ref" w={90} value="INV-102" />
            <SField label="Memo" w={180} value="Pick n Pay sale" />
          </div>
          <table style={{ width:'100%', borderCollapse:'collapse', fontFamily:'JetBrains Mono', fontSize:11 }}>
            <thead style={{ fontFamily:'Patrick Hand', fontSize:12, borderBottom:`1.5px solid ${ink}` }}>
              <tr><th align="left">Account (type to search)</th><th align="right">Dr</th><th align="right">Cr</th></tr>
            </thead>
            <tbody>
              <tr style={{ background: accentSoft }}>
                <td style={{ padding:'4px 4px', fontFamily:'Patrick Hand', fontSize:13 }}>1000 · FNB Cheque  <span style={{color: accent}}>▏</span></td>
                <td align="right">3,200.00</td><td align="right"></td>
              </tr>
              <tr><td style={{ padding:'4px 4px', fontFamily:'Patrick Hand', fontSize:13 }}>4000 · Sales</td><td align="right"></td><td align="right">2,780.00</td></tr>
              <tr><td style={{ padding:'4px 4px', fontFamily:'Patrick Hand', fontSize:13 }}>2200 · VAT Output</td><td align="right"></td><td align="right">420.00</td></tr>
              <tr style={{ color: muted }}><td style={{ padding:'4px 4px', fontFamily:'Patrick Hand', fontSize:13 }}>＋ tab to add</td><td align="right">___</td><td align="right">___</td></tr>
              <tr style={{ borderTop:`1.5px solid ${ink}`, fontWeight:700 }}>
                <td style={{ padding:'4px 4px', fontFamily:'Patrick Hand', fontSize:13 }}>Totals</td>
                <td align="right">3,200.00</td><td align="right">3,200.00</td>
              </tr>
            </tbody>
          </table>
          <Note style={{ marginTop: 8 }}>⌘↵ post · ⌘D duplicate · / focus search</Note>
        </div>
        <div style={{ padding: 12, background: paperEdge + '40' }}>
          <div style={{ fontFamily:'Caveat', fontSize:18 }}>Live preview — affects 3 T's</div>
          <Squiggle style={{ margin:'4px 0 8px' }}/>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 8 }}>
            <TAccount name="1000 · FNB" w="100%" compact accentTop
              debits={[{label:'(new) INV-102', amount:'3,200', highlight:true}]} credits={[]} balance="+R 3,200" />
            <TAccount name="4000 · Sales" w="100%" compact
              debits={[]} credits={[{label:'(new)', amount:'2,780', highlight:true}]} balance="+R 2,780" />
            <TAccount name="2200 · VAT Out" w="100%" compact
              debits={[]} credits={[{label:'(new) 15%', amount:'420', highlight:true}]} balance="+R 420" />
            <SBox pad={8} fill="#fff" style={{ display:'flex', flexDirection:'column', justifyContent:'center' }}>
              <div style={{ fontFamily:'Caveat', fontSize:16 }}>Period impact</div>
              <div style={{ fontFamily:'JetBrains Mono', fontSize:11 }}>Revenue +R 2,780</div>
              <div style={{ fontFamily:'JetBrains Mono', fontSize:11 }}>VAT owe +R 420</div>
              <div style={{ fontFamily:'JetBrains Mono', fontSize:11 }}>Cash +R 3,200</div>
            </SBox>
          </div>
        </div>
      </div>
    </Frame>
  );
}

window.Journal = { V1: Journal_V1_LedgerBook, V2: Journal_V2_ModernCards, V3: Journal_V3_DragToPost, V4: Journal_V4_SplitGrid };
