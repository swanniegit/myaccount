import ComingSoon from '@/components/dashboard/ComingSoon'

export default function TransactionalExportPage() {
  return (
    <ComingSoon
      title="Transactional Export"
      backHref="/dashboard"
      backLabel="Die General Ledger"
      description="CSV export of posted journal lines for a date range."
    />
  )
}
