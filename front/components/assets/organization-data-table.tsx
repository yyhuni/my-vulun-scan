"use client" // 标记为客户端组件，可以使用浏览器 API 和交互功能

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

// 组织数据类型定义
interface Organization {
  id: number
  name: string
  description: string
  createdAt: string
  updatedAt: string
}

// 组件属性类型定义
interface OrganizationDataTableProps {
  data: Organization[]                           // 组织数据数组
  columns: ColumnDef<Organization>[]             // 列定义数组
  onAddNew?: () => void                          // 添加新组织的回调函数
  searchPlaceholder?: string                     // 搜索框占位符
  searchColumn?: string                          // 搜索的列名
}

/**
 * 组织数据表格组件
 * 专门用于显示和管理组织数据的表格
 * 包含搜索、分页、列显示控制等功能
 */
export function OrganizationDataTable({
  data,
  columns,
  onAddNew,
  searchPlaceholder = "搜索组织...",
  searchColumn = "name",
}: OrganizationDataTableProps) {
  // 表格状态管理
  const [rowSelection, setRowSelection] = React.useState({})
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })

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
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

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
                <IconLayoutColumns className="mr-2 h-4 w-4" />
                列显示
                <IconChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[150px]">
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
                      {column.id === "name" && "组织名称"}
                      {column.id === "description" && "描述"}
                      {column.id === "createdAt" && "创建时间"}
                      {column.id === "updatedAt" && "更新时间"}
                      {!["name", "description", "createdAt", "updatedAt"].includes(column.id) && column.id}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* 添加新组织按钮 */}
          {onAddNew && (
            <Button onClick={onAddNew} size="sm">
              <IconPlus className="mr-2 h-4 w-4" />
              添加组织
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
                  暂无数据
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
          已选择 {table.getFilteredSelectedRowModel().rows.length} 行，共{" "}
          {table.getFilteredRowModel().rows.length} 行
        </div>

        {/* 分页控制器 */}
        <div className="flex items-center space-x-6 lg:space-x-8">
          {/* 每页显示数量选择 */}
          <div className="flex items-center space-x-2">
            <Label htmlFor="rows-per-page" className="text-sm font-medium">
              每页显示
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
            第 {table.getState().pagination.pageIndex + 1} 页，共{" "}
            {table.getPageCount()} 页
          </div>

          {/* 分页按钮 */}
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">跳转到第一页</span>
              <IconChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">上一页</span>
              <IconChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">下一页</span>
              <IconChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">跳转到最后一页</span>
              <IconChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
