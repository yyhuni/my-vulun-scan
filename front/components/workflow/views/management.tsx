'use client';

import { useState, useEffect, useCallback } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Plus,
  Edit,
  Play,
  Pause,
  Trash2,
  MoreHorizontal,
  Calendar,
  User,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  RotateCcw
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import DataStateWrapper, { DataViewState } from "@/components/common/data-state-wrapper";
import { TablePagination } from "@/components/common/table-pagination";
import { formatDateTime } from "@/lib/utils";
import { workflowAPI } from "../../canvas/services/workflow-api";
import { api, getErrorMessage } from '@/lib/api-client';
import type { WorkflowListItem } from '../lib/workflow.types'

export default function WorkflowManagementPage() {
  const { toast } = useToast();

  // 状态管理 - 参考组织列表页面
  const [workflows, setWorkflows] = useState<WorkflowListItem[]>([]);
  const [viewState, setViewState] = useState<DataViewState>("loading");
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [workflowToDelete, setWorkflowToDelete] = useState<WorkflowListItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 加载工作流数据
  const loadWorkflows = useCallback(async () => {
    try {
      setViewState("loading");
      setError(null);

      console.log('=== 开始加载工作流列表 ===');

      const data = await workflowAPI.getWorkflows();

      console.log('=== 工作流列表加载成功 ===');
      console.log('工作流数量:', data.length);
      console.log('工作流数据:', data);

      setWorkflows(data);
      setViewState(data.length > 0 ? "data" : "empty");

    } catch (error) {
      console.error('加载工作流列表失败:', error);
      const errorMessage = error instanceof Error ? error.message : '加载失败';
      setError(errorMessage);
      setViewState("error");
      toast({
        title: "加载失败",
        description: errorMessage,
        variant: "destructive"
      });
    }
  }, [toast]);

  // 组件挂载时加载数据
  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  // 辅助函数 - 参考组织列表页面

  const handleDelete = (workflow: WorkflowListItem) => {
    setWorkflowToDelete(workflow);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!workflowToDelete) return;

    try {
      // 调用后端API删除工作流
      const response = await api.post('/workflow/delete', {
        workflow_id: workflowToDelete.id
      });

      if (response.data.code === 'SUCCESS') {
        // 从本地状态中移除工作流
        setWorkflows(prev => prev.filter(w => w.id !== workflowToDelete.id));

        // 通知其他页面刷新工作流数据
        window.dispatchEvent(new CustomEvent('workflow-data-updated', {
          detail: { action: 'delete', workflowId: workflowToDelete.id, workflowName: workflowToDelete.name }
        }));

        toast({
          title: "删除成功",
          description: `工作流 "${workflowToDelete.name}" 已被删除`,
        });
      } else {
        throw new Error(response.data.message || '删除工作流失败');
      }
    } catch (err) {
      console.error('删除工作流失败:', err);
      toast({
        title: "删除失败",
        description: getErrorMessage(err),
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setWorkflowToDelete(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />活跃</Badge>;
      case 'paused':
        return <Badge className="bg-yellow-100 text-yellow-800"><Pause className="h-3 w-3 mr-1" />暂停</Badge>;
      case 'running':
        return <Badge className="bg-blue-100 text-blue-800"><Play className="h-3 w-3 mr-1" />运行中</Badge>;
      case 'error':
        return <Badge className="bg-red-100 text-red-800"><AlertCircle className="h-3 w-3 mr-1" />错误</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">未知</Badge>;
    }
  };

  // 数据过滤和分页 - 参考组织列表页面
  const filteredWorkflows = workflows.filter(workflow => {
    const matchesSearch = workflow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (workflow.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         workflow.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || workflow.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredWorkflows.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedWorkflows = filteredWorkflows.slice(startIndex, startIndex + itemsPerPage);

  // 数据表格组件 - 参考组织列表页面
  const DataTable = () => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="h-8 px-4 py-1 text-sm font-medium">工作流名称</TableHead>
            <TableHead className="hidden md:table-cell h-8 px-4 py-1 text-sm font-medium">描述</TableHead>
            <TableHead className="hidden xl:table-cell h-8 px-4 py-1 text-sm font-medium">创建时间</TableHead>
            <TableHead className="w-[50px] h-8 px-4 py-1 text-sm font-medium"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedWorkflows.map((workflow) => (
            <TableRow key={workflow.id}>
              <TableCell className="px-3 py-2">
                <div className="space-y-1">
                  <div className="font-medium text-sm">
                    {workflow.name}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">
                    ID: {workflow.id}
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell px-3 py-2">
                <div className="text-sm text-muted-foreground line-clamp-2" title={workflow.description || ''}>
                  {workflow.description || '-'}
                </div>
              </TableCell>
              <TableCell className="hidden xl:table-cell px-3 py-2">
                <div className="text-sm text-muted-foreground">
                  {formatDateTime(workflow.createdAt)}
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
                    <DropdownMenuItem asChild>
                      <Button variant="ghost" size="sm" href={`/workflow/edit/${workflow.id}`} className="w-full justify-start p-2 h-auto">
                        <Edit className="h-4 w-4 mr-2" />
                        编辑工作流
                      </Button>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-red-600 focus:text-red-600"
                      onClick={() => handleDelete(workflow)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      删除工作流
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

  return (
    <div className="space-y-6 pb-8">
      {/* 头部 - 参考组织列表页面 */}
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">工作流</h1>
        <p className="text-muted-foreground">管理和监控所有工作流的运行状态</p>
      </div>

      {/* 操作栏 - 参考组织列表页面 */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mt-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="搜索工作流..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex items-center space-x-2">
          {/* 状态筛选 */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有状态</SelectItem>
              <SelectItem value="active">活跃</SelectItem>
              <SelectItem value="paused">暂停</SelectItem>
              <SelectItem value="running">运行中</SelectItem>
              <SelectItem value="error">错误</SelectItem>
            </SelectContent>
          </Select>
          <Button href="/workflow/edit">
            <Plus className="h-4 w-4 mr-2" />
            新建工作流
          </Button>
        </div>
      </div>

      {/* 主要内容 - 使用 DataStateWrapper */}
      <Card>
        <CardContent className="p-0">
       <DataStateWrapper
         state={viewState}
            loadingText="正在加载工作流..."
            emptyIcon={Play}
            emptyTitle="未找到工作流"
            emptyDescription={searchTerm || statusFilter !== "all" ? "请尝试调整搜索或筛选条件" : "开始创建您的第一个工作流"}
            emptyAction={{
              label: "创建工作流",
              href: "/workflow/edit",
            }}
            errorStatusCode={500}
            errorTitle="加载失败"
            errorDescription={error || "获取工作流数据时发生错误，请重试"}
            showRetry={true}
            onRetry={loadWorkflows}
            hasData={filteredWorkflows.length > 0}
       >
         <DataTable />
            </DataStateWrapper>
        </CardContent>
      </Card>

      {/* 分页控件 */}
      <Card>
        <CardContent className="py-4">
          {viewState === "data" && filteredWorkflows.length > 0 && (
          <TablePagination
            currentPage={currentPage}
              totalItems={filteredWorkflows.length}
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
            <AlertDialogTitle>确认删除？</AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销。工作流 "{workflowToDelete?.name}" 将被永久删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}