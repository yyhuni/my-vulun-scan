
/**
 * 工作流编辑器主组件
 */

'use client'

import React, { useCallback, useState } from 'react'
import { ReactFlowProvider } from '@xyflow/react'

import {
  NodeRunningStatus,
  type SecurityNode,
  type SecurityEdge,
  type CustomToolNodeType,
  type WorkflowStartNodeType,
  type WorkflowEndNodeType,
  type WorkflowVariable,
} from '@/components/canvas/libs/types'

import { useWorkflowLogs } from '@/components/canvas/hooks/use-workflow-logs'
import { useWorkflowExecution } from '@/components/canvas/hooks/use-workflow-execution'

import { useWorkflowInitializer } from '@/components/canvas/hooks/use-workflow-initializer'
import { workflowAPI, type CreateWorkflowRequest } from '@/components/canvas/services/workflow-api'
import { generateEdgeId } from '@/components/workflow/lib/id-generator'
import { Canvas } from './canvas'
import { Toolbar } from './canvas-toolbar'
import { SaveDialog } from '@/components/canvas/dialogs/save-dialog'

import { type UseWorkflowReturn } from '@/components/canvas/hooks/use-workflow'

/**
 * 工作流编辑器组件属性接口
 */
export interface WorkflowEditorProps {
  workflow: UseWorkflowReturn;
  workflowId?: string;
  isReadOnly?: boolean;
  onNodeSelect?: (nodeId: string | null) => void;
  onLogToggle?: () => void;
}

/**
 * 🎯 工作流编辑器主组件
 */
export function WorkflowEditor({
  workflow,
  isReadOnly = false,
  onNodeSelect,
  onLogToggle,
}: WorkflowEditorProps) {

  const workflowLogs = useWorkflowLogs();
  const addLog = workflowLogs.addLog;
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const { workflowStatus, handleStart, handleStop } = useWorkflowExecution(workflow, addLog);

  /**
   * 清理节点对象中的UI相关字段
   * 注意：不保存position字段，加载时使用自动布局
   * 移除data中重复的title和description字段
   */
  const cleanNodeData = useCallback((node: SecurityNode) => {
    const {
      width,
      height,
      selected,
      dragging,
      measured,
      position, // 不保存位置信息
      ...cleanNode
    } = node;

    // 清理data中的重复字段并优化参数映射结构
    let cleanData = cleanNode.data;
    if (cleanData && typeof cleanData === 'object') {
      const { title: dataTitle, description: dataDescription, ...restData } = cleanData as any;

      // 转换参数映射为新的对象结构
      if (restData.parameter_mappings && Array.isArray(restData.parameter_mappings)) {
        const newParameterMappings: any = {};
        restData.parameter_mappings.forEach((mapping: any) => {
          const paramName = mapping.placeholder.replace(/[{}]/g, ''); // 移除大括号
          newParameterMappings[paramName] = {
            source: mapping.value.includes('.') ? 'node_output' : 'global_variable',
            value: mapping.value,
            type: mapping.type,
          };
        });
        restData.parameter_mappings = newParameterMappings; // 保持 snake_case 命名
      }

      cleanData = restData;
    }

    return {
      id: cleanNode.id,
      type: cleanNode.type,
      title: cleanNode.title,
      description: cleanNode.description,
      execution_type: cleanNode.execution_type,
      data: cleanData,
    };
  }, []);

  /**
   * 清理连接线对象
   * 使用source和target拼接生成有意义的边ID
   */
  const cleanEdgeData = useCallback((edge: SecurityEdge) => {
    return {
      id: generateEdgeId(edge.source, edge.target), // 使用source和target生成有意义的ID
      source: edge.source,
      target: edge.target,
      type: edge.type,
      data: edge.data,
    };
  }, []);
  
  // 处理添加节点
  const handleAddNode = useCallback((node: SecurityNode) => {
    workflow.addNode(node);
    addLog('success', `添加节点: ${node.title}`, node.id, node.title);
  }, [workflow, addLog]);

  // 处理自动布局 (暂时移除，因为没有这个方法)
  const handleAutoLayout = useCallback(() => {
    addLog('info', '自动布局功能暂未实现');
  }, [addLog]);

  // 处理节点点击
  const handleNodeClick = useCallback((event: React.MouseEvent, node: SecurityNode) => {
    onNodeSelect?.(node.id);
  }, [onNodeSelect]);

  // 处理画布点击
  const handlePaneClick = useCallback(() => {
    onNodeSelect?.(null);
  }, [onNodeSelect]);

  // 处理连接
  const handleConnect = useCallback((connection: any) => {
    const sourceNode = workflow.nodes.find(n => n.id === connection.source);
    const targetNode = workflow.nodes.find(n => n.id === connection.target);

    if (!sourceNode || !targetNode) return;

    // 使用统一的边ID生成函数
    const edgeId = generateEdgeId(connection.source, connection.target);

    const newEdge = {
      id: edgeId,
      source: connection.source,
      target: connection.target,
      type: 'edge',
    };
    workflow.addEdge(newEdge);
    addLog('info', `🔗 连接节点: ${sourceNode.title} → ${targetNode.title}`);
  }, [workflow, addLog]);

  // 处理节点删除
  const handleNodeDelete = useCallback((nodeId: string) => {
    const node = workflow.nodes.find(n => n.id === nodeId);
    if (node) {
      workflow.deleteNode(nodeId);
      addLog('warning', `删除节点: ${node.title}`, nodeId, node.title);
    }
  }, [workflow, addLog]);

  useWorkflowInitializer(workflow, addLog);

  /**
   * 实际保存工作流的处理函数
   */
  const handleSaveWorkflow = useCallback(async (saveData: { name: string; description: string; category: string }) => {
    addLog('info', '正在保存工作流...');
    try {
      const cleanNodes = workflow.nodes.map(cleanNodeData);
      const cleanEdges = workflow.edges.map(cleanEdgeData);

      // 获取工作流级别的全局变量（从workflow状态中获取，而不是从开始节点）
      const variables = workflow.variables || [];

      // 清理开始节点中的variables字段（如果存在）
      const cleanedNodes = cleanNodes.map(node => {
        if (node.type === 'workflow-start' && node.data && 'variables' in node.data) {
          const { variables: _, ...cleanData } = node.data as any;
          return { ...node, data: cleanData };
        }
        return node;
      });

      // 生成工作流级别的时间字段
      const now = new Date().toISOString();

      const createWorkflowData: CreateWorkflowRequest = {
        name: saveData.name,
        description: saveData.description || '',
        category: saveData.category,
        created_at: now,
        updated_at: now,
        variables: variables,
        workflow_data: {
          nodes: cleanedNodes as any, // 清理后的节点不需要UI相关字段
          edges: cleanEdges,
        },
      };

      console.log('=== 保存工作流 - 发送的数据 ===');
      console.log('JSON数据:', JSON.stringify(createWorkflowData, null, 2));

      const result = await workflowAPI.createWorkflow(createWorkflowData);

      console.log('=== 保存工作流 - API响应 ===');
      console.log('响应结果:', result);

      addLog('success', `工作流 "${saveData.name}" 保存成功，ID: ${result.id}`);
    } catch (error) {
      console.error('保存工作流失败:', error);
      addLog('error', `保存失败: ${(error as Error).message}`);
      throw error;
    }
  }, [workflow, addLog, cleanNodeData, cleanEdgeData]);

  /**
   * 触发保存对话框
   */
  const handleSave = useCallback(() => {
    setShowSaveDialog(true);
  }, []);

  /**
   * 关闭保存对话框
   */
  const closeSaveDialog = useCallback(() => {
    setShowSaveDialog(false);
  }, []);

  const handleViewLogs = useCallback(() => {
    onLogToggle?.();
  }, [onLogToggle]);



  return (
    <div className="h-full w-full">
      <div className="relative h-full w-full">
        <ReactFlowProvider>
          <Canvas
            nodes={workflow.nodes}
            edges={workflow.edges}
            onNodesChange={workflow.onNodesChange}
            onEdgesChange={workflow.onEdgesChange}
            onConnect={handleConnect}
            onNodeClick={handleNodeClick}
            onPaneClick={handlePaneClick}
            onAddNode={handleAddNode}
            onNodeDelete={handleNodeDelete}
            readOnly={isReadOnly}
          />
          
          {/* 工作流控制工具栏 */}
          <Toolbar
            readOnly={isReadOnly}
            onLayout={handleAutoLayout}
            onLogToggle={onLogToggle}
            onSave={handleSave}
            onStart={handleStart}
            onStop={handleStop}
            onClear={workflow.clearWorkflow}
            workflowStatus={workflowStatus}
          />
        </ReactFlowProvider>
      </div>

      <SaveDialog
        isOpen={showSaveDialog}
        onClose={closeSaveDialog}
        onSave={handleSaveWorkflow}
        defaultName="安全扫描工作流"
        defaultDescription="自动化安全扫描流程"
        defaultCategory="网络扫描"
      />


    </div>
  );
}

export default WorkflowEditor;
