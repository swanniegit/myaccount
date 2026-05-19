import Badge from '@/components/ui/Badge'
import type { JournalEntry } from '@/lib/types'

export default function PostedEntriesTable({ entries }: { entries: JournalEntry[] }) {
  return (
    <div>
      <p className="text-sm font-medium mb-2">Posted entries</p>
      <motion className="card overflow-hidden">
        <table className="w-full text-xs">
          <thead className="t-head">
            <tr>
              {['Date', 'Description', 'Source', 'Status'].map(h => (
                <th key={h} className="text-left">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, i) => (
              <tr
                key={entry.id}
                className="t-row"
                style={{ background: i % 2 === 0 ? 'var(--surface)' : 'var(--paper)' }}
              >
                <td className="t-cell num">{entry.date}</td>
                <td className="t-cell">{entry.description}</td>
                <td className="t-cell capitalize text-ink-2">{entry.source}</td>
                <td className="t-cell">
                  <Badge status={entry.is_posted ? 'posted' : 'unposted'} />
                </td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr className="t-empty">
                <td colSpan={4}>No entries yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </motion>
    </motion>
  )
}
