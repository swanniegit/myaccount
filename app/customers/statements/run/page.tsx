import ComingSoon from '@/components/dashboard/ComingSoon'

export default function StatementRunPage() {
  return (
    <ComingSoon
      title="Statement Run"
      backHref="/customers"
      backLabel="Customers"
      description="Batch statements for all customers with an open balance."
    />
  )
}
