import ComingSoon from '@/components/dashboard/ComingSoon'

export default function CreditNotePage() {
  return (
    <ComingSoon
      title="Credit Note"
      backHref="/customers"
      backLabel="Customers"
      description="Issue a customer credit note (reverses revenue and VAT)."
    />
  )
}
