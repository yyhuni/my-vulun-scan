'use client';

import { useState, useEffect } from 'react';
import { api, getErrorMessage } from "@/lib/api-client";
import { useParams } from 'next/navigation';
import AppLayout from "@/components/layout/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Save,
  ArrowLeft,
  Download,
  HelpCircle,
  Check,
  Copy,
  Play,
  Settings,
  Terminal,
  Workflow,
  Eye,
  Bug,
  Square,
  Loader2
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { IconSelector } from "@/components/ui/icon-selector";

import { WorkflowComponent, CreateComponentRequest } from "@/components/workflow/lib/workflow.types";
import { ApiResponse } from "@/types/api.types";
import { useNavigation } from '@/hooks/use-navigation';
import { useToast } from "@/hooks/use-toast";
import { getWorkflowIcon, type WorkflowIconName } from "@/lib/icons/workflow-icons";
import { AnsiUp } from 'ansi_up';

// 组件类型选项
const componentTypes = [
  '网络扫描',
  '漏洞扫描', 
  '信息收集',
  'Web扫描',
  '数据库扫描',
  '代码分析',
  '其他'
];

export default function WorkflowAddComponentPage() {
  const params = useParams();
  const { navigate } = useNavigation();
  const { toast } = useToast();
  const componentId = params.id as string;
  const isViewMode = !!componentId; // 如果有 id 参数，则为查看模式

  // 组件数据状态
  const [component, setComponent] = useState<WorkflowComponent | null>(null);
  const [loading, setLoading] = useState(isViewMode);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);


  const [formData, setFormData] = useState({
    name: isViewMode ? '' : '',
    category: isViewMode ? '' : '',
    description: isViewMode ? '' : '',
    icon: 'Terminal' as WorkflowIconName,
    command: isViewMode ? '' : '',
    status: 'active' as 'active' | 'inactive',
  });

  // 测试功能相关状态
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [testParameters, setTestParameters] = useState<Record<string, string>>({});
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [testLogs, setTestLogs] = useState<string[]>([]);
  const [testProcess, setTestProcess] = useState<any>(null);
  const [testExecutionId, setTestExecutionId] = useState<string | null>(null);
  const [logsEndRef, setLogsEndRef] = useState<HTMLDivElement | null>(null);

  const breadcrumbItems = [
    { name: "工作流", href: "/workflow/overview" },
    { name: "组件库管理", href: "/workflow/components" },
    { name: isViewMode ? "查看组件" : "添加组件", current: true },
  ];

  const handleBack = () => {
    navigate('/workflow/components');
  };

  // 获取组件详情（查看模式）
  const getComponentDetails = async () => {
    if (!isViewMode || !componentId) return;

    try {
      setLoading(true);
      setError(null);

      // 使用新的 API 客户端，自动转换 snake_case 为 camelCase
      const response = await api.get(`/workflow/components/${componentId}`);

      if (response.data.code !== 'SUCCESS') {
        throw new Error(response.data.message || '获取组件详情失败');
      }

      const data = response.data.data;
      setComponent(data);

      // 填充表单数据
      setFormData({
        name: data.name,
        category: data.category,
        description: data.description,
        icon: data.icon,
        command: data.commandTemplate,  // 已经是 camelCase
        status: data.status,
      });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // 页面加载时获取数据
  useEffect(() => {
    if (isViewMode) {
      getComponentDetails();
    }
  }, [componentId, isViewMode]);

  // 清理函数：组件卸载时停止测试进程
  useEffect(() => {
    return () => {
      if (testProcess) {
        clearInterval(testProcess);
        setTestProcess(null);
      }
    };
  }, []); // 移除依赖，只在组件卸载时执行

  // 自动滚动到底部
  useEffect(() => {
    if (logsEndRef) {
      logsEndRef.scrollIntoView({ behavior: 'smooth' });
    }
  }, [testLogs, logsEndRef]);

  // UUID 生成函数
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
  }



  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    // 表单验证
    if (!formData.name.trim()) {
      toast({
        title: "验证失败",
        description: "请输入组件名称",
        variant: "destructive",
      });
      return;
    }

    if (!formData.category.trim()) {
      toast({
        title: "验证失败",
        description: "请选择组件类型",
        variant: "destructive",
      });
      return;
    }

    if (!formData.command.trim()) {
      toast({
        title: "验证失败",
        description: "请输入执行命令",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);

      const requestData = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        category: formData.category,
        icon: formData.icon,
        commandTemplate: formData.command.trim(),  // 前端使用 camelCase，会自动转换为 command_template
        status: formData.status,
      };

      let response;
      if (isViewMode && componentId) {
        // 更新现有组件
        response = await api.post('/workflow/components/update', {
          componentId: componentId,
          ...requestData
        });
      } else {
        // 创建新组件
        response = await api.post('/workflow/components/create', requestData);
      }

      if (response.data.code !== 'SUCCESS') {
        throw new Error(response.data.message || `${isViewMode ? '更新' : '创建'}组件失败`);
      }

      toast({
        title: "操作成功",
        description: `组件${isViewMode ? '更新' : '创建'}成功`,
      });

      // 通知其他页面刷新组件数据
      window.dispatchEvent(new CustomEvent('workflow-components-updated', {
        detail: {
          action: isViewMode ? 'update' : 'create',
          componentId: isViewMode ? componentId : response.data.data?.id,
          componentName: formData.name
        }
      }));

      // 如果是创建模式，跳转到组件列表
      if (!isViewMode) {
        navigate('/workflow/components');
      } else {
        // 如果是编辑模式，更新本地数据
        setComponent(response.data.data);
      }

    } catch (err) {
      console.error(`${isViewMode ? '更新' : '保存'}组件失败:`, err);
      toast({
        title: "操作失败",
        description: getErrorMessage(err),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const SelectedIconComponent = getWorkflowIcon(formData.icon);

  // 测试功能处理函数
  const handleTestComponent = () => {
    const placeholders = parseCommand(formData.command);
    if (placeholders.length > 0) {
      // 初始化参数
      const initialParams: Record<string, string> = {};
      placeholders.forEach(placeholder => {
        const paramName = placeholder.replace(/[{}]/g, '');
        initialParams[paramName] = '';
      });
      setTestParameters(initialParams);
    }
    setTestDialogOpen(true);
  };

  const handleRunTest = async () => {
    if (!formData.command.trim()) {
      toast({
        title: "错误",
        description: "请先输入命令模板",
        variant: "destructive",
      });
      return;
    }

    // 验证所有参数都已填写
    const placeholders = parseCommand(formData.command);
    const missingParams = placeholders.filter(placeholder => {
      const paramName = placeholder.replace(/[{}]/g, '');
      return !testParameters[paramName]?.trim();
    });

    if (missingParams.length > 0) {
      toast({
        title: "参数缺失",
        description: `请填写以下参数: ${missingParams.join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    try {
      setIsTestRunning(true);
      setTestLogs([]);
      
      // 替换命令中的占位符
      let finalCommand = formData.command;
      Object.entries(testParameters).forEach(([key, value]) => {
        finalCommand = finalCommand.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
      });

      // 添加初始日志
      setTestLogs(prev => [...prev, `开始执行命令: ${finalCommand}`]);

      const executionId = generateUUID();
      const nodeId = 'test-component-node'; // 固定节点ID用于测试
      setTestExecutionId(executionId);

      // 调用后端API启动命令
      const response = await api.post('/execution/start', {
        execution_id: executionId,
        node_id: nodeId,
        command: finalCommand,
      });

      if (response.data.status !== 'started') {
        throw new Error(response.data.message || '启动命令失败');
      }

      setTestLogs(prev => [...prev, `命令启动成功，执行ID: ${executionId}`]);

      // 开始轮询日志
      const pollInterval = setInterval(() => pollLogsAndStatus(executionId, nodeId), 500); // 每0.5秒轮询一次
      setTestProcess(pollInterval);


    } catch (error) {
      setTestLogs(prev => [...prev, `错误: ${getErrorMessage(error)}`]);
      setIsTestRunning(false);
    }
  };

  const handleStopTest = async () => {
    if (!testExecutionId) return;

    if (testProcess) {
      clearInterval(testProcess);
      setTestProcess(null);
    }

    try {
      const nodeId = 'test-component-node';
      await api.post(`/execution/${testExecutionId}/stop`, { node_id: nodeId });
      setTestLogs(prev => [...prev, `命令停止请求已发送`]);
    } catch (error) {
      setTestLogs(prev => [...prev, `停止命令失败: ${getErrorMessage(error)}`]);
    }

    setIsTestRunning(false);
    setTestExecutionId(null);
  };

  // 新增：同时轮询日志和状态
  const pollLogsAndStatus = async (executionId: string, nodeId: string) => {
    try {
      // 拉日志
      const logRes = await api.get(`/execution/log?executionId=${executionId}&nodeId=${nodeId}&lines=1000`);
      if (logRes.data && logRes.data.lines) setTestLogs(logRes.data.lines);

      // 拉状态
      const infoRes = await api.get(`/execution/${executionId}/info?nodeId=${nodeId}`);
      const status = infoRes.data.status;
      if (status === 'success') {
        if (testProcess) clearInterval(testProcess);
        setTestProcess(null);
        setIsTestRunning(false);
        setTestExecutionId(null);
        setTestLogs(prev => [...prev, '命令执行完成']);
      } else if (status === 'failed') {
        if (testProcess) clearInterval(testProcess);
        setTestProcess(null);
        setIsTestRunning(false);
        setTestExecutionId(null);
        setTestLogs(prev => [...prev, `命令执行失败: ${infoRes.data.error || ''}`]);
      } else if (status === 'not_found') {
        if (testProcess) clearInterval(testProcess);
        setTestProcess(null);
        setIsTestRunning(false);
        setTestExecutionId(null);
        setTestLogs(prev => [...prev, '未找到任务']);
      }
      // running 状态下继续轮询
    } catch (error) {
      // 错误处理
      setTestLogs(prev => [...prev, `日志或状态拉取失败: ${getErrorMessage(error)}`]);
    }
  };

  const handleClearLogs = () => {
    setTestLogs([]);
  };

  // 识别命令中的占位符（只支持固定的两个）
  const parseCommand = (command: string) => {
    // 使用正则表达式匹配 {xxx} 格式的占位符
    const placeholderRegex = /\{([^}]+)\}/g;
    const placeholders: string[] = [];
    let match;

    while ((match = placeholderRegex.exec(command)) !== null) {
      const placeholder = match[0]; // 完整的占位符，如 {domain}
      if (!placeholders.includes(placeholder)) {
        placeholders.push(placeholder);
      }
    }

    return placeholders;
  };

  // 加载状态
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center space-x-2">
          <Terminal className="h-6 w-6 animate-spin" />
          <span className="text-muted-foreground">正在加载组件详情...</span>
        </div>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-red-500">
        <Bug className="h-8 w-8 mb-4" />
        <h3 className="text-lg font-semibold mb-2">加载失败</h3>
        <p className="text-muted-foreground text-center mb-4">{error}</p>
        <div className="flex space-x-2">
          <Button onClick={getComponentDetails} size="sm">
            重试
          </Button>
          <Button onClick={() => window.history.back()} variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回
          </Button>
        </div>
      </div>
    );
  }

  // 渲染终端输出时，支持 ANSI 彩色
  const ansi_up = new AnsiUp();

  return (
    <div className="space-y-4 pb-4">
        {/* 页面头部 */}
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={handleBack} disabled={saving}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回列表
          </Button>
          <div className="flex items-center space-x-2">
            {/* 测试按钮 - 只在有命令时显示 */}
            {formData.command.trim() && (
              <Button
                variant="outline"
                onClick={handleTestComponent}
                disabled={saving || loading}
              >
                <Play className="mr-2 h-4 w-4" />
                测试组件
              </Button>
            )}
          <Button
            onClick={handleSave}
            disabled={saving || loading}
          >
            {saving ? (
              <>
                <Save className="mr-2 h-4 w-4 animate-spin" />
                保存中...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                {isViewMode ? '更新组件' : '保存组件'}
              </>
            )}
          </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* 左侧表单区域 */}
          <div className="lg:col-span-2 space-y-4">
            {/* 卡片一: 核心定义 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-base">
                  <Settings className="h-4 w-4 mr-2" />
                  核心定义
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-3 space-y-1.5">
                    <Label htmlFor="name" className="text-sm font-medium">
                      组件名称 <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="例如: Nmap 扫描器"
                      className="h-8"
                    />
                  </div>

                  <div className="md:col-span-2 space-y-1.5">
                    <Label htmlFor="category" className="text-sm font-medium">
                      组件类型 <span className="text-red-500">*</span>
                    </Label>
                    <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="请选择类型" />
                      </SelectTrigger>
                      <SelectContent>
                        {componentTypes.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">选择图标</Label>
                    <IconSelector
                      value={formData.icon}
                      onValueChange={(iconName) => handleInputChange('icon', iconName)}
                      className="h-8"
                    />
                  </div>

                  <div className="md:col-span-3 space-y-1.5">
                    <Label htmlFor="description" className="text-sm font-medium">
                      组件描述
                    </Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="详细描述该组件的功能和用途..."
                      rows={3}
                      className="resize-none text-sm"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 卡片二: 行为配置 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-base">
                  <Terminal className="h-4 w-4 mr-2" />
                  行为配置
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {/* 命令配置 section */}
                <div className="space-y-3">
                  <Label htmlFor="command" className="text-sm font-medium flex items-center">
                     <Workflow className="h-4 w-4 mr-2" /> 执行命令 <span className="text-red-500 ml-1">*</span>
                  </Label>
                  <Textarea
                    id="command"
                    value={formData.command}
                    onChange={(e) => handleInputChange('command', e.target.value)}
                    placeholder="例如: subfinder -d {domain} -o {output_file}"
                    rows={3}
                    className="font-mono text-sm resize-none"
                  />
                  <div className="flex items-start space-x-2 text-xs text-muted-foreground">
                    <HelpCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <p>使用 {`{参数名}`} 格式定义占位符，系统会自动识别</p>
                    </div>
                  </div>

                  {/* 识别到的占位符显示 */}
                  {parseCommand(formData.command).length > 0 && (
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="text-sm font-medium text-blue-800 mb-2">
                        识别到的占位符 ({parseCommand(formData.command).length} 个):
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {parseCommand(formData.command).map((placeholder, index) => (
                          <Badge key={index} variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                            {placeholder}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 右侧预览区域 */}
          <div className="lg:col-span-1 space-y-4">
            {/* 组件预览卡片 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-base">
                  <Eye className="h-4 w-4 mr-2" />
                  实时预览
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start space-x-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600">
                    <SelectedIconComponent className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm">{formData.name || '组件名称'}</h3>
                    <p className="text-xs text-muted-foreground">{formData.category || '组件类型'}</p>
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {formData.description || '这里是组件的描述信息，会显示在组件列表中。'}
                </p>
              </CardContent>
            </Card>

            {/* 命令预览 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-base">
                  <Terminal className="h-4 w-4 mr-2" />
                  命令模板预览
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div>
                  <h4 className="text-sm font-medium mb-2">模板命令:</h4>
                  <div className="bg-slate-900 text-slate-100 p-2 rounded-lg font-mono text-xs">
                    <div className="flex items-center space-x-1 mb-1">
                      <div className="w-2 h-2 rounded-full bg-red-500"></div>
                      <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    </div>
                    <div className="text-green-400">$ {formData.command || '请输入命令模板'}</div>
                  </div>
                </div>

                {/* 占位符说明 */}
                {parseCommand(formData.command).length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">占位符说明:</h4>
                    <div className="space-y-1">
                      {parseCommand(formData.command).map((placeholder, index) => (
                        <div key={index} className="flex items-center justify-between text-xs p-1.5 bg-muted rounded">
                          <Badge variant="secondary" className="text-xs">
                            {placeholder}
                          </Badge>
                          <span className="text-muted-foreground text-xs">
                            用户指定
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 配置总结 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-base">
                  <Check className="h-4 w-4 mr-2" />
                  配置总结
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">组件名称:</span>
                    <span className="font-medium text-xs">{formData.name || '未设置'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">组件类型:</span>
                    <span className="font-medium text-xs">{formData.category || '未设置'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">占位符数量:</span>
                    <span className="font-medium text-xs">{parseCommand(formData.command).length} 个</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* 测试组件对话框 */}
        <Dialog open={testDialogOpen} onOpenChange={setTestDialogOpen}>
          <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col p-0">
            <DialogHeader className="border-b pb-3 px-6 pt-6">
              <DialogTitle className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg mr-3">
                  <Terminal className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">测试组件</h2>
                  <p className="text-sm text-muted-foreground">{formData.name}</p>
                </div>
              </DialogTitle>
            </DialogHeader>
            
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 overflow-hidden px-6 py-4">
                            {/* 左侧：参数配置 */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium mb-3">参数配置</h3>
                  <div className="space-y-3">
                    {parseCommand(formData.command).map((placeholder, index) => {
                      const paramName = placeholder.replace(/[{}]/g, '');
                      return (
                        <div key={index} className="space-y-1">
                          <Label htmlFor={paramName} className="text-sm">
                            {placeholder}
                          </Label>
                          <Input
                            id={paramName}
                            value={testParameters[paramName] || ''}
                            onChange={(e) => setTestParameters(prev => ({
                              ...prev,
                              [paramName]: e.target.value
                            }))}
                            placeholder={`请输入 ${paramName} 的值`}
                            className="h-8 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 命令预览 */}
                <div>
                  <h3 className="text-sm font-medium mb-2">命令预览</h3>
                  <div className="bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-sm">
                    <div className="text-green-400">
                      $ {(() => {
                        let cmd = formData.command;
                        Object.entries(testParameters).forEach(([key, value]) => {
                          if (value.trim()) {
                            cmd = cmd.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
                          }
                        });
                        return cmd;
                      })()}
                    </div>
                  </div>
                </div>

                {/* 控制按钮 */}
                <div className="flex space-x-2">
                  <Button
                    onClick={handleRunTest}
                    disabled={isTestRunning || parseCommand(formData.command).some(placeholder => {
                      const paramName = placeholder.replace(/[{}]/g, '');
                      return !testParameters[paramName]?.trim();
                    })}
                    className="flex-1"
                  >
                    {isTestRunning ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        运行中...
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        运行测试
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleStopTest}
                    disabled={!isTestRunning}
                    variant="outline"
                  >
                    <Square className="mr-2 h-4 w-4" />
                    停止
                  </Button>
                </div>
              </div>

                            {/* 右侧：终端输出 */}
              <div className="flex flex-col space-y-2 overflow-hidden">
                <div className="flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-medium">终端输出</h3>
                    {isTestRunning && (
                      <div className="flex items-center space-x-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-xs text-green-600">运行中</span>
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={handleClearLogs}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  >
                    清空日志
                  </Button>
                </div>
                
                <div className="flex-1 bg-black rounded-lg p-3 font-mono text-sm overflow-hidden flex flex-col min-h-0">
                  <ScrollArea className="flex-1 text-gray-100">
                    {testLogs.length > 0 ? (
                      <div className="space-y-1">
                        {testLogs.map((log, index) => (
                          <div key={index} className="text-xs break-all" style={{ color: '#e5e7eb' }} dangerouslySetInnerHTML={{ __html: ansi_up.ansi_to_html(log) }} />
                        ))}
                        <div ref={setLogsEndRef} />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        <div className="text-center">
                          <Terminal className="h-8 w-8 mx-auto mb-2" />
                          <p className="text-sm">等待命令执行...</p>
                        </div>
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </div>
             </div>
             
             {/* 状态信息 */}
             <div className="border-t pt-3 mt-4 px-6 pb-6">
               <div className="flex items-center justify-end text-xs text-muted-foreground">
                 <div className="text-xs text-muted-foreground">
                   日志总数: {testLogs.length}
                 </div>
               </div>
             </div>
           </DialogContent>
         </Dialog>
      </div>
  );
}