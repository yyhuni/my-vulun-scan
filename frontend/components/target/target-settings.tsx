"use client"

import React, { useState, useEffect } from "react"
import { useTranslations, useLocale } from "next-intl"
import { AlertTriangle, Loader2, Ban, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { useTargetBlacklist, useUpdateTargetBlacklist, useTarget } from "@/hooks/use-targets"
import { useScheduledScans, useToggleScheduledScan, useDeleteScheduledScan } from "@/hooks/use-scheduled-scans"
import { ScheduledScanDataTable } from "@/components/scan/scheduled/scheduled-scan-data-table"
import { createScheduledScanColumns } from "@/components/scan/scheduled/scheduled-scan-columns"
import { CreateScheduledScanDialog } from "@/components/scan/scheduled/create-scheduled-scan-dialog"
import { EditScheduledScanDialog } from "@/components/scan/scheduled/edit-scheduled-scan-dialog"
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton"
import type { ScheduledScan } from "@/types/scheduled-scan.types"

interface TargetSettingsProps {
  targetId: number
}

/**
 * Target settings component
 * Contains blacklist configuration and scheduled scans
 */
export function TargetSettings({ targetId }: TargetSettingsProps) {
  const t = useTranslations("pages.targetDetail.settings")
  const tColumns = useTranslations("columns")
  const tCommon = useTranslations("common")
  const tScan = useTranslations("scan")
  const tConfirm = useTranslations("common.confirm")
  const locale = useLocale()
  
  const [blacklistText, setBlacklistText] = useState("")
  const [hasChanges, setHasChanges] = useState(false)

  // Scheduled scan states
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [editingScheduledScan, setEditingScheduledScan] = useState<ScheduledScan | null>(null)
  const [deletingScheduledScan, setDeletingScheduledScan] = useState<ScheduledScan | null>(null)

  // Pagination state
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)

  // Fetch target data for preset name
  const { data: target } = useTarget(targetId)

  // Fetch blacklist data
  const { data, isLoading, error } = useTargetBlacklist(targetId)
  const updateBlacklist = useUpdateTargetBlacklist()

  // Fetch scheduled scans for this target
  const { 
    data: scheduledScansData, 
    isLoading: isLoadingScans,
    isFetching,
    refetch 
  } = useScheduledScans({ 
    targetId, 
    page,
    pageSize,
    search: searchQuery || undefined
  })
  const { mutate: toggleScheduledScan } = useToggleScheduledScan()
  const { mutate: deleteScheduledScan } = useDeleteScheduledScan()

  const scheduledScans = scheduledScansData?.results || []
  const total = scheduledScansData?.total || 0
  const totalPages = scheduledScansData?.totalPages || 1

  // Build translation object for columns
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
      everyNMinutes: tScan.raw("cron.everyNMinutes") as string,
      everyHour: tScan.raw("cron.everyHour") as string,
      everyNHours: tScan.raw("cron.everyNHours") as string,
      everyDay: tScan.raw("cron.everyDay") as string,
      everyWeek: tScan.raw("cron.everyWeek") as string,
      everyMonth: tScan.raw("cron.everyMonth") as string,
      weekdays: tScan.raw("cron.weekdays") as string[],
    },
  }), [tColumns, tCommon, tScan])

  // Initialize text when data loads
  useEffect(() => {
    if (data?.patterns) {
      setBlacklistText(data.patterns.join("\n"))
      setHasChanges(false)
    }
  }, [data])

  // Reset search state when request completes
  useEffect(() => {
    if (!isFetching && isSearching) {
      setIsSearching(false)
    }
  }, [isFetching, isSearching])

  // Handle text change
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setBlacklistText(e.target.value)
    setHasChanges(true)
  }

  // Handle save
  const handleSave = () => {
    const patterns = blacklistText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)

    updateBlacklist.mutate(
      { targetId, patterns },
      {
        onSuccess: () => {
          setHasChanges(false)
        },
      }
    )
  }

  // Format date
  const formatDate = React.useCallback((dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString(locale === "zh" ? "zh-CN" : "en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }, [locale])

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

  // Search handler
  const handleSearchChange = (value: string) => {
    setIsSearching(true)
    setSearchQuery(value)
    setPage(1)
  }

  // Page change handler
  const handlePageChange = React.useCallback((newPage: number) => {
    setPage(newPage)
  }, [])

  // Page size change handler
  const handlePageSizeChange = React.useCallback((newPageSize: number) => {
    setPageSize(newPageSize)
    setPage(1)
  }, [])

  // Add new task
  const handleAddNew = React.useCallback(() => {
    setCreateDialogOpen(true)
  }, [])

  // Create column definition (hide scope column since we're filtering by target)
  const columns = React.useMemo(() => {
    const allColumns = createScheduledScanColumns({
      formatDate,
      handleEdit,
      handleDelete,
      handleToggleStatus,
      t: translations,
    })
    // Filter out the scope column since all scans are for this target
    return allColumns.filter(col => (col as { accessorKey?: string }).accessorKey !== 'scanMode')
  }, [formatDate, handleEdit, handleDelete, handleToggleStatus, translations])

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertTriangle className="h-10 w-10 text-destructive mb-4" />
        <p className="text-muted-foreground">{t("loadError")}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Blacklist section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Ban className="h-5 w-5 text-muted-foreground" />
            <CardTitle>{t("blacklist.title")}</CardTitle>
          </div>
          <CardDescription>{t("blacklist.description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Rules hint */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{t("blacklist.rulesTitle")}:</span>
            <span><code className="bg-muted px-1.5 py-0.5 rounded text-xs">*.gov</code> {t("blacklist.rules.domainShort")}</span>
            <span><code className="bg-muted px-1.5 py-0.5 rounded text-xs">*cdn*</code> {t("blacklist.rules.keywordShort")}</span>
            <span><code className="bg-muted px-1.5 py-0.5 rounded text-xs">192.168.1.1</code> {t("blacklist.rules.ipShort")}</span>
            <span><code className="bg-muted px-1.5 py-0.5 rounded text-xs">10.0.0.0/8</code> {t("blacklist.rules.cidrShort")}</span>
          </div>

          {/* Input */}
          <Textarea
            value={blacklistText}
            onChange={handleTextChange}
            placeholder={t("blacklist.placeholder")}
            className="min-h-[240px] font-mono text-sm"
          />

          {/* Save button */}
          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={!hasChanges || updateBlacklist.isPending}
            >
              {updateBlacklist.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t("blacklist.save")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Scheduled Scans section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <CardTitle>{t("scheduledScans.title")}</CardTitle>
          </div>
          <CardDescription>{t("scheduledScans.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingScans ? (
            <DataTableSkeleton rows={3} columns={6} toolbarButtonCount={1} />
          ) : (
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
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <CreateScheduledScanDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        presetTargetId={targetId}
        presetTargetName={target?.name}
        onSuccess={() => refetch()}
      />

      {/* Edit Dialog */}
      <EditScheduledScanDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        scheduledScan={editingScheduledScan}
        onSuccess={() => refetch()}
      />

      {/* Delete Confirmation Dialog */}
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
            <AlertDialogAction 
              onClick={confirmDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {tCommon("actions.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
