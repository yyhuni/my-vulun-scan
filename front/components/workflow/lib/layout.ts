// 工作流自动布局工具 - 使用 dagre 图布局算法

import type { SecurityNode, SecurityEdge } from '../../canvas/libs/types'
import { SecurityToolBlockEnum } from '../../canvas/libs/types'

// 布局配置
const LAYOUT_CONFIG = {
  rankdir: 'LR', // 从左到右排列
  align: 'UL',   // 上左对齐
  nodesep: 80,   // 节点间距
  ranksep: 200,  // 层级间距
  marginx: 50,   // 左右边距
  marginy: 50,   // 上下边距
}

// 节点默认尺寸
const NODE_SIZE = {
  width: 200,
  height: 100,
}

// 动态导入 dagre
async function getDagre() {
  const dagre = await import('dagre')
  return dagre.default
}

// 自动布局函数
export async function autoLayoutNodes(
  nodes: SecurityNode[], 
  edges: SecurityEdge[]
): Promise<SecurityNode[]> {
  if (nodes.length === 0) return nodes

  const dagre = await getDagre()
  
  // 创建 dagre 图
  const graph = new dagre.graphlib.Graph()
  graph.setDefaultEdgeLabel(() => ({}))
  graph.setGraph(LAYOUT_CONFIG)

  // 添加节点到图中
  nodes.forEach(node => {
    graph.setNode(node.id, {
      width: NODE_SIZE.width,
      height: NODE_SIZE.height,
    })
  })

  // 添加边到图中
  edges.forEach(edge => {
    graph.setEdge(edge.source, edge.target)
  })

  // 执行布局算法
  dagre.layout(graph)

  // 应用布局结果到节点
  const layoutedNodes = nodes.map(node => {
    const graphNode = graph.node(node.id)
    
    return {
      ...node,
      position: {
        x: graphNode.x - NODE_SIZE.width / 2,
        y: graphNode.y - NODE_SIZE.height / 2,
      },
    }
  })

  return layoutedNodes
}

// 简单的分层布局（按节点类型）
export function simpleLayoutNodes(nodes: SecurityNode[]): SecurityNode[] {
  if (nodes.length === 0) return nodes

  const HORIZONTAL_SPACING = 300
  const VERTICAL_SPACING = 150
  const START_X = 100
  const START_Y = 200

  // 按类型分组
  const startNodes = nodes.filter(node => 
    node.data.type === SecurityToolBlockEnum.Start
  )
  const endNodes = nodes.filter(node => 
    node.data.type === SecurityToolBlockEnum.End
  )
  const customNodes = nodes.filter(node => 
    node.data.type === SecurityToolBlockEnum.CustomTool
  )
  const otherNodes = nodes.filter(node => 
    node.data.type !== SecurityToolBlockEnum.Start && 
    node.data.type !== SecurityToolBlockEnum.End &&
    node.data.type !== SecurityToolBlockEnum.CustomTool
  )

  const layoutedNodes = [...nodes]

  // 布局开始节点（第一列）
  startNodes.forEach((node, index) => {
    const nodeIndex = layoutedNodes.findIndex(n => n.id === node.id)
    if (nodeIndex !== -1) {
      layoutedNodes[nodeIndex] = {
        ...node,
        position: {
          x: START_X,
          y: START_Y + index * VERTICAL_SPACING
        }
      }
    }
  })

  // 布局自定义工具节点（第二列）
  customNodes.forEach((node, index) => {
    const nodeIndex = layoutedNodes.findIndex(n => n.id === node.id)
    if (nodeIndex !== -1) {
      layoutedNodes[nodeIndex] = {
        ...node,
        position: {
          x: START_X + HORIZONTAL_SPACING,
          y: START_Y + index * VERTICAL_SPACING
        }
      }
    }
  })

  // 布局其他节点（第三列）
  otherNodes.forEach((node, index) => {
    const nodeIndex = layoutedNodes.findIndex(n => n.id === node.id)
    if (nodeIndex !== -1) {
      layoutedNodes[nodeIndex] = {
        ...node,
        position: {
          x: START_X + HORIZONTAL_SPACING * 2,
          y: START_Y + index * VERTICAL_SPACING
        }
      }
    }
  })

  // 布局结束节点（最后一列）
  endNodes.forEach((node, index) => {
    const nodeIndex = layoutedNodes.findIndex(n => n.id === node.id)
    if (nodeIndex !== -1) {
      layoutedNodes[nodeIndex] = {
        ...node,
        position: {
          x: START_X + HORIZONTAL_SPACING * 3,
          y: START_Y + index * VERTICAL_SPACING
        }
      }
    }
  })

  return layoutedNodes
}

// 智能布局（结合连接关系）
export async function smartLayoutNodes(
  nodes: SecurityNode[], 
  edges: SecurityEdge[]
): Promise<SecurityNode[]> {
  // 如果有连接关系，使用 dagre 布局
  if (edges.length > 0) {
    return await autoLayoutNodes(nodes, edges)
  }
  
  // 否则使用简单分层布局
  return simpleLayoutNodes(nodes)
} 