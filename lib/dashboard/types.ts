export type LauncherTone = 'txn' | 'enquiry' | 'report'

export interface LauncherTile {
  label: string
  href: string | null
  soon?: boolean
  subtitle?: string
}

export interface LauncherSection {
  title: string
  tone: LauncherTone
  tiles: LauncherTile[]
}

export interface LauncherModule {
  title: string
  sections: LauncherSection[]
}
