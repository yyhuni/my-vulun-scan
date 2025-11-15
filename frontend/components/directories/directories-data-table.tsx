"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table"
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconLayoutColumns,
  IconTrash,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import type { Directory } from "@/types/directory.types"
import type { PaginationInfo } from "@/types/common.types"

interface DirectoriesDataTableProps {
  data: Directory[]
  columns: ColumnDef<Directory>[]
  searchPlaceholder?: string
  searchColumn?: string
  pagination?: { pageIndex: number; pageSize: number }
  setPagination?: React.Dispatch<React.SetStateAction<{ pageIndex: number; pageSize: number }>>
  paginationInfo?: PaginationInfo
  onPaginationChange?: (pagination: { pageIndex: number; pageSize: number }) => void
  onBulkDelete?: () => void
  onSelectionChange?: (selectedRows: Directory[]) => void
}

export function DirectoriesDataTable({
  data = [],
  columns,
  searchPlaceholder = "搜索目录...",
  searchColumn = "url",
  pagination,
  setPagination,
  paginationInfo,
  onPaginationChange,
  onBulkDelete,
  onSelectionChange,
}: DirectoriesDataTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState<Record<string, boolean>>({})
  const [internalPagination, setInternalPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })

  const useServerPagination = !!paginationInfo && !!pagination && !!setPagination
  const tablePagination = useServerPagination ? pagination : internalPagination
  const setTablePagination = useServerPagination ? setPagination : setInternalPagination

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination: tablePagination,
    },
    getRowId: (row) => row.id.toString(),
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: (updater) => {
      const nextPagination =
        typeof updater === "function" ? updater(tablePagination) : updater
      setTablePagination?.(nextPagination as { pageIndex: number; pageSize: number })
      onPaginationChange?.(nextPagination)
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    manualPagination: useServerPagination,
    pageCount: useServerPagination
      ? paginationInfo?.totalPages ?? -1
      : Math.ceil(data.length / tablePagination.pageSize) || 1,
  })

  const totalItems = useServerPagination
    ? paginationInfo?.total ?? data.length
    : table.getFilteredRowModel().rows.length

  // 处理选中行变化
  React.useEffect(() => {
    if (onSelectionChange) {
      const selectedRows = table.getFilteredSelectedRowModel().rows.map(row => row.original)
      onSelectionChange(selectedRows)
    }
  }, [rowSelection, onSelectionChange, table])

  return (
    <div className="w-full space-y-4">
      {/* 工具栏 */}
      <div className="flex flex-col gap-4 @container/toolbar">
        {/* 第一行：搜索和列控制 */}
        <div className="flex flex-col gap-4 @xl/toolbar:flex-row @xl/toolbar:items-center @xl/toolbar:justify-between">
          <div className="flex flex-1 items-center gap-2">
            <Input
              placeholder={searchPlaceholder}
              value={(table.getColumn(searchColumn)?.getFilterValue() as string) ?? ""}
              onChange={(event) =>
                table.getColumn(searchColumn)?.setFilterValue(event.target.value)
              }
              className="h-9 w-full @xl/toolbar:max-w-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* 批量删除按钮 */}
            {onBulkDelete && table.getFilteredSelectedRowModel().rows.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={onBulkDelete}
              >
                <IconTrash className="mr-2 h-4 w-4" />
                删除 ({table.getFilteredSelectedRowModel().rows.length})
              </Button>
            )}

            {/* 列可见性控制 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <IconLayoutColumns className="mr-2 h-4 w-4" />
                  列
                  <IconChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[200px]">
                <DropdownMenuLabel>显示列</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {table
                  .getAllColumns()
                  .filter(
                    (column) =>
                      typeof column.accessorFn !== "undefined" && column.getCanHide()
                  )
                  .map((column) => {
                    const columnTitle = {
                      url: "URL",
                      status: "Status",
                      length: "Length",
                      words: "Words",
                      lines: "Lines",
                      contentType: "Content Type",
                      duration: "Duration",
                      createdAt: "Created At",
                    }[column.id] || column.id

                    return (
                      <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) => column.toggleVisibility(!!value)}
                      >
                        {columnTitle}
                      </DropdownMenuCheckboxItem>
                    )
                  })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* 表格 */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  暂无数据
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分页控制 */}
      <div className="flex flex-col gap-4 @container/pagination">
        <div className="flex flex-col gap-4 @xl/pagination:flex-row @xl/pagination:items-center @xl/pagination:justify-between">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div>
              {table.getFilteredSelectedRowModel().rows.length > 0 && (
                <span>
                  已选择 {table.getFilteredSelectedRowModel().rows.length} /{" "}
                  {totalItems} 条
                </span>
              )}
              {table.getFilteredSelectedRowModel().rows.length === 0 && (
                <span>共 {totalItems} 条</span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-4 @sm/pagination:flex-row @sm/pagination:items-center">
            {/* 每页显示条数 */}
            <div className="flex items-center gap-2">
              <Label htmlFor="pageSize" className="text-sm text-muted-foreground whitespace-nowrap">
                每页显示
              </Label>
              <Select
                value={`${tablePagination.pageSize}`}
                onValueChange={(value) => {
                  const newPageSize = Number(value)
                  const newPagination = {
                    pageSize: newPageSize,
                    pageIndex: 0,
                  }
                  setTablePagination(newPagination)
                  onPaginationChange?.(newPagination)
                }}
              >
                <SelectTrigger id="pageSize" className="h-9 w-[70px]">
                  <SelectValue placeholder={tablePagination.pageSize} />
                </SelectTrigger>
                <SelectContent side="top">
                  {[10, 20, 30, 40, 50].map((pageSize) => (
                    <SelectItem key={pageSize} value={`${pageSize}`}>
                      {pageSize}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 分页按钮 */}
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center text-sm font-medium whitespace-nowrap">
                第 {tablePagination.pageIndex + 1} /{" "}
                {table.getPageCount() || 1} 页
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => {
                    const newPagination = {
                      ...tablePagination,
                      pageIndex: 0,
                    }
                    setTablePagination(newPagination)
                    onPaginationChange?.(newPagination)
                  }}
                  disabled={!table.getCanPreviousPage()}
                >
                  <span className="sr-only">跳转到第一页</span>
                  <IconChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => {
                    const newPagination = {
                      ...tablePagination,
                      pageIndex: tablePagination.pageIndex - 1,
                    }
                    setTablePagination(newPagination)
                    onPaginationChange?.(newPagination)
                  }}
                  disabled={!table.getCanPreviousPage()}
                >
                  <span className="sr-only">上一页</span>
                  <IconChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => {
                    const newPagination = {
                      ...tablePagination,
                      pageIndex: tablePagination.pageIndex + 1,
                    }
                    setTablePagination(newPagination)
                    onPaginationChange?.(newPagination)
                  }}
                  disabled={!table.getCanNextPage()}
                >
                  <span className="sr-only">下一页</span>
                  <IconChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => {
                    const newPagination = {
                      ...tablePagination,
                      pageIndex: table.getPageCount() - 1,
                    }
                    setTablePagination(newPagination)
                    onPaginationChange?.(newPagination)
                  }}
                  disabled={!table.getCanNextPage()}
                >
                  <span className="sr-only">跳转到最后一页</span>
                  <IconChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
