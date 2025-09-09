/**
 * 工作流节点ID生成工具
 * 生成有意义且可读的节点ID
 */

// 节点计数器，用于生成序号
const nodeCounters: Record<string, number> = {}

/**
 * 重置所有计数器
 */
export function resetNodeCounters() {
  Object.keys(nodeCounters).forEach(key => {
    nodeCounters[key] = 0
  })
}

/**
 * 根据组件名称生成有意义的节点ID
 * @param componentName 组件名称，如 "nmap", "subfinder", "masscan"
 * @returns 生成的节点ID，如 "nmap_001", "subfinder_002"
 */
export function generateNodeId(componentName: string): string {
  // 清理组件名称，移除特殊字符，转换为小写
  const cleanName = componentName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')

  // 获取当前计数器值
  if (!nodeCounters[cleanName]) {
    nodeCounters[cleanName] = 0
  }
  
  nodeCounters[cleanName]++
  
  // 生成格式化的ID
  const sequence = nodeCounters[cleanName].toString().padStart(3, '0')
  return `${cleanName}_${sequence}`
}

/**
 * 生成边的ID
 * @param sourceId 源节点ID
 * @param targetId 目标节点ID
 * @returns 边ID，格式为 "source_to_target"
 */
export function generateEdgeId(sourceId: string, targetId: string): string {
  return `${sourceId}_to_${targetId}`
}

/**
 * 检查ID是否已存在
 * @param id 要检查的ID
 * @param existingIds 已存在的ID列表
 * @returns 如果ID已存在则返回新的ID，否则返回原ID
 */
export function ensureUniqueId(id: string, existingIds: string[]): string {
  if (!existingIds.includes(id)) {
    return id
  }
  
  // 如果ID已存在，添加数字后缀
  let counter = 1
  let newId = `${id}_${counter}`
  
  while (existingIds.includes(newId)) {
    counter++
    newId = `${id}_${counter}`
  }
  
  return newId
}

/**
 * 从组件数据生成节点ID
 * @param component 工作流组件
 * @param existingIds 已存在的ID列表
 * @returns 唯一的节点ID
 */
export function generateUniqueNodeId(
  component: { name: string }, 
  existingIds: string[] = []
): string {
  const baseId = generateNodeId(component.name)
  return ensureUniqueId(baseId, existingIds)
}
