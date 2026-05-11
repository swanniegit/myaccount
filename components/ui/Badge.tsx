const colors: Record<string, string> = {
  draft: '#B8B0A0',
  sent: '#D97757',
  paid: '#1F8A5B',
  overdue: '#C0392B',
  void: '#B8B0A0',
  posted: '#1F8A5B',
  unposted: '#D97757',
  review: '#D97757',
  matched: '#1F8A5B',
}

export default function Badge({ status }: { status: string }) {
  const color = colors[status.toLowerCase()] ?? '#B8B0A0'
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize"
      style={{ background: color + '22', color }}
    >
      {status}
    </span>
  )
}
