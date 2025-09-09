// 节点工厂 - 根据组件类型创建节点数据

import {
  SecurityToolBlockEnum,
  ExecutionType,
  type SecurityNode,
  type CustomToolNodeType,
  type WorkflowStartNodeType,
  type WorkflowEndNodeType
} from '../../canvas/libs/types'
import { PREDEFINED_SECURITY_TOOLS } from './constants'
import type { WorkflowComponent } from './workflow.types'
import { generateNodeId, generateEdgeId } from './id-generator';


// 不再需要基础节点数据模板，字段直接在节点根级别设置

/**
 * 创建工作流开始节点
 */
export function createStartNode(position: { x: number; y: number }): SecurityNode<WorkflowStartNodeType> {
  return {
    id: 'start_node',
    type: SecurityToolBlockEnum.Start,
    position,
    title: '开始',
    description: '工作流开始节点',
    execution_type: ExecutionType.CONTROL_START,
    data: {
      title: '开始',
      description: '工作流开始节点',
    },
  }
}

/**
 * 创建工作流结束节点
 */
export function createEndNode(position: { x: number; y: number }): SecurityNode<WorkflowEndNodeType> {
  return {
    id: 'end_node',
    type: SecurityToolBlockEnum.End,
    position,
    title: '结束',
    description: '工作流结束节点',
    execution_type: ExecutionType.CONTROL_END,
    data: {
      title: '结束',
      description: '工作流结束节点',
      output_config: {
        save_results: true
      }
    },
  }
}

/**
 * 创建自定义工具节点（从预定义工具）
 */
export function createCustomToolNode(
  toolName: string,
  position: { x: number; y: number },
  existingNodes?: SecurityNode[] // 新增参数：已存在的节点列表
): SecurityNode<CustomToolNodeType> {
  // 简化：直接使用预设配置
  const toolConfigs: Record<string, any> = {
    nmap: {
      name: 'Nmap 端口扫描',
      description: '网络端口扫描工具',
      category: '端口扫描',
      commandTemplate: 'nmap -sS -T4 -p 1-1000 {target}',
      outputFormat: 'json',
      placeholders: ['{target}']
    }
  }

  const config = toolConfigs[toolName]
  if (!config) {
    throw new Error(`Unknown tool: ${toolName}`)
  }

  // 计算相同工具的节点数量，用于编号
  let nodeTitle = config.name
  if (existingNodes) {
    const sameToolNodes = existingNodes.filter(node => {
      if (node.type === SecurityToolBlockEnum.CustomTool) {
        const nodeData = node.data as any
        return nodeData.title && nodeData.title.startsWith(config.name)
      }
      return false
    })
    
    if (sameToolNodes.length > 0) {
      nodeTitle = `${config.name} #${sameToolNodes.length + 1}`
    }
  }

  // 生成基于类型的节点ID
  const existingIds = existingNodes?.map(node => node.id) || []
  const nodeId = generateNodeId(SecurityToolBlockEnum.CustomTool, existingIds)

  // 初始化空的参数映射对象，只在实际绑定时才添加映射
  const initialParameterMappings: any = {}

  return {
    id: nodeId,
    type: SecurityToolBlockEnum.CustomTool,
    position,
    title: nodeTitle,
    description: config.description,
    execution_type: ExecutionType.COMMAND_EXEC,
    data: {
      title: nodeTitle, // 在 data 中也保存 title
      description: config.description, // 在 data 中也保存 description
      category: config.category,
      command_template: config.commandTemplate, // 使用 snake_case
      placeholders: config.placeholders,
      parameter_mappings: initialParameterMappings, // 使用对象格式的参数映射
    },
  }
}

/**
 * 创建自定义组件节点（从组件库拖拽）
 */
export function createCustomComponentNode(
  component: WorkflowComponent,
  position: { x: number; y: number },
  existingNodes?: SecurityNode[] // 新增参数：已存在的节点列表
): SecurityNode<CustomToolNodeType> {
  // 计算相同组件的节点数量，用于编号
  let nodeTitle = component.name
  if (existingNodes) {
    const sameComponentNodes = existingNodes.filter(node => {
      // 检查是否是同一个组件
      if (node.type === SecurityToolBlockEnum.CustomTool) {
        const nodeData = node.data as any
        return nodeData.component_id === component.id ||
               (nodeData.title && nodeData.title.startsWith(component.name))
      }
      return false
    })

    if (sameComponentNodes.length > 0) {
      nodeTitle = `${component.name} #${sameComponentNodes.length + 1}`
    }
  }

  // 生成基于类型的节点ID
  const existingIds = existingNodes?.map(node => node.id) || []
  const nodeId = generateNodeId(SecurityToolBlockEnum.CustomTool, existingIds)

  // 初始化空的参数映射对象，只在实际绑定时才添加映射
  const initialParameterMappings: any = {}

  return {
    id: nodeId,
    type: SecurityToolBlockEnum.CustomTool,
    position,
    title: nodeTitle,
    description: component.description,
    execution_type: ExecutionType.COMMAND_EXEC,
    data: {
      title: nodeTitle, // 在 data 中也保存 title，确保 React Flow 能传递
      description: component.description, // 在 data 中也保存 description
      component_id: component.id, // 保留原始组件ID用于引用，使用 snake_case
      category: component.category,
      command_template: component.commandTemplate, // 使用 snake_case
      placeholders: component.placeholders || [],
      parameter_mappings: initialParameterMappings, // 使用对象格式的参数映射
    },
  }
}

// 主节点工厂函数
export function createNodeByType(
  componentId: string,
  position: { x: number; y: number },
  componentData?: WorkflowComponent,
  existingNodes?: SecurityNode[] // 新增参数
): SecurityNode | null {
  switch (componentId) {
    case 'start':
      // 检查是否已存在开始节点
      if (existingNodes?.some(node => node.id === 'start_node')) {
        console.warn('开始节点已存在，无法重复创建')
        return null
      }
      return createStartNode(position)
    case 'end':
      // 检查是否已存在结束节点
      if (existingNodes?.some(node => node.id === 'end_node')) {
        console.warn('结束节点已存在，无法重复创建')
        return null
      }
      return createEndNode(position)
    default:
      // 如果提供了组件数据，使用API组件创建节点
      if (componentData) {
        return createCustomComponentNode(componentData, position, existingNodes)
      }
      // 检查是否是预定义的安全工具
      if (componentId in PREDEFINED_SECURITY_TOOLS) {
        return createCustomToolNode(componentId, position, existingNodes)
      }
      // 如果是UUID格式，说明是自定义组件但没有传递componentData
      // 这种情况下我们需要抛出更有用的错误信息
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (uuidRegex.test(componentId)) {
        throw new Error(`Custom component data missing for UUID: ${componentId}. Please ensure component data is passed when dragging custom components.`)
      }
      throw new Error(`Unknown component type: ${componentId}`)
  }
}

// 获取组件信息（用于UI显示）
export function getComponentInfo(componentId: string, componentData?: WorkflowComponent) {
  switch (componentId) {
    case 'start':
      return { name: '开始', description: '工作流开始节点', category: 'basic' }
    case 'end':
      return { name: '结束', description: '工作流结束节点', category: 'basic' }
    default:
      // 如果提供了组件数据，使用API组件信息
      if (componentData) {
        return {
          name: componentData.name,
          description: componentData.description,
          category: componentData.category
        }
      }
      // 否则查找预定义工具
      const toolConfig = PREDEFINED_SECURITY_TOOLS[componentId as keyof typeof PREDEFINED_SECURITY_TOOLS]
      return toolConfig ? {
        name: toolConfig.toolName,
        description: toolConfig.description,
        category: 'custom'
      } : null
  }
}
