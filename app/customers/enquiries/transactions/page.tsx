import ComingSoon from '@/components/dashboard/ComingSoon'

export default function TransactionEnquiriesPage() {
  return (
    <ComingSoon
      title="Transaction Enquiries"
      backHref="/customers/enquiries"
      backLabel="Enquiries"
      description="Filter customer transactions by customer, date and document type."
    />
  )
}
