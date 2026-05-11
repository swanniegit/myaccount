import type { PrEmployee, CalcResult } from './types'

// SARS 2025/26 tax brackets
const BRACKETS = [
  { over: 0,         base: 0,       rate: 0.18 },
  { over: 237_100,   base: 42_678,  rate: 0.26 },
  { over: 370_500,   base: 77_362,  rate: 0.31 },
  { over: 512_800,   base: 121_475, rate: 0.36 },
  { over: 673_000,   base: 179_147, rate: 0.39 },
  { over: 857_900,   base: 251_258, rate: 0.41 },
  { over: 1_817_000, base: 644_489, rate: 0.45 },
]

const REBATE_PRIMARY   = 17_235
const REBATE_SECONDARY =  9_444
const REBATE_TERTIARY  =  3_145

const THRESHOLD = { under65: 95_750, from65: 148_217, from75: 165_689 }

const MED_MAIN      = 364
const MED_FIRST_DEP = 364
const MED_EXTRA_DEP = 246

const UIF_EARNINGS_CAP = 17_712
const UIF_RATE         = 0.01

// ---- helpers (max 3 functions including primary) ----

export function ageAt(dob: string | null, year: number, month: number): number {
  if (!dob) return 30
  const birth = new Date(dob)
  const ref   = new Date(year, month - 1, 1)
  let age = ref.getFullYear() - birth.getFullYear()
  if (
    ref.getMonth() < birth.getMonth() ||
    (ref.getMonth() === birth.getMonth() && ref.getDate() < birth.getDate())
  ) age--
  return age
}

function annualPaye(annualGross: number, age: number, medDependants: number): { paye: number; workings: string[] } {
  const w: string[] = []
  const threshold = age >= 75 ? THRESHOLD.from75 : age >= 65 ? THRESHOLD.from65 : THRESHOLD.under65

  if (annualGross <= threshold) {
    w.push(`Below threshold (R${threshold.toLocaleString()}) → PAYE = 0`)
    return { paye: 0, workings: w }
  }

  let tax = 0
  for (let i = BRACKETS.length - 1; i >= 0; i--) {
    if (annualGross > BRACKETS[i].over) {
      tax = BRACKETS[i].base + (annualGross - BRACKETS[i].over) * BRACKETS[i].rate
      break
    }
  }
  w.push(`Tax before rebate = ${tax.toFixed(2)}`)

  let rebates = REBATE_PRIMARY
  if (age >= 65) { rebates += REBATE_SECONDARY; w.push(`+Secondary rebate = ${REBATE_SECONDARY}`) }
  if (age >= 75) { rebates += REBATE_TERTIARY;  w.push(`+Tertiary rebate = ${REBATE_TERTIARY}`) }
  tax = Math.max(0, tax - rebates)
  w.push(`After rebates = ${tax.toFixed(2)}`)

  const deps = medDependants ?? 0
  const medMonthly = MED_MAIN + (deps >= 1 ? MED_FIRST_DEP : 0) + Math.max(0, deps - 1) * MED_EXTRA_DEP
  tax = Math.max(0, tax - medMonthly * 12)
  w.push(`After medical credit (${medMonthly}/mo) = ${tax.toFixed(2)}`)

  return { paye: tax, workings: w }
}

export function calcPayslip(
  employee: PrEmployee,
  grossMonthly: number,
  periodYear: number,
  periodMonth: number,
  medicalDependants = 0,
): CalcResult {
  const age = ageAt(employee.date_of_birth, periodYear, periodMonth)
  const annualGross = grossMonthly * 12
  const { paye: annualP, workings } = annualPaye(annualGross, age, medicalDependants)
  const paye = Math.round((annualP / 12) * 100) / 100
  workings.unshift(`Annual gross = ${annualGross.toFixed(2)} · monthly PAYE = ${paye.toFixed(2)}`)

  const uifEarnings = Math.min(grossMonthly, UIF_EARNINGS_CAP)
  const uifEmployee = Math.round(uifEarnings * UIF_RATE * 100) / 100
  const sdl = Math.round(grossMonthly * 0.01 * 100) / 100

  let eti = 0
  if (employee.date_of_birth && age >= 18 && age <= 29 && grossMonthly >= 2_000 && grossMonthly <= 6_500) {
    const t = grossMonthly <= 4_500 ? 1_500 : 1_500 * (1 - (grossMonthly - 4_500) / 2_000)
    eti = Math.round(t * 100) / 100
    workings.push(`ETI eligible (age ${age}) = ${eti}`)
  }

  return {
    gross: grossMonthly,
    paye,
    uif_employee: uifEmployee,
    uif_employer: uifEmployee,
    sdl,
    eti,
    net: Math.round((grossMonthly - paye - uifEmployee) * 100) / 100,
    workings,
  }
}
