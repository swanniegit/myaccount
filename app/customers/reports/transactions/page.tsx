import ComingSoon from '@/components/dashboard/ComingSoon'

export default function CustomerTransactionsReportPage() {
  return (
    <ComingSoon
      title="Transactions"
      backHref="/customers/reports"
      backLabel="Reports"
      description="Invoices and payments per customer for a period."
    />
  )
}
