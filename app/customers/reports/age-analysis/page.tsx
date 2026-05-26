import ComingSoon from '@/components/dashboard/ComingSoon'

export default function AgeAnalysisPage() {
  return (
    <ComingSoon
      title="Age Analysis"
      backHref="/customers/reports"
      backLabel="Reports"
      description="AR aging buckets per customer."
    />
  )
}
