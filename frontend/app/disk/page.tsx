import { DiskUsage } from '@/components/disk/disk-usage'
import { DiskDangerZone } from '@/components/disk/disk-danger-zone'

export default function Page() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="flex flex-col gap-4 px-4 lg:px-6">
        <DiskUsage />
        <DiskDangerZone />
      </div>
    </div>
  )
}
