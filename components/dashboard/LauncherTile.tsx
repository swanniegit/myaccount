import Link from 'next/link'
import type { LauncherTile as Tile, LauncherTone } from '@/lib/dashboard/types'

interface Props {
  tile: Tile
  tone: LauncherTone
}

export default function LauncherTile({ tile, tone }: Props) {
  const body = (
    <>
      {tile.soon && <span className="launcher-tile-badge">Soon</span>}
      <span>{tile.label}</span>
      {tile.subtitle && <span className="launcher-tile-sub">{tile.subtitle}</span>}
    </>
  )

  if (!tile.href) {
    return (
      <div className="launcher-tile" data-tone={tone} data-soon={tile.soon || undefined} aria-disabled>
        {body}
      </div>
    )
  }

  return (
    <Link href={tile.href} className="launcher-tile" data-tone={tone} data-soon={tile.soon || undefined}>
      {body}
    </Link>
  )
}
