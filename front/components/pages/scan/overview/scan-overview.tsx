"use client"

import { useState, useEffect } from "react";
import { BarChart3, Clock, CheckCircle, XCircle, Search, Plus, Filter, Eye, Trash2, Download, PlayCircle, RotateCcw, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigation } from "@/hooks/use-navigation";
import { useToast } from "@/hooks/use-toast";
import DataStateWrapper, { DataViewState } from "@/components/common/data-state-wrapper";
import { TablePagination } from "@/components/common/table-pagination";
import { formatDateTime } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// 模拟扫描任务数据
interface ScanTask {
  id: string;
  name: string;
  target: string;
  status: "running" | "completed" | "failed" | "pending";
  createdAt: string;
  lastRun?: string;
  duration?: string;
  resultsSummary: string;
  type: string;
}

const mockScanTasks: ScanTask[] = [
  {
    id: "SCAN-001",
    name: "对 example.com 的子域名扫描",
    target: "example.com",
    status: "completed",
    createdAt: "2024-03-20T10:00:00Z",
    lastRun: "2024-03-20T10:15:30Z",
    duration: "15分30秒",
    resultsSummary: "发现 125 个子域名",
    type: "Subfinder 扫描",
  },
  {
    id: "SCAN-002",
    name: "针对 Org-ABC 的全面安全评估",
    target: "Org-ABC",
    status: "running",
    createdAt: "2024-03-21T14:30:00Z",
    lastRun: "2024-03-21T14:30:00Z",
    duration: "进行中 (2小时10分)",
    resultsSummary: "已扫描 60%",
    type: "全面漏洞扫描",
  },
  {
    id: "SCAN-003",
    name: "端口扫描: 192.168.1.100",
    target: "192.168.1.100",
    status: "failed",
    createdAt: "2024-03-19T09:00:00Z",
    lastRun: "2024-03-19T09:05:02Z",
    duration: "5分02秒",
    resultsSummary: "目标无响应",
    type: "Nmap 端口扫描",
  },
  {
    id: "SCAN-004",
    name: "Web应用漏洞扫描 - myapp.com",
    target: "myapp.com",
    status: "pending",
    createdAt: "2024-03-22T11:00:00Z",
    resultsSummary: "等待执行",
    type: "ZAP 扫描",
  },
  {
    id: "SCAN-005",
    name: "对 internal.corp 的常规扫描",
    target: "internal.corp",
    status: "completed",
    createdAt: "2024-03-18T16:00:00Z",
    lastRun: "2024-03-18T16:45:00Z",
    duration: "45分钟",
    resultsSummary: "发现 3 个中危漏洞, 12 个低危信息",
    type: "常规安全扫描",
  },
];

export default function ScanOverview() {
  const { navigate } = useNavigation();
  const { toast } = useToast();

  // 状态管理 - 参考组织列表页面
  const [scanTasks, setScanTasks] = useState<ScanTask[]>(mockScanTasks);
  const [viewState, setViewState] = useState<DataViewState>("data");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<ScanTask | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 辅助函数 - 参考组织列表页面



  const filteredTasks = scanTasks
    .filter((task) =>
      task.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.target.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.id.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .filter((task) => statusFilter === "all" || task.status === statusFilter)
    .filter((task) => typeFilter === "all" || task.type === typeFilter);

  const paginatedTasks = filteredTasks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleDelete = (task: ScanTask) => {
    setTaskToDelete(task);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (taskToDelete) {
      setScanTasks(scanTasks.filter((task) => task.id !== taskToDelete.id));
      toast({ title: "删除成功", description: `扫描任务 "${taskToDelete.name}" 已被删除。` });
      setDeleteDialogOpen(false);
      setTaskToDelete(null);
    }
  };

  // 数据表格组件 - 参考组织列表页面
  const DataTable = () => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="h-8 px-4 py-1 text-sm font-medium">任务信息</TableHead>
            <TableHead className="h-8 px-4 py-1 text-sm font-medium">状态</TableHead>
            <TableHead className="hidden sm:table-cell h-8 px-4 py-1 text-sm font-medium">创建时间</TableHead>
            <TableHead className="w-[50px] h-8 px-4 py-1 text-sm font-medium"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedTasks.map((task) => (
            <TableRow key={task.id}>
              <TableCell className="px-3 py-2">
                <div className="space-y-1">
                  <div className="font-medium text-sm flex items-center gap-2">
                    {getStatusIcon(task.status)}
                    {task.name}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">
                    ID: {task.id}
                  </div>
                </div>
              </TableCell>
              <TableCell className="px-3 py-2">
                {getStatusBadge(task.status)}
              </TableCell>
              <TableCell className="hidden sm:table-cell px-3 py-2">
                <div className="text-sm text-muted-foreground">
                  {formatDateTime(task.createdAt)}
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
                    <DropdownMenuItem onClick={() => navigate(`/scan/history/${task.id}`)}>
                      <Eye className="h-4 w-4 mr-2" />
                      查看详情
                    </DropdownMenuItem>
                    {task.status === "running" && (
                      <DropdownMenuItem onClick={() => toast({title: "操作待实现", description: "停止扫描 " + task.id})}>
                        <PlayCircle className="h-4 w-4 mr-2 rotate-90" />
                        停止扫描
                      </DropdownMenuItem>
                    )}
                    {(task.status === "completed" || task.status === "failed") && (
                      <DropdownMenuItem onClick={() => toast({title: "操作待实现", description: "重新扫描 " + task.id})}>
                        <RotateCcw className="h-4 w-4 mr-2" />
                        重新扫描
                      </DropdownMenuItem>
                    )}
                    {task.status === "completed" && (
                      <DropdownMenuItem onClick={() => toast({title: "操作待实现", description: "下载报告 " + task.id})}>
                        <Download className="h-4 w-4 mr-2" />
                        下载报告
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-red-600 focus:text-red-600"
                      onClick={() => handleDelete(task)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      删除任务
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );

  const getStatusBadge = (status: ScanTask["status"]) => {
    switch (status) {
      case "completed":
        return <Badge variant="default" className="bg-green-100 text-green-800">已完成</Badge>;
      case "running":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">进行中</Badge>;
      case "failed":
        return <Badge variant="destructive">失败</Badge>;
      case "pending":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">等待中</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  const getStatusIcon = (status: ScanTask["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "running":
        return <Clock className="h-4 w-4 text-blue-600 animate-spin" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const totalScans = scanTasks.length;
  const runningScans = scanTasks.filter(task => task.status === 'running').length;
  const completedScans = scanTasks.filter(task => task.status === 'completed').length;
  const failedScans = scanTasks.filter(task => task.status === 'failed').length;

  return (
    <div className="space-y-6 pb-8">
      {/* 头部 - 参考组织列表页面 */}
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">扫描总览</h1>
        <p className="text-muted-foreground">管理和监控所有扫描任务</p>
      </div>

      {/* 关键指标卡片 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">总扫描次数</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalScans}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">进行中</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{runningScans}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">已完成</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedScans}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">失败</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{failedScans}</div>
          </CardContent>
        </Card>
      </div>

      {/* 操作栏 - 参考组织列表页面 */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mt-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="搜索扫描任务..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="扫描类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有类型</SelectItem>
              {[...new Set(mockScanTasks.map(task => task.type))].map(type => (
                <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有状态</SelectItem>
              <SelectItem value="pending">等待中</SelectItem>
              <SelectItem value="running">进行中</SelectItem>
              <SelectItem value="completed">已完成</SelectItem>
              <SelectItem value="failed">失败</SelectItem>
            </SelectContent>
          </Select>
          <Button href="/scan/create">
            <Plus className="h-4 w-4 mr-2" />
            新建扫描
          </Button>
        </div>
      </div>
      
      {/* 主要内容 - 使用 DataStateWrapper */}
      <Card>
        <CardContent className="p-0">
          <DataStateWrapper
            state={viewState}
            loadingText="正在加载扫描任务..."
            emptyIcon={BarChart3}
            emptyTitle="未找到扫描任务"
            emptyDescription={searchTerm || statusFilter !== "all" || typeFilter !== "all" ? "请尝试调整搜索或筛选条件" : "开始创建您的第一个扫描任务"}
            emptyAction={{
              label: "新建扫描",
              href: "/scan/create",
            }}
            errorStatusCode={500}
            errorTitle="加载失败"
            errorDescription={error || "获取扫描任务数据时发生错误，请重试"}
            showRetry={true}
            onRetry={() => setViewState("data")}
            hasData={filteredTasks.length > 0}
          >
            <DataTable />
          </DataStateWrapper>
        </CardContent>
      </Card>

      {/* 分页控件 */}
      <Card>
        <CardContent className="py-4">
          {viewState === "data" && filteredTasks.length > 0 && (
            <TablePagination
              currentPage={currentPage}
              totalItems={filteredTasks.length}
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
              您确定要删除扫描任务 "{taskToDelete?.name}" 吗？此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">确认删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 