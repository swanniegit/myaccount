// V2 Deep Dive — orchestrator. 12 screens, Modern Cards aesthetic.

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#d97757"
}/*EDITMODE-END*/;

const ACCENT_OPTIONS = ['#d97757','#2a6fdb','#1f8a5b','#a23b72'];

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  React.useEffect(() => {
    if (!t.accent) return;
    const root = document.documentElement;
    root.style.setProperty('--accent', t.accent);
    const hex = t.accent.replace('#','');
    const r = parseInt(hex.slice(0,2),16), g = parseInt(hex.slice(2,4),16), b = parseInt(hex.slice(4,6),16);
    const mix = (c) => Math.round(c + (250-c)*0.78);
    root.style.setProperty('--accent-soft', `rgb(${mix(r)},${mix(g)},${mix(b)})`);
  }, [t.accent]);

  const intro = (
    <DCArtboard id="intro" label="Read me — V2 Modern Cards, full app" width={900} height={620}>
      <div style={{
        width:'100%', height:'100%', background: 'var(--paper, #faf7f0)',
        border: `2px solid ${ink}`, borderRadius: 6, padding: 32,
        fontFamily: 'Patrick Hand', color: ink, position:'relative',
      }}>
        <div style={{ fontFamily:'Caveat', fontSize: 46, lineHeight: 1, marginBottom: 8 }}>
          V2 deep dive — <span style={{color: 'var(--accent)'}}>Modern Cards</span>
        </div>
        <div style={{ fontFamily:'Patrick Hand', fontSize: 15, color: ink2, marginBottom: 16 }}>
          You picked V2. This file expands it from 5 screens to a full ~12-screen app — still wireframe-fidelity, but covering everything a SA small biz owner does in a typical month.
        </div>
        <Squiggle/>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 18, marginTop: 14 }}>
          <div>
            <div style={{ fontFamily:'Caveat', fontSize: 22, color: 'var(--accent)' }}>What's new vs the exploration doc</div>
            <ul style={{ fontFamily:'Patrick Hand', fontSize: 14, paddingLeft: 18, lineHeight: 1.5 }}>
              <li><b>Drag-to-post journal</b> grafted in (from V3 ✦) — kept the headline interaction.</li>
              <li>Added <b>Invoices, Invoice create, Customers, Bills</b> for full AR/AP.</li>
              <li>Added <b>Bank reconciliation</b> (FNB feed match-up).</li>
              <li>Added <b>VAT 201 wizard</b>, <b>Reports hub</b>, <b>Company settings</b>.</li>
              <li>Same sidebar nav on every screen so the spatial model is consistent.</li>
            </ul>
          </div>
          <div>
            <div style={{ fontFamily:'Caveat', fontSize: 22, color: 'var(--accent)' }}>Screens — grouped by job-to-be-done</div>
            <div style={{ fontFamily:'Patrick Hand', fontSize: 13, lineHeight: 1.6 }}>
              <div><b>Daily</b> · Dashboard · Drag-to-post journal · T-account ledger</div>
              <div><b>Sales (AR)</b> · Invoices · New invoice · Customers</div>
              <div><b>Purchases (AP)</b> · Bills</div>
              <div><b>Banking</b> · Reconciliation</div>
              <div><b>Tax & reporting</b> · VAT 201 · Trial balance · Reports hub</div>
              <div><b>Setup</b> · Chart of accounts · Company settings</div>
            </div>
          </div>
        </div>
        <Squiggle style={{ margin: '18px 0 12px' }}/>
        <div style={{ display:'flex', justifyContent:'space-between' }}>
          <Note>Drag the paper background to pan · scroll to zoom out · click any artboard for fullscreen</Note>
          <Note>Tweaks → accent color</Note>
        </div>
      </div>
    </DCArtboard>
  );

  return (
    <>
      <DesignCanvas title="myAccount · V2 Modern Cards — Full App" subtitle="12 screens · same nav · drag-to-post journal · SA tax compliant">
        <DCSection id="overview" title="Overview">{intro}</DCSection>

        <DCSection id="flow" title="Walkthrough · Quote → VAT 201" subtitle="One real workflow, end to end. Each screen here is also reachable from its section nav below.">
          <DCArtboard id="flow-onboard" label="① First-run onboarding" width={900} height={620}><window.V2Extras.Onboarding /></DCArtboard>
          <DCArtboard id="flow-quote" label="② Quote sent" width={900} height={620}><window.V2Extras.Quote /></DCArtboard>
          <DCArtboard id="flow-invoice" label="③ Convert → Invoice" width={900} height={620}><window.V2Sales.InvoiceCreate /></DCArtboard>
          <DCArtboard id="flow-payment" label="④ Record payment" width={900} height={620}><window.V2Extras.Payment /></DCArtboard>
          <DCArtboard id="flow-reconcile" label="⑤ Reconcile bank" width={900} height={620}><window.V2BankTax.Reconcile /></DCArtboard>
          <DCArtboard id="flow-vat" label="⑥ VAT 201 to SARS" width={900} height={620}><window.V2BankTax.VAT201 /></DCArtboard>
        </DCSection>

        <DCSection id="daily" title="Daily" subtitle="Land, post, look up.">
          <DCArtboard id="dashboard" label="Dashboard" width={900} height={620}><window.V2Daily.Dashboard /></DCArtboard>
          <DCArtboard id="journal" label="Journal Entry · drag-to-post ✦" width={900} height={620}><window.V2Daily.Journal /></DCArtboard>
          <DCArtboard id="ledger" label="T-Account Ledger" width={900} height={620}><window.V2Daily.Ledger /></DCArtboard>
        </DCSection>

        <DCSection id="sales" title="Sales (AR)" subtitle="Quote → invoice → collect.">
          <DCArtboard id="invoices" label="Invoices list" width={900} height={620}><window.V2Sales.Invoices /></DCArtboard>
          <DCArtboard id="invoice-create" label="New invoice" width={900} height={620}><window.V2Sales.InvoiceCreate /></DCArtboard>
          <DCArtboard id="customers" label="Customers + AR aging" width={900} height={620}><window.V2Sales.Customers /></DCArtboard>
        </DCSection>

        <DCSection id="purch" title="Purchases (AP)" subtitle="Receipt → bill → pay.">
          <DCArtboard id="bills" label="Bills list + OCR preview" width={900} height={620}><window.V2Sales.Bills /></DCArtboard>
        </DCSection>

        <DCSection id="bank" title="Banking" subtitle="FNB import & reconciliation.">
          <DCArtboard id="reconcile" label="Bank reconciliation" width={900} height={620}><window.V2BankTax.Reconcile /></DCArtboard>
        </DCSection>

        <DCSection id="tax" title="Tax & reporting" subtitle="SARS-facing.">
          <DCArtboard id="vat201" label="VAT 201 wizard" width={900} height={620}><window.V2BankTax.VAT201 /></DCArtboard>
          <DCArtboard id="tb" label="Trial Balance" width={900} height={620}><window.V2BankTax.TB /></DCArtboard>
          <DCArtboard id="reports" label="Reports hub" width={900} height={620}><window.V2BankTax.Reports /></DCArtboard>
        </DCSection>

        <DCSection id="setup" title="Setup" subtitle="Company + COA.">
          <DCArtboard id="coa" label="Chart of Accounts" width={900} height={620}><window.V2Setup.COA /></DCArtboard>
          <DCArtboard id="settings" label="Company settings (Tax tab)" width={900} height={620}><window.V2Setup.Settings /></DCArtboard>
        </DCSection>
      </DesignCanvas>

      <TweaksPanel title="Tweaks">
        <TweakSection title="Accent">
          <TweakColor t={t} setTweak={setTweak} k="accent" options={ACCENT_OPTIONS} />
        </TweakSection>
        <TweakSection title="Notes">
          <div style={{ fontFamily:'Patrick Hand', fontSize: 13, color:'#555', lineHeight: 1.4 }}>
            Same V2 sidebar on every screen. Drag-to-post is the journal hero. Tell me which screen to push next.
          </div>
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
