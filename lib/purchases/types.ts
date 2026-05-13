export interface BillLineInput {
  description: string
  quantity: number
  unit_price: number
  vat_rate: number
  account_id: string
  line_total: number
}

export interface CreateBillInput {
  number: string
  contact_id: string
  date: string
  due_date: string | null
  notes: string | null
  lines: BillLineInput[]
}
