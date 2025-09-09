/**
 * 工作流组件库管理页面
 * 
 * 功能说明：
 * - 展示和管理工作流中可用的自定义安全工具组件
 * - 提供搜索、分类筛选、状态筛选功能
 * - 支持查看组件详情、启用/禁用组件、添加新组件
 * - 使用表格形式展示组件列表，包含名称、描述、版本、状态等信息
 * 
 * 页面结构：
 * 1. 页面头部：标题和描述
 * 2. 操作栏：搜索框、筛选下拉菜单、添加组件按钮
 * 3. 统计信息：活跃组件数量、总组件数量等
 * 4. 组件列表表格：展示所有组件的详细信息
 * 
 * @author Xingra Team
 * @version 1.0.0
 */

'use client';

import { useState, useEffect } from 'react';
import { api, getErrorMessage } from "@/lib/api-client";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableCell, TableRow, TableHead } from "@/components/ui/table";
import {
  Search,
  Plus,
  Play,
  Pause,
  Terminal,
  Shield,
  Network,
  Bug,
  Eye,
  Database,
  FileText,
  MoreHorizontal,
  Trash2,
  Loader2,
  AlertCircle
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

import { WorkflowComponent, ComponentStatistics, ApiResponse } from "@/types/workflow";
import { TablePagination } from "@/components/common/table-pagination";



// 状态筛选选项
const statusOptions = ['全部', 'active', 'inactive'];

/**
 * 工作流组件列表页面主组件
 * 
 * 状态管理：
 * - searchTerm: 搜索关键词
 * - selectedCategory: 选中的分类筛选
 * - statusFilter: 状态筛选（全部/active/inactive）
 * - components: 从API获取的组件列表
 * - loading: 数据加载状态
 * - error: 错误信息
 * - currentPage: 当前页码
 * - itemsPerPage: 每页显示数量
 */
export default function WorkflowComponentsList() {
  // 搜索关键词状态
  const [searchTerm, setSearchTerm] = useState('');
  
  // 分类筛选状态
  const [selectedCategory, setSelectedCategory] = useState('全部');
  
  // 状态筛选状态
  const [statusFilter, setStatusFilter] = useState('全部');

  // 组件列表数据状态
  const [components, setComponents] = useState<WorkflowComponent[]>([]);
  // 加载状态
  const [loading, setLoading] = useState(true);
  // 错误状态
  const [error, setError] = useState<string | null>(null);
  // 统计信息状态
  const [statistics, setStatistics] = useState<ComponentStatistics | null>(null);
  // 分类列表状态
  const [categories, setCategoriesData] = useState<string[]>(['全部']);

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // 计算总页数和总条目数
  const totalItems = (components || []).length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // 获取组件列表的异步函数
  const getComponents = async () => {
    try {
      setLoading(true);
      setError(null);

      // 使用新的 API 客户端，并行获取组件列表、统计信息和分类
      const [componentsResponse, statisticsResponse, categoriesResponse] = await Promise.all([
        api.get('/workflow/components'),
        api.get('/workflow/components/statistics'),
        api.get('/workflow/components/categories')
      ]);

      // API 响应数据处理

      // 数据已经自动转换为 camelCase
      if (componentsResponse.data.code === 'SUCCESS') {
        setComponents(componentsResponse.data.data || []);
      } else {
        throw new Error(componentsResponse.data.message || '获取组件列表失败');
      }

      if (statisticsResponse.data.code === 'SUCCESS') {
        setStatistics(statisticsResponse.data.data);
      }

      if (categoriesResponse.data.code === 'SUCCESS') {
        setCategoriesData(['全部', ...(categoriesResponse.data.data?.categories || [])]);
      }

    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getComponents();
  }, []);

  // 切换组件状态（启用/禁用）
  const toggleComponentStatus = async (componentId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active';

      // 使用新的统一 POST API
      const response = await api.post('/workflow/components/toggle-status', {
        componentId: componentId,
        status: newStatus
      });

      if (response.data.code === 'SUCCESS') {
        // 更新本地状态
        setComponents(prev =>
          prev.map(comp =>
            comp.id === componentId
              ? { ...comp, status: newStatus as 'active' | 'inactive' }
              : comp
          )
        );
        // 重新获取统计信息
        getComponents();

        // 通知其他页面刷新组件数据
        window.dispatchEvent(new CustomEvent('workflow-components-updated', {
          detail: { action: 'status-change', componentId, newStatus }
        }));
      } else {
        throw new Error(response.data.message || '更新组件状态失败');
      }
    } catch (err) {
      console.error('切换组件状态失败:', err);
      toast.error(getErrorMessage(err));
    }
  };

  // 删除组件
  const deleteComponent = async (componentId: string, componentName: string) => {
    if (!confirm(`确定要删除组件 "${componentName}" 吗？此操作不可撤销。`)) {
      return;
    }

    try {
      // 使用新的统一 POST API
      const response = await api.post('/workflow/components/delete', {
        componentId: componentId
      });

      if (response.data.code === 'SUCCESS') {
        // 从本地状态中移除组件
        setComponents(prev => prev.filter(comp => comp.id !== componentId));
        // 重新获取统计信息
        getComponents();

        // 通知其他页面刷新组件数据
        // 使用自定义事件来通知其他页面
        window.dispatchEvent(new CustomEvent('workflow-components-updated', {
          detail: { action: 'delete', componentId, componentName }
        }));

        toast.success('组件删除成功');
      } else {
        throw new Error(response.data.message || '删除组件失败');
      }
    } catch (err) {
      console.error('删除组件失败:', err);
      toast.error(getErrorMessage(err));
    }
  };

  /**
   * 组件过滤逻辑
   * 根据搜索关键词、分类和状态进行多重过滤
   *
   * @returns {WorkflowComponent[]} 过滤后的组件列表
   */
  const filteredComponents = (components || []).filter(component => {
    // 防御性编程：确保组件对象和必要字段存在
    if (!component || !component.name /* || !component.description */) {
      return false;
    }

    // 搜索匹配：名称或描述包含关键词（不区分大小写）
    const matchesSearch = component.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         component.description.toLowerCase().includes(searchTerm.toLowerCase());

    // 分类匹配：全部分类或匹配选中分类
    const matchesCategory = selectedCategory === '全部' || component.category === selectedCategory;

    // 状态匹配：全部状态或匹配选中状态
    const matchesStatus = statusFilter === '全部' || component.status === statusFilter;

    // 只有同时满足所有条件的组件才会被显示
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // 应用分页
  const paginatedComponents = filteredComponents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  /**
   * 根据组件状态返回对应的中文文本
   *
   * @param {string} status - 组件状态
   * @returns {string} 状态的中文显示文本
   */
  const getStatusText = (status: string) => {
    return status === 'active' ? '已启用' : '已禁用';
  };

  /**
   * 根据组件状态返回对应的样式类名
   *
   * @param {string} status - 组件状态 ('active' | 'inactive')
   * @returns {string} Tailwind CSS类名
   */
  const getStatusColor = (status: string) => {
    return status === 'active'
      ? 'bg-green-100 text-green-800'  // 启用状态：绿色背景
      : 'bg-gray-100 text-gray-800';   // 禁用状态：灰色背景
  };

  // 状态显示组件
  const LoadingState = () => (
    <div className="flex items-center justify-center py-12">
      <div className="flex items-center space-x-2">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-muted-foreground">正在加载组件数据...</span>
      </div>
    </div>
  );

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="rounded-full bg-muted p-3 mb-4">
        <Search className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">未找到组件</h3>
      <p className="text-muted-foreground text-center mb-4">
        {searchTerm ? "请尝试调整搜索条件" : "暂无可用组件，请添加新组件"}
      </p>
      <Button size="sm" href="/workflow/components/add">
        <Plus className="h-4 w-4 mr-2" />
        添加组件
      </Button>
    </div>
  );

  const ErrorState = () => (
    <div className="flex flex-col items-center justify-center py-12 text-red-500">
      <AlertCircle className="h-8 w-8 mb-4" />
      <h3 className="text-lg font-semibold mb-2">加载失败</h3>
      <p className="text-muted-foreground text-center mb-4">
        {error || "获取组件数据时发生错误，请重试"}
      </p>
      <Button onClick={getComponents} size="sm">
        重试
      </Button>
    </div>
  );

  return (
    <div className="space-y-6 pb-8">
        {/* 页面头部区域 */}
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">组件库管理</h1>
          <p className="text-muted-foreground">管理和配置工作流中使用的自定义安全工具组件</p>
        </div>

        {/* 操作栏：搜索、筛选、添加功能 */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mt-6">
          {/* 搜索框 */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="text"
              placeholder="搜索组件名称或描述..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* 筛选和操作按钮组 */}
          <div className="flex gap-2">
            {/* 分类筛选 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  分类: {selectedCategory}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {categories.map((category) => (
                  <DropdownMenuItem
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* 状态筛选 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  状态: {statusFilter === '全部' ? '全部' : getStatusText(statusFilter)}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setStatusFilter('全部')}>
                  全部
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('active')}>
                  已启用
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setStatusFilter('inactive')}>
                  已禁用
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* 添加新组件按钮 */}
            <Button size="sm" href="/workflow/components/add">
              <Plus className="h-4 w-4 mr-2" />
              添加组件
            </Button>
          </div>
        </div>

        {/* 统计信息卡片 */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{statistics?.total || 0}</div>
                <p className="text-xs text-muted-foreground">总组件数</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">{statistics?.active || 0}</div>
                <p className="text-xs text-muted-foreground">已启用</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-gray-600">{statistics?.inactive || 0}</div>
                <p className="text-xs text-muted-foreground">已禁用</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{statistics.byCategory?.length || 0}</div>
                <p className="text-xs text-muted-foreground">分类数量</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 组件列表表格 */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <LoadingState />
            ) : error ? (
              <ErrorState />
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="h-8 px-4 py-1 text-sm font-medium">组件名称</TableHead>
                      <TableHead className="hidden md:table-cell h-8 px-4 py-1 text-sm font-medium">组件描述</TableHead>
                      <TableHead className="h-8 px-4 py-1 text-sm font-medium">分类</TableHead>
                      <TableHead className="h-8 px-4 py-1 text-sm font-medium">状态</TableHead>
                      <TableHead className="hidden sm:table-cell h-8 px-4 py-1 text-sm font-medium">创建时间</TableHead>
                      <TableHead className="hidden sm:table-cell h-8 px-4 py-1 text-sm font-medium">更新时间</TableHead>
                      <TableHead className="text-right h-8 px-4 py-1 text-sm font-medium">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedComponents.length > 0 ? (
                      paginatedComponents.map((component) => {
                        return (
                          <TableRow key={component.id}>
                            <TableCell className="px-3 py-2">
                              <div className="font-medium">{component.name}</div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell px-3 py-2">
                              <div className="text-sm text-muted-foreground line-clamp-2">
                                {component.description}
                              </div>
                            </TableCell>
                            <TableCell className="px-3 py-2">
                              <Badge variant="secondary">
                                {component.category}
                              </Badge>
                            </TableCell>
                            <TableCell className="px-3 py-2">
                              <Badge className={getStatusColor(component.status)}>
                                {getStatusText(component.status)}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell px-3 py-2">
                              {component.createdAt ? new Date(component.createdAt).toLocaleString("zh-CN", {
                                year: "numeric",
                                month: "numeric",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                                hour12: false,
                              }) : 'N/A'}
                            </TableCell>
                            <TableCell className="hidden sm:table-cell px-3 py-2">
                              {component.updatedAt ? new Date(component.updatedAt).toLocaleString("zh-CN", {
                                year: "numeric",
                                month: "numeric",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                                hour12: false,
                              }) : 'N/A'}
                            </TableCell>
                            <TableCell className="text-right px-3 py-2">
                              <div className="flex justify-end space-x-2">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                      <MoreHorizontal className="h-4 w-4" />
                                      <span className="sr-only">打开菜单</span>
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem asChild>
                                      <Button variant="ghost" size="sm" href={`/workflow/components/view/${component.id}`} className="w-full justify-start p-2 h-auto">
                                        <Eye className="h-4 w-4 mr-2" />
                                        查看
                                      </Button>
                                    </DropdownMenuItem>
                                    {/* 启用/禁用操作 */}
                                    <DropdownMenuItem onClick={() => toggleComponentStatus(component.id, component.status)}>
                                      {component.status === 'active' ? (
                                        <Pause className="h-4 w-4 mr-2" />
                                      ) : (
                                        <Play className="h-4 w-4 mr-2" />
                                      )}
                                      {component.status === 'active' ? '禁用' : '启用'}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => deleteComponent(component.id, component.name)}
                                      className="text-red-600 focus:text-red-600"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      删除
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      /* 空状态显示 - 使用正确的表格行结构 */
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          <EmptyState />
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 分页控件 */}
        <Card>
          <CardContent className="py-4">
            {filteredComponents.length > 0 && (
              <TablePagination
                currentPage={currentPage}
                totalItems={filteredComponents.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                onItemsPerPageChange={setItemsPerPage}
              />
            )}
          </CardContent>
        </Card>
      </div>
  );
}