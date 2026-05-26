import type { LauncherModule } from '@/lib/dashboard/types'
import LauncherSection from './LauncherSection'

export default function ModuleLauncher({ module }: { module: LauncherModule }) {
  return (
    <div>
      {module.sections.map(section => (
        <LauncherSection key={section.title + section.tone} section={section} />
      ))}
    </div>
  )
}
