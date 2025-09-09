
import { useCallback, useState } from 'react';
import { UseWorkflowReturn } from './use-workflow';
import { Connection, addEdge } from '@xyflow/react'
import {
  type SecurityNode,
  type SecurityEdge,
  SecurityToolBlockEnum,
} from '@/components/canvas/libs/types'
import { smartLayoutNodes } from '@/components/workflow/lib/layout'
import { generateEdgeId } from '@/components/workflow/lib/id-generator'

type AddLogFunction = (level: 'info' | 'success' | 'warning' | 'error', message: string, nodeId?: string, nodeName?: string) => void;

/**
 * 自定义 Hook，用于处理工作流中的各种事件
 * @param workflow - 工作流状态管理对象
 * @param addLog - 日志记录函数
 * @param onNodeSelect - 外部节点选择回调
 */
export function useWorkflowEvents(
  workflow: UseWorkflowReturn,
  addLog: AddLogFunction,
  onNodeSelect?: (nodeId: string | null) => void
) {
  const [showNodeDetail, setShowNodeDetail] = useState(false);

  /**
   * 关闭节点详情面板
   */
  const handleCloseNodeDetail = useCallback(() => {
    setShowNodeDetail(false);
    workflow.selectNode(null);
    onNodeSelect?.(null);
  }, [workflow, onNodeSelect]);

  /**
   * 删除节点
   */
  const handleNodeDelete = useCallback((nodeId: string) => {
    const node = workflow.nodes.find(n => n.id === nodeId);
    if (!node) return;

    // 直接执行删除
    workflow.deleteNode(nodeId);
    handleCloseNodeDetail();
    addLog('warning', `已删除节点: ${node.title}`);
  }, [workflow, handleCloseNodeDetail, addLog]);

  /**
   * 添加节点
   */
  const handleAddNode = useCallback((node: SecurityNode) => {
    workflow.addNode(node);
    addLog('info', `添加节点: ${node.data.title}`);
  }, [workflow, addLog]);

  /**
   * 智能自动布局
   */
  const handleAutoLayout = useCallback(async () => {
    if (workflow.nodes.length === 0) {
      addLog('warning', '没有节点需要布局');
      return;
    }
    addLog('info', '🎨 开始智能布局整理...');
    try {
      const layoutedNodes = await smartLayoutNodes(workflow.nodes, workflow.edges);
      layoutedNodes.forEach(node => {
        workflow.updateNode(node.id, { position: node.position });
      });
      addLog('success', '✨ 布局整理完成');
    } catch (error) {
      const errorMessage = (error as Error).message;
      addLog('error', `❌ 智能布局失败: ${errorMessage}`);
    }
  }, [workflow, addLog]);

  /**
   * 节点点击
   */
  const handleNodeClick = useCallback((event: React.MouseEvent, node: SecurityNode) => {
    workflow.selectNode(node.id);
    setShowNodeDetail(true);
    onNodeSelect?.(node.id);
  }, [workflow, onNodeSelect]);

  /**
   * 画布点击
   */
  const handlePaneClick = useCallback(() => {
    workflow.selectNode(null);
    setShowNodeDetail(false);
    onNodeSelect?.(null);
  }, [workflow, onNodeSelect]);

  /**
   * 节点连接
   */
  const handleConnect = useCallback((connection: any) => {
    if (!connection.source || !connection.target) {
      addLog('warning', '无效的连接');
      return;
    }
    const sourceNode = workflow.nodes.find(n => n.id === connection.source);
    const targetNode = workflow.nodes.find(n => n.id === connection.target);
    if (!sourceNode || !targetNode) {
      addLog('error', '连接失败：找不到节点');
      return;
    }
    
    // 使用统一的边ID生成函数
    const edgeId = generateEdgeId(connection.source, connection.target);

    const newEdge = {
      id: edgeId,
      source: connection.source,
      target: connection.target,
      type: 'edge',
    };
    workflow.addEdge(newEdge);
    addLog('info', `🔗 连接节点: ${sourceNode.data.title} → ${targetNode.data.title}`);
  }, [workflow, addLog]);

  return {
    showNodeDetail,
    handleCloseNodeDetail,
    handleNodeDelete,
    handleAddNode,
    handleAutoLayout,
    handleNodeClick,
    handlePaneClick,
    handleConnect,
  };
}
