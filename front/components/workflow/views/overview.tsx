'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, 
  Workflow,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Users,
  Calendar,
  Eye,
  Settings
} from "lucide-react";

// 模拟工作流统计数据
const workflowStats = {
  totalWorkflows: 25,
  activeWorkflows: 18,
  runningWorkflows: 3,
  pausedWorkflows: 4,
  totalRuns: 1247,
  successfulRuns: 1089,
  failedRuns: 158,
  avgExecutionTime: 8.5, // 分钟
  workflowGrowth: 15.2,
  runGrowth: 22.8,
  successRate: 87.3
};

// 最近执行的工作流
const recentRuns = [
  {
    id: "RUN-001",
    workflowName: "域名安全扫描",
    status: "success",
    startTime: "2024-01-15 14:30:00",
    duration: "5分32秒",
    target: "example.com",
    user: "张三"
  },
  {
    id: "RUN-002", 
    workflowName: "漏洞检测流程",
    status: "running",
    startTime: "2024-01-15 14:25:00",
    duration: "运行中",
    target: "test.org",
    user: "李四"
  },
  {
    id: "RUN-003",
    workflowName: "子域名发现",
    status: "failed",
    startTime: "2024-01-15 14:20:00", 
    duration: "2分15秒",
    target: "sample.net",
    user: "王五"
  },
  {
    id: "RUN-004",
    workflowName: "端口扫描工作流",
    status: "success",
    startTime: "2024-01-15 14:15:00",
    duration: "12分08秒", 
    target: "192.168.1.0/24",
    user: "赵六"
  },
  {
    id: "RUN-005",
    workflowName: "Web应用安全检测",
    status: "success",
    startTime: "2024-01-15 14:10:00",
    duration: "18分45秒",
    target: "webapp.com",
    user: "钱七"
  }
];

// 工作流分类统计
const workflowCategories = [
  { category: "网络扫描", count: 8, percentage: 32 },
  { category: "漏洞检测", count: 6, percentage: 24 },
  { category: "信息收集", count: 5, percentage: 20 },
  { category: "安全评估", count: 4, percentage: 16 },
  { category: "报告生成", count: 2, percentage: 8 }
];

// 热门工作流
const popularWorkflows = [
  { name: "域名安全扫描", runs: 156, lastRun: "2024-01-15 14:30:00", success: 94 },
  { name: "漏洞检测流程", runs: 134, lastRun: "2024-01-15 14:25:00", success: 89 },
  { name: "子域名发现", runs: 98, lastRun: "2024-01-14 16:20:00", success: 96 },
  { name: "端口扫描工作流", runs: 87, lastRun: "2024-01-14 10:15:00", success: 92 },
  { name: "Web应用安全检测", runs: 72, lastRun: "2024-01-13 09:10:00", success: 85 }
];

export default function WorkflowOverviewPage() {

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'running':
        return <Clock className="h-4 w-4 text-blue-600 animate-pulse" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-800">成功</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">失败</Badge>;
      case 'running':
        return <Badge className="bg-blue-100 text-blue-800">运行中</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">未知</Badge>;
    }
  };

  const getTrendIcon = (growth: number) => {
    return growth >= 0 ? (
      <ArrowUpRight className="h-4 w-4 text-green-600" />
    ) : (
      <ArrowDownRight className="h-4 w-4 text-red-600" />
    );
  };

  return (
    <div className="space-y-6 pb-8">
      {/* 页面头部 */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">工作流概况</h1>
          <p className="mt-1 text-sm text-gray-600">
            查看工作流运行状态、执行历史和统计信息
          </p>
        </div>
        <div className="flex space-x-2">
          <Button>
            <Workflow className="h-4 w-4 mr-2" />
            创建工作流
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">工作流总数</CardTitle>
            <Workflow className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workflowStats.totalWorkflows}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {getTrendIcon(workflowStats.workflowGrowth)}
              <span className="ml-1">
                +{workflowStats.workflowGrowth}% 较上月
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">执行总次数</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workflowStats.totalRuns}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {getTrendIcon(workflowStats.runGrowth)}
              <span className="ml-1">
                +{workflowStats.runGrowth}% 较上月
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">成功率</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workflowStats.successRate}%</div>
            <div className="text-xs text-muted-foreground">
              {workflowStats.successfulRuns}/{workflowStats.totalRuns} 次成功
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均执行时间</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workflowStats.avgExecutionTime}分钟</div>
            <div className="text-xs text-muted-foreground">
              基于最近100次执行
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 主要内容区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧两列 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 最近执行记录 */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>最近执行记录</CardTitle>
                <Button variant="outline" size="sm">
                  查看全部
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentRuns.map((run) => (
                  <div key={run.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(run.status)}
                      <div>
                        <div className="font-medium text-sm">{run.workflowName}</div>
                        <div className="text-xs text-gray-500">
                          目标: {run.target} • 执行者: {run.user}
                        </div>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      {getStatusBadge(run.status)}
                      <div className="text-xs text-gray-500">
                        开始时间: {run.startTime}
                      </div>
                      <div className="text-xs text-gray-500">
                        耗时: {run.duration}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 工作流分类统计 */}
          <Card>
            <CardHeader>
              <CardTitle>工作流分类统计</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {workflowCategories.map((item) => (
                  <div key={item.category} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="font-medium">{item.category}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">{item.count}</span>
                      <Badge variant="outline">{item.percentage}%</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右侧边栏 */}
        <div className="space-y-6">
          {/* 工作流状态分布 */}
          <Card>
            <CardHeader>
              <CardTitle>工作流状态</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Play className="h-4 w-4 text-green-600" />
                    <span className="text-sm">运行中</span>
                  </div>
                  <Badge className="bg-green-100 text-green-800">
                    {workflowStats.runningWorkflows}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-blue-600" />
                    <span className="text-sm">活跃</span>
                  </div>
                  <Badge className="bg-blue-100 text-blue-800">
                    {workflowStats.activeWorkflows}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Pause className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm">暂停</span>
                  </div>
                  <Badge className="bg-yellow-100 text-yellow-800">
                    {workflowStats.pausedWorkflows}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 热门工作流 */}
          <Card>
            <CardHeader>
              <CardTitle>热门工作流</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {popularWorkflows.map((workflow, index) => (
                  <div key={workflow.name} className="flex items-center justify-between p-2 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{workflow.name}</div>
                        <div className="text-xs text-gray-500">
                          {workflow.runs} 次执行 • {workflow.success}% 成功 • 最后运行: {workflow.lastRun}
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 快速操作 */}
          <Card>
            <CardHeader>
              <CardTitle>快速操作</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button className="w-full" size="sm">
                  <Workflow className="h-4 w-4 mr-2" />
                  创建工作流
                </Button>
                <Button variant="outline" className="w-full" size="sm">
                  <Calendar className="h-4 w-4 mr-2" />
                  计划任务
                </Button>
                <Button variant="outline" className="w-full" size="sm">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  执行报告
                </Button>
                <Button variant="outline" className="w-full" size="sm">
                  <Users className="h-4 w-4 mr-2" />
                  权限管理
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}