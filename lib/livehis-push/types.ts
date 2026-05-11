export type InvoiceType = 'cash' | 'medical_aid' | 'corporate' | 'wca'
export type PaymentMethod = 'cash' | 'eft' | 'card' | 'medical_aid'

export interface PushContactPayload {
  external_ref: string
  name: string
  email: string | null
  phone: string | null
}

export interface PushInvoiceLinePayload {
  description: string
  quantity: number
  unit_price: number
  vat_rate: number
  line_total: number
}

export interface PushInvoicePayload {
  external_ref: string
  number: string
  date: string
  due_date: string | null
  invoice_type: InvoiceType
  subtotal: number
  vat_amount: number
  total: number
  notes: string | null
}

export interface PushInvoiceRequest {
  invoice: PushInvoicePayload
  contact: PushContactPayload
  lines: PushInvoiceLinePayload[]
}

export interface PushPaymentRequest {
  invoice_external_ref: string
  payment_date: string
  amount: number
  payment_method: PaymentMethod
  reference: string | null
}

export interface PushVoidRequest {
  invoice_external_ref: string
}
