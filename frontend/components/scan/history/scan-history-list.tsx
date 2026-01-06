"use client"

import React, { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useTranslations, useLocale } from "next-intl"
import { ScanHistoryDataTable } from "./scan-history-data-table"
import { createScanHistoryColumns } from "./scan-history-columns"
import { getDateLocale } from "@/lib/date-utils"
import type { ScanRecord } from "@/types/scan.types"
import type { ColumnDef } from "@tanstack/react-table"
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton"
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
import { toast } from "sonner"
import { useScans } from "@/hooks/use-scans"
import { deleteScan, bulkDeleteScans, stopScan, getScan } from "@/services/scan.service"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ScanProgressDialog, buildScanProgressData, type ScanProgressData } from "@/components/scan/scan-progress-dialog"

/**
 * Scan history list component
 * Used to display and manage scan history records
 */
interface ScanHistoryListProps {
  hideToolbar?: boolean
  targetId?: number  // Filter by target ID
  pageSize?: number  // Custom page size
  hideTargetColumn?: boolean  // Hide target column (useful when showing scans for a specific target)
  pageSizeOptions?: number[]  // Custom page size options
  hidePagination?: boolean  // Hide pagination completely
}

export function ScanHistoryList({ hideToolbar = false, targetId, pageSize: customPageSize, hideTargetColumn = false, pageSizeOptions, hidePagination = false }: ScanHistoryListProps) {
  const queryClient = useQueryClient()
  const [selectedScans, setSelectedScans] = useState<ScanRecord[]>([])
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [scanToDelete, setScanToDelete] = useState<ScanRecord | null>(null)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [stopDialogOpen, setStopDialogOpen] = useState(false)
  const [scanToStop, setScanToStop] = useState<ScanRecord | null>(null)

  // Internationalization
  const tColumns = useTranslations("columns")
  const tCommon = useTranslations("common")
  const tTooltips = useTranslations("tooltips")
  const tScan = useTranslations("scan")
  const tToast = useTranslations("toast")
  const tConfirm = useTranslations("common.confirm")
  const locale = useLocale()

  // Build translation object
  const translations = useMemo(() => ({
    columns: {
      target: tColumns("scanHistory.target"),
      summary: tColumns("scanHistory.summary"),
      engineName: tColumns("scanHistory.engineName"),
      workerName: tColumns("scanHistory.workerName"),
      createdAt: tColumns("common.createdAt"),
      status: tColumns("common.status"),
      progress: tColumns("scanHistory.progress"),
    },
    actions: {
      snapshot: tCommon("actions.snapshot"),
      stopScan: tScan("stopScan"),
      delete: tCommon("actions.delete"),
      openMenu: tCommon("actions.openMenu"),
      selectAll: tCommon("actions.selectAll"),
      selectRow: tCommon("actions.selectRow"),
    },
    tooltips: {
      targetDetails: tTooltips("targetDetails"),
      viewProgress: tTooltips("viewProgress"),
    },
    status: {
      cancelled: tCommon("status.cancelled"),
      completed: tCommon("status.completed"),
      failed: tCommon("status.failed"),
      initiated: tCommon("status.pending"),
      running: tCommon("status.running"),
    },
    summary: {
      subdomains: tColumns("scanHistory.subdomains"),
      websites: tColumns("scanHistory.websites"),
      ipAddresses: tColumns("scanHistory.ipAddresses"),
      endpoints: tColumns("scanHistory.endpoints"),
      vulnerabilities: tColumns("scanHistory.vulnerabilities"),
    },
  }), [tColumns, tCommon, tTooltips, tScan])
  
  // Progress dialog state
  const [progressDialogOpen, setProgressDialogOpen] = useState(false)
  const [progressData, setProgressData] = useState<ScanProgressData | null>(null)
  
  // Pagination state
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: customPageSize || 10,
  })

  // Search state
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)

  const handleSearchChange = (value: string) => {
    setIsSearching(true)
    setSearchQuery(value)
    setPagination((prev) => ({ ...prev, pageIndex: 0 }))
  }
  
  // Get scan list data
  const { data, isLoading, isFetching, error } = useScans({
    page: pagination.pageIndex + 1, // API page numbers start from 1
    pageSize: pagination.pageSize,
    search: searchQuery || undefined,
    target: targetId,
  })

  // Reset search state when request completes
  React.useEffect(() => {
    if (!isFetching && isSearching) {
      setIsSearching(false)
    }
  }, [isFetching, isSearching])
  
  // Scan list data
  const scans = data?.results || []
  
  // Delete single scan mutation
  const deleteMutation = useMutation({
    mutationFn: deleteScan,
    onSuccess: () => {
      // Refresh list data
      queryClient.invalidateQueries({ queryKey: ['scans'] })
    },
  })
  
  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: bulkDeleteScans,
    onSuccess: () => {
      // Refresh list data
      queryClient.invalidateQueries({ queryKey: ['scans'] })
      // Clear selected items
      setSelectedScans([])
    },
  })
  
  // Stop scan mutation
  const stopMutation = useMutation({
    mutationFn: stopScan,
    onSuccess: () => {
      // Refresh list data
      queryClient.invalidateQueries({ queryKey: ['scans'] })
    },
  })

  // Helper function - format date
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString(getDateLocale(locale), {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
  }

  // Navigation function
  const router = useRouter()
  const navigate = (path: string) => {
    router.push(path)
  }

  // Handle delete scan record
  const handleDeleteScan = (scan: ScanRecord) => {
    setScanToDelete(scan)
    setDeleteDialogOpen(true)
  }

  // Confirm delete scan record
  const confirmDelete = async () => {
    if (!scanToDelete) return

    setDeleteDialogOpen(false)
    
    try {
      await deleteMutation.mutateAsync(scanToDelete.id)
      toast.success(tToast("deletedScanRecord", { name: scanToDelete.targetName }))
    } catch (error) {
      toast.error(tToast("deleteFailed"))
      console.error('Delete failed:', error)
    } finally {
      setScanToDelete(null)
    }
  }

  // Handle bulk delete
  const handleBulkDelete = () => {
    if (selectedScans.length === 0) {
      return
    }
    setBulkDeleteDialogOpen(true)
  }
  
  // Handle stop scan
  const handleStopScan = (scan: ScanRecord) => {
    setScanToStop(scan)
    setStopDialogOpen(true)
  }
  
  // Confirm stop scan
  const confirmStop = async () => {
    if (!scanToStop) return

    setStopDialogOpen(false)
    
    try {
      await stopMutation.mutateAsync(scanToStop.id)
      toast.success(tToast("stoppedScan", { name: scanToStop.targetName }))
    } catch (error) {
      toast.error(tToast("stopFailed"))
      console.error('Stop scan failed:', error)
    } finally {
      setScanToStop(null)
    }
  }
  
  // View scan progress (get latest data for single scan)
  const handleViewProgress = async (scan: ScanRecord) => {
    try {
      // Get latest data for single scan, instead of refreshing entire list
      const freshScan = await getScan(scan.id)
      const progressData = buildScanProgressData(freshScan)
      setProgressData(progressData)
      setProgressDialogOpen(true)
    } catch (error) {
      // If fetch fails, use current data
      const progressData = buildScanProgressData(scan)
      setProgressData(progressData)
      setProgressDialogOpen(true)
    }
  }

  // Confirm bulk delete
  const confirmBulkDelete = async () => {
    if (selectedScans.length === 0) return

    const deletedIds = selectedScans.map(scan => scan.id)
    
    setBulkDeleteDialogOpen(false)
    
    try {
      const result = await bulkDeleteMutation.mutateAsync(deletedIds)
      toast.success(result.message || tToast("bulkDeleteSuccess", { count: result.deletedCount }))
    } catch (error) {
      toast.error(tToast("bulkDeleteFailed"))
      console.error('Bulk delete failed:', error)
    }
  }


  // Handle pagination change
  const handlePaginationChange = (newPagination: { pageIndex: number; pageSize: number }) => {
    setPagination(newPagination)
  }

  // Create column definitions
  const scanColumns = useMemo(
    () =>
      createScanHistoryColumns({
        formatDate,
        navigate,
        handleDelete: handleDeleteScan,
        handleStop: handleStopScan,
        handleViewProgress,
        t: translations,
        hideTargetColumn,
      }),
    [navigate, translations, hideTargetColumn]
  )

  // Error handling
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-destructive mb-4">{tScan("history.loadFailed")}</p>
        <button 
          onClick={() => queryClient.invalidateQueries({ queryKey: ['scans'] })}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          {tScan("history.retry")}
        </button>
      </div>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <DataTableSkeleton
        toolbarButtonCount={2}
        rows={6}
        columns={6}
        withPadding={false}
      />
    )
  }

  return (
    <>
      <ScanHistoryDataTable
        data={scans}
        columns={scanColumns as ColumnDef<ScanRecord>[]}
        onBulkDelete={hideToolbar ? undefined : handleBulkDelete}
        onSelectionChange={setSelectedScans}
        searchPlaceholder={tScan("history.searchPlaceholder")}
        searchValue={searchQuery}
        onSearch={handleSearchChange}
        isSearching={isSearching}
        pagination={pagination}
        setPagination={setPagination}
        paginationInfo={{
          total: data?.total || 0,
          page: data?.page || 1,
          pageSize: data?.pageSize || 10,
          totalPages: data?.totalPages || 1,
        }}
        onPaginationChange={handlePaginationChange}
        hideToolbar={hideToolbar}
        pageSizeOptions={pageSizeOptions}
        hidePagination={hidePagination}
      />

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tConfirm("deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {tConfirm("deleteScanMessage", { name: scanToDelete?.targetName ?? "" })}
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

      {/* Bulk delete confirmation dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tConfirm("bulkDeleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {tConfirm("bulkDeleteScanMessage", { count: selectedScans.length })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {/* Scan record list container */}
          <div className="mt-2 p-2 bg-muted rounded-md max-h-96 overflow-y-auto">
            <ul className="text-sm space-y-1">
              {selectedScans.map((scan) => (
                <li key={scan.id} className="flex items-center justify-between">
                  <span className="font-medium">{scan.targetName}</span>
                  <span className="text-muted-foreground text-xs">{scan.engineNames?.join(", ") || "-"}</span>
                </li>
              ))}
            </ul>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmBulkDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {tConfirm("deleteScanCount", { count: selectedScans.length })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Stop scan confirmation dialog */}
      <AlertDialog open={stopDialogOpen} onOpenChange={setStopDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tConfirm("stopScanTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {tConfirm("stopScanMessage", { name: scanToStop?.targetName ?? "" })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmStop} 
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {tConfirm("stopScanAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Scan progress dialog */}
      <ScanProgressDialog
        open={progressDialogOpen}
        onOpenChange={setProgressDialogOpen}
        data={progressData}
      />
    </>
  )
}
