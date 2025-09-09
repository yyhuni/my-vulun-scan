
import { useEffect, useRef } from 'react';
import { UseWorkflowReturn } from './use-workflow';
import { SecurityNode, WorkflowStartNodeType, WorkflowEndNodeType, SecurityToolBlockEnum, ExecutionType } from '../libs/types';
import { v4 as uuidv4 } from 'uuid';

type AddLogFunction = (level: 'info' | 'success' | 'warning' | 'error', message: string, nodeId?: string, nodeName?: string) => void;

/**
 * 自定义 Hook，用于初始化工作流，例如添加默认节点
 * @param workflow - 工作流状态管理对象
 * @param addLog - 日志记录函数
 */
export function useWorkflowInitializer(
  workflow: UseWorkflowReturn,
  addLog: AddLogFunction
) {
  const initializedRef = useRef(false);

  useEffect(() => {
    // 强制清除所有硬编码ID的节点
    const hasOldNodes = workflow.nodes.some(node =>
      node.id === 'start-1' || node.id === 'end-1'
    );

    if (hasOldNodes) {
      // 清除所有节点
      workflow.nodes.forEach(node => {
        if (node.id === 'start-1' || node.id === 'end-1') {
          workflow.deleteNode(node.id);
        }
      });
    }

    // 只在创建新工作流时自动添加开始节点，不添加结束节点
    // 结束节点由用户手动拖拽添加，避免强制的工作流结构
    if (workflow.nodes.length === 0 && !initializedRef.current) {
      initializedRef.current = true;

      const startNodeId = 'start_node';

      const startNode: SecurityNode<WorkflowStartNodeType> = {
        id: startNodeId,
        type: SecurityToolBlockEnum.Start,
        position: { x: 100, y: 200 },
        title: '开始',
        description: '工作流开始节点',
        execution_type: ExecutionType.CONTROL_START,
        data: {
          title: '开始',
          description: '工作流开始节点',
        },
      };

      workflow.addNode(startNode);

      addLog('info', '工作流编辑器已初始化');
      addLog('info', `已添加开始节点: ${startNodeId}`);
      addLog('info', '💡 提示：从左侧工具库拖拽组件到画布上构建工作流');
    }
  }, [workflow.nodes.length]); // 只依赖节点数量
}
