"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { IconCheck, IconBuilding, IconChevronLeft, IconChevronRight, IconChevronsLeft, IconChevronsRight } from "@tabler/icons-react"
import { useRouter } from "next/navigation"
import type { Organization } from "@/types/organization.types"

interface OrganizationSelectionTableProps {
  organizations: Organization[]
  selectedOrganization: Organization | null
  onSelect: (org: Organization) => void
  isLoading?: boolean
  searchQuery?: string
  pagination?: { pageIndex: number; pageSize: number }
  onPaginationChange?: (pagination: { pageIndex: number; pageSize: number }) => void
  totalCount?: number
  totalPages?: number
}

/**
 * 组织选择表格组件
 * 用于扫描任务创建时选择目标组织
 */
export function OrganizationSelectionTable({
  organizations,
  selectedOrganization,
  onSelect,
  isLoading = false,
  searchQuery = "",
  pagination,
  onPaginationChange,
  totalCount = 0,
  totalPages = 0,
}: OrganizationSelectionTableProps) {
  const router = useRouter()

  // 如果有搜索功能，在客户端过滤；否则使用服务端提供的数据
  const filteredOrganizations = React.useMemo(() => {
    if (!searchQuery) return organizations
    
    const query = searchQuery.toLowerCase()
    return organizations.filter((org) => {
      return (
        org.name.toLowerCase().includes(query) ||
        (org.description && org.description.toLowerCase().includes(query))
      )
    })
  }, [organizations, searchQuery])

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">加载组织列表...</p>
        </div>
      </div>
    )
  }

  if (organizations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <IconBuilding className="size-12 text-muted-foreground mb-3" />
        <p className="text-muted-foreground mb-4">暂无组织</p>
        <Button variant="outline" onClick={() => router.push("/assets/organization")}>
          前往创建组织
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">选择</TableHead>
              <TableHead>组织名称</TableHead>
              <TableHead>描述</TableHead>
              <TableHead className="w-32">域名数量</TableHead>
              <TableHead className="w-40">创建时间</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrganizations.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  未找到匹配的组织
                </TableCell>
              </TableRow>
            ) : (
              filteredOrganizations.map((org) => (
                <TableRow
                  key={org.id}
                  className={cn(
                    "cursor-pointer",
                    selectedOrganization?.id === org.id
                      ? "bg-primary/5 hover:bg-primary/10"
                      : "hover:bg-muted/50"
                  )}
                  onClick={() => onSelect(org)}
                >
                  <TableCell>
                    <div className="flex items-center justify-center">
                      <div
                        className={cn(
                          "flex items-center justify-center w-5 h-5 rounded border-2 transition-colors",
                          selectedOrganization?.id === org.id
                            ? "bg-primary border-primary"
                            : "border-muted-foreground/25"
                        )}
                      >
                        {selectedOrganization?.id === org.id && (
                          <IconCheck className="size-3 text-primary-foreground" />
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <IconBuilding className="size-4 text-primary flex-shrink-0" />
                      <TooltipProvider delayDuration={500} skipDelayDuration={0}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="font-medium max-w-[200px] truncate inline-block cursor-default">
                              {org.name}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent 
                            side="top" 
                            align="start"
                            sideOffset={5}
                            className="text-xs max-w-[400px] break-all"
                          >
                            {org.name}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                  <TableCell>
                    {org.description ? (
                      <TooltipProvider delayDuration={500} skipDelayDuration={0}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="text-sm text-muted-foreground max-w-[300px] truncate inline-block cursor-default">
                              {org.description}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent 
                            side="top" 
                            align="start"
                            sideOffset={5}
                            className="text-xs max-w-[500px] break-all"
                          >
                            {org.description}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {org.domains?.length || 0}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(org.createdAt)}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分页控件 */}
      {pagination && onPaginationChange && totalPages > 0 && (
        <div className="flex items-center justify-between px-2 py-4">
          <div className="flex-1 text-sm text-muted-foreground">
            共 {totalCount} 条记录
          </div>
          
          <div className="flex items-center space-x-6 lg:space-x-8">
            {/* 每页条数选择 */}
            <div className="flex items-center space-x-2">
              <p className="text-sm font-medium">每页显示</p>
              <Select
                value={`${pagination.pageSize}`}
                onValueChange={(value) => {
                  onPaginationChange({
                    pageIndex: 0,
                    pageSize: Number(value),
                  })
                }}
              >
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue placeholder={pagination.pageSize} />
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
              第 {pagination.pageIndex + 1} / {totalPages} 页
            </div>

            {/* 分页按钮 */}
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => onPaginationChange({ ...pagination, pageIndex: 0 })}
                disabled={pagination.pageIndex === 0}
              >
                <span className="sr-only">第一页</span>
                <IconChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => onPaginationChange({ ...pagination, pageIndex: pagination.pageIndex - 1 })}
                disabled={pagination.pageIndex === 0}
              >
                <span className="sr-only">上一页</span>
                <IconChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => onPaginationChange({ ...pagination, pageIndex: pagination.pageIndex + 1 })}
                disabled={pagination.pageIndex >= totalPages - 1}
              >
                <span className="sr-only">下一页</span>
                <IconChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="hidden h-8 w-8 p-0 lg:flex"
                onClick={() => onPaginationChange({ ...pagination, pageIndex: totalPages - 1 })}
                disabled={pagination.pageIndex >= totalPages - 1}
              >
                <span className="sr-only">最后一页</span>
                <IconChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
