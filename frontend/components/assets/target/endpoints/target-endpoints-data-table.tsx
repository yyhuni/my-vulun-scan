"use client" // 标记为客户端组件

// 导入 React 库和 Hooks
import * as React from "react"
// 导入表格相关组件和类型
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
// 导入图标组件
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconLayoutColumns,
  IconPlus,
} from "@tabler/icons-react"

// 导入 UI 组件
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
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

// 导入类型定义
import type { Endpoint } from "@/types/endpoint.types"

  // 组件属性类型定义
interface TargetEndpointsDataTableProps {
  data: Endpoint[]                                  // 端点数据数组
  columns: ColumnDef<Endpoint>[]                    // 列定义数组
  onAddNew?: () => void                          // 添加新端点的回调函数
  onBulkDelete?: () => void                      // 批量删除回调函数
  onSelectionChange?: (selectedRows: Endpoint[]) => void  // 选中行变化回调
  searchPlaceholder?: string                     // 搜索框占位符
  searchColumn?: string                          // 搜索的列名
  addButtonText?: string                         // 添加按钮文本
  // 服务器端分页支持
  pagination?: { pageIndex: number; pageSize: number }  // 外部分页状态
  onPaginationChange?: (pagination: { pageIndex: number; pageSize: number }) => void  // 分页变化回调
  totalCount?: number                            // 总记录数
  totalPages?: number                            // 总页数
}

/**
 * 目标端点数据表格组件
 * 专门用于显示和管理目标端点数据的表格
 * 包含搜索、分页、列显示控制等功能
 */
export function TargetEndpointsDataTable({
  data,
  columns,
  onAddNew,
  onBulkDelete,
  onSelectionChange,
  searchPlaceholder = "搜索端点...",
  searchColumn = "url",
  addButtonText = "Add",
  pagination: externalPagination,
  onPaginationChange,
  totalCount,
  totalPages,
}: TargetEndpointsDataTableProps) {
  // 表格状态管理
  // 选中行状态，key为行id，value为true或false
  const [rowSelection, setRowSelection] = React.useState<Record<string, boolean>>({})
  // 列可见性状态，key为列id，value为true或false
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  // 列过滤状态，key为列id，value为过滤条件对象数组
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  // 排序状态，key为列id，value为true或false
  const [sorting, setSorting] = React.useState<SortingState>([])
  // 内部分页状态（客户端分页）
  const [internalPagination, setInternalPagination] = React.useState<{ pageIndex: number, pageSize: number }>({
    pageIndex: 0,
    pageSize: 10,
  })
  
  // 使用外部分页或内部分页
  const pagination = externalPagination || internalPagination
  
  // 分页变化处理
  const handlePaginationChange = React.useCallback((updaterOrValue: { pageIndex: number; pageSize: number } | ((prev: { pageIndex: number; pageSize: number }) => { pageIndex: number; pageSize: number })) => {
    if (onPaginationChange) {
      // 外部控制分页（服务器端分页）
      if (typeof updaterOrValue === 'function') {
        const newPagination = updaterOrValue(pagination)
        onPaginationChange(newPagination)
      } else {
        onPaginationChange(updaterOrValue)
      }
    } else {
      // 内部控制分页（客户端分页）
      setInternalPagination(updaterOrValue)
    }
  }, [onPaginationChange, pagination])

  // 创建表格实例
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
      pagination,
    },
    getRowId: (row) => row.id.toString(),
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: handlePaginationChange,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: externalPagination ? undefined : getPaginationRowModel(), // 服务器端分页不需要客户端分页
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    manualPagination: !!externalPagination, // 启用手动分页
    pageCount: totalPages, // 服务器端总页数
  })

  // 监听选中行变化，通知父组件
  React.useEffect(() => {
    if (onSelectionChange) {
      const selectedRows = table.getFilteredSelectedRowModel().rows.map(row => row.original)
      onSelectionChange(selectedRows)
    }
  }, [rowSelection, onSelectionChange, table])

  return (
    <div className="w-full space-y-4">
      {/* 工具栏 */}
      <div className="flex items-center justify-between">
        {/* 搜索框 */}
        <div className="flex items-center space-x-2">
          <Input
            placeholder={searchPlaceholder}
            value={(table.getColumn(searchColumn)?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn(searchColumn)?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
          />
        </div>

        {/* 右侧操作按钮 */}
        <div className="flex items-center space-x-2">
          {/* 列显示控制 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <IconLayoutColumns />
                Columns
                <IconChevronDown />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter(
                  (column) =>
                    typeof column.accessorFn !== "undefined" && column.getCanHide()
                )
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    >
                      {column.id === "id" && "ID"}
                      {column.id === "url" && "URL"}
                      {column.id === "endpoint" && "Endpoint"}
                      {column.id === "method" && "Method"}
                      {column.id === "statusCode" && "Status"}
                      {column.id === "title" && "Title"}
                      {column.id === "contentLength" && "Size"}
                      {column.id === "createdAt" && "Created At"}
                      {column.id === "updatedAt" && "Updated At"}
                      {!["id", "url", "endpoint", "method", "statusCode", "title", "contentLength", "createdAt", "updatedAt"].includes(column.id) && column.id}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* 添加新端点按钮 */}
          {onAddNew && (
            <Button onClick={onAddNew} size="sm">
              <IconPlus />
              {addButtonText}
            </Button>
          )}
        </div>
      </div>

      {/* 表格容器 */}
      <div className="rounded-md border">
        <Table>
          {/* 表头 */}
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} colSpan={header.colSpan}>
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

          {/* 表体 */}
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
                  No results
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {/* 分页控制 */}
      <div className="flex items-center justify-between px-2">
        {/* 选中行信息 */}
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {externalPagination ? totalCount : table.getFilteredRowModel().rows.length} row(s) selected
        </div>

        {/* 分页控制器 */}
        <div className="flex items-center space-x-6 lg:space-x-8">
          {/* 每页显示数量选择 */}
          <div className="flex items-center space-x-2">
            <Label htmlFor="rows-per-page" className="text-sm font-medium">
              Rows per page
            </Label>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => {
                table.setPageSize(Number(value))
              }}
            >
              <SelectTrigger className="h-8 w-[70px]" id="rows-per-page">
                <SelectValue placeholder={table.getState().pagination.pageSize} />
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

          {/* 页码信息 */}
          <div className="flex w-[100px] items-center justify-center text-sm font-medium">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {externalPagination ? totalPages : table.getPageCount()}
          </div>

          {/* 分页按钮 */}
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(0)}
              disabled={externalPagination ? pagination.pageIndex === 0 : !table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to first page</span>
              <IconChevronsLeft />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.previousPage()}
              disabled={externalPagination ? pagination.pageIndex === 0 : !table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to previous page</span>
              <IconChevronLeft />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.nextPage()}
              disabled={externalPagination ? pagination.pageIndex >= (totalPages || 1) - 1 : !table.getCanNextPage()}
            >
              <span className="sr-only">Go to next page</span>
              <IconChevronRight />
            </Button>
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex((totalPages || table.getPageCount()) - 1)}
              disabled={externalPagination ? pagination.pageIndex >= (totalPages || 1) - 1 : !table.getCanNextPage()}
            >
              <span className="sr-only">Go to last page</span>
              <IconChevronsRight />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
