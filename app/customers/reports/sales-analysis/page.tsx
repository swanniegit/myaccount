import ComingSoon from '@/components/dashboard/ComingSoon'

export default function SalesAnalysisPage() {
  return (
    <ComingSoon
      title="Sales Analysis"
      backHref="/customers/reports"
      backLabel="Reports"
      description="Revenue by customer and period."
    />
  )
}
