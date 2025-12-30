"use client"

import React from "react"
import { useTranslations } from "next-intl"
import { ScheduledScanDataTable } from "@/components/scan/scheduled/scheduled-scan-data-table"
import { createScheduledScanColumns } from "@/components/scan/scheduled/scheduled-scan-columns"
import { CreateScheduledScanDialog } from "@/components/scan/scheduled/create-scheduled-scan-dialog"
import { EditScheduledScanDialog } from "@/components/scan/scheduled/edit-scheduled-scan-dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { 
  useScheduledScans, 
  useDeleteScheduledScan, 
  useToggleScheduledScan 
} from "@/hooks/use-scheduled-scans"
import type { ScheduledScan } from "@/types/scheduled-scan.types"
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton"

/**
 * Scheduled scan page
 * Manage scheduled scan task configuration
 */
export default function ScheduledScanPage() {
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false)
  const [editDialogOpen, setEditDialogOpen] = React.useState(false)
  const [editingScheduledScan, setEditingScheduledScan] = React.useState<ScheduledScan | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [deletingScheduledScan, setDeletingScheduledScan] = React.useState<ScheduledScan | null>(null)
  
  // Internationalization
  const tColumns = useTranslations("columns")
  const tCommon = useTranslations("common")
  const tScan = useTranslations("scan")
  const tConfirm = useTranslations("common.confirm")

  // Build translation object
  const translations = React.useMemo(() => ({
    columns: {
      taskName: tColumns("scheduledScan.taskName"),
      scanEngine: tColumns("scheduledScan.scanEngine"),
      cronExpression: tColumns("scheduledScan.cronExpression"),
      scope: tColumns("scheduledScan.scope"),
      status: tColumns("common.status"),
      nextRun: tColumns("scheduledScan.nextRun"),
      runCount: tColumns("scheduledScan.runCount"),
      lastRun: tColumns("scheduledScan.lastRun"),
    },
    actions: {
      editTask: tScan("editTask"),
      delete: tCommon("actions.delete"),
      openMenu: tCommon("actions.openMenu"),
    },
    status: {
      enabled: tCommon("status.enabled"),
      disabled: tCommon("status.disabled"),
    },
    cron: {
      everyMinute: tScan("cron.everyMinute"),
      everyNMinutes: (n: number) => tScan("cron.everyNMinutes", { n }),
      everyHour: tScan("cron.everyHour"),
      everyNHours: (n: number) => tScan("cron.everyNHours", { n }),
      everyDay: tScan("cron.everyDay"),
      everyWeek: tScan("cron.everyWeek"),
      everyMonth: tScan("cron.everyMonth"),
      weekdays: tScan.raw("cron.weekdays") as string[],
    },
  }), [tColumns, tCommon, tScan])
  
  // Pagination state
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(10)

  // Search state
  const [searchQuery, setSearchQuery] = React.useState("")
  const [isSearching, setIsSearching] = React.useState(false)

  const handleSearchChange = (value: string) => {
    setIsSearching(true)
    setSearchQuery(value)
    setPage(1)
  }
  
  // Use actual API
  const { data, isLoading, isFetching, refetch } = useScheduledScans({ page, pageSize, search: searchQuery || undefined })

  // Reset search state when request completes
  React.useEffect(() => {
    if (!isFetching && isSearching) {
      setIsSearching(false)
    }
  }, [isFetching, isSearching])
  const { mutate: deleteScheduledScan } = useDeleteScheduledScan()
  const { mutate: toggleScheduledScan } = useToggleScheduledScan()

  const scheduledScans = data?.results || []
  const total = data?.total || 0
  const totalPages = data?.totalPages || 1

  // Format date
  const formatDate = React.useCallback((dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }, [])

  // Edit task
  const handleEdit = React.useCallback((scan: ScheduledScan) => {
    setEditingScheduledScan(scan)
    setEditDialogOpen(true)
  }, [])

  // Delete task (open confirmation dialog)
  const handleDelete = React.useCallback((scan: ScheduledScan) => {
    setDeletingScheduledScan(scan)
    setDeleteDialogOpen(true)
  }, [])

  // Confirm delete task
  const confirmDelete = React.useCallback(() => {
    if (deletingScheduledScan) {
      deleteScheduledScan(deletingScheduledScan.id)
      setDeleteDialogOpen(false)
      setDeletingScheduledScan(null)
    }
  }, [deletingScheduledScan, deleteScheduledScan])

  // Toggle task enabled status
  const handleToggleStatus = React.useCallback((scan: ScheduledScan, enabled: boolean) => {
    toggleScheduledScan({ id: scan.id, isEnabled: enabled })
  }, [toggleScheduledScan])

  // Page change handler
  const handlePageChange = React.useCallback((newPage: number) => {
    setPage(newPage)
  }, [])

  // Page size change handler
  const handlePageSizeChange = React.useCallback((newPageSize: number) => {
    setPageSize(newPageSize)
    setPage(1) // Reset to first page
  }, [])

  // Add new task
  const handleAddNew = React.useCallback(() => {
    setCreateDialogOpen(true)
  }, [])

  // Create column definition
  const columns = React.useMemo(
    () =>
      createScheduledScanColumns({
        formatDate,
        handleEdit,
        handleDelete,
        handleToggleStatus,
        t: translations,
      }),
    [formatDate, handleEdit, handleDelete, handleToggleStatus, translations]
  )

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        <div className="flex items-center justify-between px-4 lg:px-6">
          <div>
            <h1 className="text-3xl font-bold">{tScan("scheduled.title")}</h1>
            <p className="text-muted-foreground mt-1">{tScan("scheduled.description")}</p>
          </div>
        </div>
        <DataTableSkeleton
          toolbarButtonCount={2}
          rows={5}
          columns={6}
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      {/* Page title */}
      <div className="px-4 lg:px-6">
        <div>
          <h1 className="text-3xl font-bold">{tScan("scheduled.title")}</h1>
          <p className="text-muted-foreground mt-1">{tScan("scheduled.description")}</p>
        </div>
      </div>

      {/* Data table */}
      <div className="px-4 lg:px-6">
        <ScheduledScanDataTable
          data={scheduledScans}
          columns={columns}
          onAddNew={handleAddNew}
          searchPlaceholder={tScan("scheduled.searchPlaceholder")}
          searchValue={searchQuery}
          onSearch={handleSearchChange}
          isSearching={isSearching}
          addButtonText={tScan("scheduled.createTitle")}
          page={page}
          pageSize={pageSize}
          total={total}
          totalPages={totalPages}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      </div>

      {/* Create scheduled scan dialog */}
      <CreateScheduledScanDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => refetch()}
      />

      {/* Edit scheduled scan dialog */}
      <EditScheduledScanDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        scheduledScan={editingScheduledScan}
        onSuccess={() => refetch()}
      />

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tConfirm("deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {tConfirm("deleteScheduledScanMessage", { name: deletingScheduledScan?.name ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {tCommon("actions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
