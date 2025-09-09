// 组织列表组件
"use client";

// React 核心库
import { useState, useEffect } from "react"

// 导航 Hook
import { useNavigation } from "@/hooks/use-navigation"

// 第三方库和 API 客户端
import { getErrorMessage } from "@/lib/api-client"
import { OrganizationService } from "@/services/organization.service"

// UI 图标库
import { Search, Trash2, Eye, MoreHorizontal } from "lucide-react"

// UI 组件库
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// 自定义 Hooks
import { useToast } from "@/hooks/use-toast"

// 业务组件
import AddOrganizationDialog from "./add-organization-dialog"
import { TablePagination } from "@/components/common/table-pagination"
import DataStateWrapper from "@/components/common/data-state-wrapper"

// 类型定义
interface Organization {
  id: string
  name: string
  description: string
  createdAt: string   // 前端使用 camelCase
  domainCount: number // 添加域名数量字段
  status: string      // 添加状态字段
}


type ViewState = "loading" | "data" | "empty" | "error"

// 常量定义
const DEFAULT_ITEMS_PER_PAGE = 10

export default function OrganizationList() {
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE)
  const [viewState, setViewState] = useState<ViewState>("loading")

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [organizationToDelete, setOrganizationToDelete] = useState<Organization | null>(null)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [error, setError] = useState<string | null>(null)

  const { toast } = useToast()
  const { navigate } = useNavigation()

  // 辅助函数

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString("zh-CN", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
  }

  // 初始化时加载组织数据
  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      setViewState("loading");
      setError(null);

      // 使用组织服务
      const response = await OrganizationService.getOrganizations();

      // 检查响应码并获取数据
      if (response.code === "SUCCESS" && Array.isArray(response.data)) {
        // 数据已经自动转换为 camelCase，无需手动转换
        setOrganizations(response.data);
        setViewState(response.data.length > 0 ? "data" : "empty");
      } else {
        throw new Error("API 返回了无效的数据格式");
      }
    } catch (err: any) {
      console.error('Error fetching organizations:', err);
      setError(getErrorMessage(err));
      setViewState("error");
    }
  };

  const filteredOrganizations = organizations.filter(
    (org) =>
      org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.description.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const paginatedOrganizations = filteredOrganizations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  )

  const handleDelete = (org: Organization) => {
    setOrganizationToDelete(org)
    setDeleteDialogOpen(true)
  }

  // 删除组织
  const confirmDelete = async () => {
    if (!organizationToDelete) return

    try {
      await OrganizationService.deleteOrganization(organizationToDelete.id);
      setOrganizations((prev) => prev.filter((org) => org.id !== organizationToDelete.id))
      toast({
        title: "删除成功",
        description: `组织 "${organizationToDelete.name}" 已被删除`,
      })
      setDeleteDialogOpen(false)
      setOrganizationToDelete(null)
    } catch (err: any) {
      console.error('Error deleting organization:', err);
      toast({
        title: "删除失败",
        description: getErrorMessage(err),
        variant: "destructive",
      });
    }
  }

  // 添加组织
  // 由于 AddOrganizationDialog 内部已经处理了API调用，这里只需要触发数据刷新
  const handleOrganizationAdded = () => {
    fetchOrganizations();
  };

  const DataTable = () => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="h-8 px-4 py-1 text-sm font-medium">组织名称</TableHead>
            <TableHead className="hidden md:table-cell h-8 px-4 py-1 text-sm font-medium">组织描述</TableHead>
            <TableHead className="hidden sm:table-cell h-8 px-4 py-1 text-sm font-medium">添加日期</TableHead>
            <TableHead className="w-[50px] h-8 px-4 py-1 text-sm font-medium"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedOrganizations.map((org) => (
            <TableRow key={org.id}>
              <TableCell className="px-3 py-2">
                <div className="font-medium text-sm">{org.name}</div>
              </TableCell>
              <TableCell className="hidden md:table-cell px-3 py-2">
                <div className="text-sm text-muted-foreground line-clamp-1">
                  {org.description}
                </div>
              </TableCell>
              <TableCell className="hidden sm:table-cell px-3 py-2">
                <div className="text-sm text-muted-foreground">
                  {formatDate(org.createdAt)}
                </div>
              </TableCell>

              <TableCell className="px-3 py-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate(`/assets/organizations/${org.id}`)}>
                      <Eye className="h-4 w-4 mr-2" />
                      查看详情
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-red-600 focus:text-red-600"
                      onClick={() => handleDelete(org)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      删除组织
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )

  return (
    <div className="space-y-6 pb-8">
      {/* 头部 */}
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">组织列表</h1>
        <p className="text-muted-foreground">管理和查看系统中的所有组织</p>
      </div>

      {/* 操作栏 */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mt-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="搜索组织..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <AddOrganizationDialog onAdd={handleOrganizationAdded} />
        </div>
      </div>

      {/* 主要内容 - 使用 DataStateWrapper */}
      <Card>
        <CardContent className="p-0">
          <DataStateWrapper
            state={viewState}
            loadingText="正在加载组织数据..."
            emptyIcon={Search}
            emptyTitle="未找到组织"
            emptyDescription={searchTerm ? "请尝试调整搜索条件" : "开始添加您的第一个组织"}
            errorStatusCode={500}
            errorTitle="加载失败"
            errorDescription={error || "获取组织数据时发生错误，请重试"}
            showRetry={true}
            onRetry={fetchOrganizations}
            hasData={filteredOrganizations.length > 0}
          >
            <DataTable />
          </DataStateWrapper>
        </CardContent>
      </Card>

      {/* 分页控件 */}
      <Card>
      <CardContent className="py-4">
      {viewState === "data" && filteredOrganizations.length > 0 && (
        <TablePagination
          currentPage={currentPage}
          totalItems={filteredOrganizations.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      )}
      </CardContent>
      </Card>

      {/* 删除确认对话框 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              您确定要删除组织 "{organizationToDelete?.name}" 吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>确认删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
