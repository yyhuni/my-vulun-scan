import { DiskUsage } from '@/components/disk/disk-usage'
import { DiskDangerZone } from '@/components/disk/disk-danger-zone'

export default function Page() {
  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="px-4 lg:px-6">
        <div>
          <h1 className="text-3xl font-bold">磁盘管理</h1>
          <p className="text-muted-foreground mt-1">查看磁盘使用情况与清理数据</p>
        </div>
      </div>
      <div className="flex flex-col gap-4 px-4 lg:px-6">
        <DiskUsage />
        <DiskDangerZone />
      </div>
    </div>
  )
}
