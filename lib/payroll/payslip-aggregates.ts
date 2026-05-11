interface SlipTotals {
  paye: number
  uif_employee: number
  uif_employer: number
  sdl: number
  eti_claimed: number
}

export function sumPayslipTotals(payslips: SlipTotals[]) {
  const paye = payslips.reduce((s, p) => s + Number(p.paye), 0)
  const uif  = payslips.reduce((s, p) => s + Number(p.uif_employee) + Number(p.uif_employer), 0)
  const sdl  = payslips.reduce((s, p) => s + Number(p.sdl), 0)
  const eti  = payslips.reduce((s, p) => s + Number(p.eti_claimed), 0)
  return { paye, uif, sdl, eti, total: Math.max(0, paye + uif + sdl - eti) }
}
