import type { LauncherSection as Section } from '@/lib/dashboard/types'
import LauncherTile from './LauncherTile'

export default function LauncherSection({ section }: { section: Section }) {
  return (
    <div className="launcher-section">
      <div className="launcher-head" data-tone={section.tone}>{section.title}</div>
      <div className="launcher-grid">
        {section.tiles.map(tile => (
          <LauncherTile key={tile.label + tile.href} tile={tile} tone={section.tone} />
        ))}
      </div>
    </div>
  )
}
