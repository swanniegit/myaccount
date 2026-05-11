# Handoff: myAccount Payroll — South African Payroll Module

> Standalone payroll module to bolt onto the myAccount accounting core. Implements SA statutory requirements: PAYE, UIF, SDL, ETI, EMP201, EMP501, IRP5, BCEA leave, COIDA.

---

## About this bundle

The HTML / JSX files here are **design references**, not production code. They run as React+Babel prototypes; re-implement them in the project's actual tech stack (or pick one if greenfield). Pull the layout, copy, calculation logic, and screen flow from the references — do not lift the JSX directly.

## Fidelity

**Medium-fidelity wireframes.** Same Modern-Cards style as the accounting core. Use for layout, density, copy, and the calc logic shown on screen. Re-skin with the production design system.

---

## Scope

This module covers everything an SA small business needs for payroll, end-to-end:

| Screen | What it does |
|---|---|
| **Payroll dashboard** | Monthly run status, headcount, statutory due, what-needs-you list |
| **Employees** | List of 8 with tax #, basic/PAYE/UIF/net, age/ETI flags. Click → profile (Tax, Banking, Leave, Benefits, History tabs) |
| **Run payroll · Calculate** | Per-employee detail showing earnings/deductions, PAYE calc workings, GL postings |
| **Payslip** | SARS-compliant payslip preview · BCEA s.33 fields · YTD · leave balance |
| **EMP201** | Monthly return (PAYE / UIF / SDL / ETI). Reconciliation to payroll. Submit via eFiling or download XML |
| **IRP5 / EMP501** | Year-end recon: 12× EMP201 sum vs IRP5 sum across all SARS codes. Outputs e@syFile bundle |
| **Leave tracker** | BCEA leave per employee — annual/sick/family/maternity |

---

## South African statutory logic (must implement exactly)

### PAYE (Pay As You Earn) — SARS 2025/26

**Annual tax brackets** (verify against current SARS table at build time — these change every year):

| Bracket | Rate | On amount over |
|---|---|---|
| 0 – 237,100 | 18% | 0 |
| 237,101 – 370,500 | 26% | 237,100 |
| 370,501 – 512,800 | 31% | 370,500 |
| 512,801 – 673,000 | 36% | 512,800 |
| 673,001 – 857,900 | 39% | 673,000 |
| 857,901 – 1,817,000 | 41% | 857,900 |
| 1,817,001+ | 45% | 1,817,000 |

**Rebates** (deducted from tax-before-rebate, then ÷12 for monthly):
- Primary: R 17,235 (everyone)
- Secondary: + R 9,444 (age 65+)
- Tertiary: + R 3,145 (age 75+)

**Tax thresholds** (income below which no PAYE):
- Under 65: R 95,750
- 65–74: R 148,217
- 75+: R 165,689

**Medical Aid Tax Credit** (monthly, deducted from PAYE):
- Main member: R 364
- First dependant: R 364
- Each additional dependant: R 246

**Algorithm**:
1. Annualise gross taxable income (current month × 12 + YTD bonus annualisation)
2. Apply bracket → annual tax
3. Subtract age rebates → annual tax after rebate
4. Subtract medical credit × 12 → annual PAYE
5. Divide by 12 → monthly PAYE base
6. Add bonus PAYE separately (annualisation method)

### UIF (Unemployment Insurance Fund)

- 1% employee contribution + 1% employer contribution
- **Capped** at remuneration of R 17,712/month
- → Max R 177.12 each per month
- Excluded: < 24 hours/month workers, expatriates on contract <12mo
- Form UI19 for terminations (auto-generate)

### SDL (Skills Development Levy)

- 1% of total payroll, employer only
- **Exempt** if total annual payroll < R 500,000
- Same return as PAYE/UIF (EMP201)

### ETI (Employment Tax Incentive)

Employer claims a tax credit (reduces PAYE liability) for hiring young workers:
- Employee aged 18–29
- Monthly wage R 2,000 – R 6,500
- Sliding scale: max R 1,500/month for first 12 months, R 750/month for months 13–24
- Excludes domestic workers, government employees, connected persons

### Retirement Annuity / Pension / Provident Fund

- 27.5% of remuneration deductible from taxable income
- Capped at R 350,000 per year
- Both employee and employer contributions deductible up to this combined cap

### Travel allowance

- 80% of allowance is taxable (or 20% if employee proves >80% business use to SARS)
- Reported under code 3701

---

## EMP201 (monthly return)

Due **by the 7th** of the following month (or last business day before if 7th is weekend/holiday).

**Lines**:
- 1101: PAYE
- 1102: UIF (employer + employee)
- 1103: SDL
- 1104: ETI credit (negative, reduces total)

**Payment**: eFiling debit pull, EFT to SARS-PAYE account (Absa branch 632005), or via SARS approved banks. Reference format: `PAYE{ref} M{period}` e.g. `PAYE7440123456 M2603` for March 2026.

**Penalties**: late = 10% of liability + interest at prescribed rate (~10.5%/yr SARS rate, varies quarterly).

---

## EMP501 (bi-annual reconciliation)

- **Mid-year** EMP501: 1 Mar – 31 Aug → due 31 Oct
- **Annual** EMP501: 1 Mar – 28 Feb → due 31 May

Reconciles **sum of 6 or 12 EMP201s** against **sum of IRP5/IT3(a) certificates**. Any variance must be resolved (usually mid-year adjustments not posted).

Submission via **e@syFile** (SARS desktop app) or eFiling. Output format: SARS-specified CSV bundle.

### IRP5 / IT3(a) certificates

- **IRP5**: issued when PAYE was deducted
- **IT3(a)**: issued when no PAYE (below threshold)
- Both delivered to employee **by 31 May**
- Must include all SARS source codes — earnings (3601, 3605, 3701…), deductions (4001 PAYE, 4141/4142 UIF, 4150 SDL, 4474 medical aid…)

### Key SARS source codes

| Code | Description |
|---|---|
| 3601 | Income — salary/wages |
| 3605 | Annual payment (13th cheque) |
| 3615 | Director's remuneration |
| 3701 | Travel allowance (80% taxable) |
| 3702 | Reimbursive travel (80% over rate) |
| 3713 | Other allowances |
| 3810 | Medical scheme fees (employer contribution) |
| 3825 | Pension fund (employer) |
| 4001 | Pension fund (employee) |
| 4006 | Retirement annuity |
| 4102 | PAYE |
| 4141 | UIF (employee) |
| 4142 | UIF (employer) |
| 4150 | SDL |
| 4474 | Medical aid tax credit |
| 4493 | Employer medical aid contribution credit |

---

## BCEA (Basic Conditions of Employment Act) — leave

| Type | Statutory minimum |
|---|---|
| Annual | 21 consecutive days OR 1 day per 17 worked = ~15 working days/year. Must be taken within 6 months of cycle end. |
| Sick | 30 days paid per 36-month (3-year) cycle |
| Family responsibility | 3 days/year (child birth, sick child, immediate family death) |
| Maternity | 4 consecutive months (unpaid by employer — claim UIF) |
| Parental | 10 consecutive days (unpaid — UIF claim) |
| Adoption / commissioning parent | 10 weeks |

**Implementation**:
- Track accrual per pay period
- Pro-rate for part-time / weekly employees
- Cycle reset at hire-anniversary
- Auto-generate UI19 (termination) and UI2.7 (maternity) forms

---

## COIDA (workplace injuries)

- Employer must register with Compensation Fund
- Annual ROE (Return of Earnings) submission by 31 March → triggers assessment
- "Letter of Good Standing" required to bid on government work
- Track in Setup → Compliance section (out of scope for this module — flag only)

---

## Data model essentials (payroll-specific)

```
Employee {
  id, code, full_name, id_number, date_of_birth,
  tax_number, tax_status (resident|nonresident),
  income_tax_directive?,         // for retirement, severance
  hire_date, termination_date?,
  pay_frequency (monthly|weekly|biweekly),
  basic_salary, cost_to_company?, paid_by_hour,
  banking { bank, branch, account, type },
  age_at_period_start (cached),  // for rebate calc
}

PayrollPeriod { id, year, month, start_date, end_date, pay_date, status }

Payslip {
  id, period_id, employee_id,
  earnings: PayslipLine[],       // basic, OT, allowances, bonus
  deductions: PayslipLine[],     // PAYE, UIF, RA, medical
  employer_contributions: ...,   // UIF-er, SDL, med aid contrib
  gross, total_deductions, net,
  ytd_gross, ytd_paye, ytd_uif,
  journal_entry_id,              // links to accounting GL
}

PayslipLine { code, description, amount, sars_code? }

EMP201 {
  id, period_id,
  paye_liability, uif_liability, sdl_liability, eti_claimed,
  total_payable, status, submitted_at, payment_ref,
}

EMP501 { id, period_start, period_end, type (interim|annual), variance_resolved, ... }

LeaveBalance { employee_id, type, accrued, taken, balance, cycle_start }
LeaveRequest { employee_id, type, from, to, days, status, approved_by }
```

---

## Files in this bundle

```
design_handoff_myaccount_payroll/
├── README.md                ← you are here
├── Payroll Module.html      ← standalone preview (just payroll screens)
├── v2/
│   └── payroll.jsx          ← all 7 screen components
└── lib/                     ← shared primitives (Frame, SideNav, SBox, etc.)
    ├── sketch.jsx           ← visual primitives the payroll uses
    └── tweaks-panel.jsx
```

To preview: open `Payroll Module.html` in a browser.

---

## Open questions for product team

1. **Tax table updates** — annual update from SARS (typically March). Manual or pulled from a SARS feed?
2. **Bargaining council levies** — sector-specific (MEIBC, MIBCO, NBCRFLI etc) — needed in v1?
3. **Garnishee orders** — emoluments attachment orders from courts — capacity required for v1?
4. **Medical aid integration** — direct feed from Discovery / Bonitas / etc. or manual?
5. **e@syFile** — does the product generate the CSV bundle directly, or call e@syFile's import API?
6. **13th cheque scheduling** — automatic in December, or always opt-in per employee?
7. **Commission-based reps** — distinct flow needed?
8. **Loans to employees** — track + repay via payroll deductions?
