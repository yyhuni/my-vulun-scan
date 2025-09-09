import type { SecurityNode, WorkflowVariable } from '../workflow/lib/types'

/**
 * 可绑定参数接口定义
 * 表示一个节点中的可绑定参数信息
 */
export interface BindableParameter {
  /** 节点ID */
  nodeId: string
  /** 节点名称 */
  nodeName: string
  /** 可绑定的参数名称数组 */
  parameters: string[]
}

/**
 * 参数绑定状态接口定义
 * 表示一个参数的绑定状态信息
 */
export interface ParameterBinding {
  /** 是否已绑定 */
  isBound: boolean
  /** 绑定的变量名称（如果已绑定） */
  variableName?: string
  /** 绑定来源 */
  source?: string
  /** 参数类型 */
  type?: string
}

/**
 * 变量绑定信息接口定义
 * 表示一个变量在哪些节点和参数中被使用
 */
export interface VariableBinding {
  /** 节点ID */
  nodeId: string
  /** 节点名称 */
  nodeName: string
  /** 参数名称 */
  paramName: string
}

/**
 * 获取所有可绑定的节点参数
 *
 * 从所有节点中提取类型为 'custom-tool' 的节点，
 * 并返回它们的可绑定参数信息
 *
 * @param allNodes - 所有工作流节点
 * @returns 可绑定参数数组
 */
export function getBindableParameters(allNodes: SecurityNode[]): BindableParameter[] {
  const bindableParams: BindableParameter[] = []

  allNodes.forEach(node => {
    // 只处理自定义工具节点
    if (node.type === 'custom-tool') {
      const nodeData = node.data as any
      const placeholders = nodeData?.placeholders || []

      // 如果节点有占位符参数，则加入可绑定列表
      if (placeholders.length > 0) {
        bindableParams.push({
          nodeId: node.id,
          nodeName: nodeData?.title || node.title || '未命名节点',
          parameters: placeholders.map((p: string) => p.replace(/[{}]/g, '')) // 移除大括号
        })
      }
    }
  })

  return bindableParams
}

/**
 * 检查参数绑定状态
 *
 * 检查指定节点的指定参数是否已绑定到变量
 *
 * @param node - 目标节点
 * @param paramName - 参数名称
 * @param variables - 当前所有变量，用于验证绑定变量是否存在
 * @returns 参数绑定状态
 */
export function getParameterBindingStatus(
  node: SecurityNode,
  paramName: string,
  variables?: WorkflowVariable[]
): ParameterBinding {
  const parameterMappings = (node.data as any)?.parameter_mappings || {}
  const binding = parameterMappings[paramName]

  // 检查绑定是否存在且有有效的值（不为空字符串）
  if (binding && binding.value && binding.value.trim() !== '') {
    // 如果提供了变量列表，检查绑定的变量是否还存在
    if (variables) {
      const variableExists = variables.some(variable => variable.name === binding.value)
      if (!variableExists) {
        // 如果变量不存在，返回未绑定状态
        return { isBound: false }
      }
    }

    return {
      isBound: true,
      variableName: binding.value,
      source: binding.source,
      type: binding.type
    }
  }

  return { isBound: false }
}

/**
 * 获取变量的绑定信息
 *
 * 返回指定变量在哪些节点的哪些参数中被绑定
 *
 * @param variableName - 变量名称
 * @param allNodes - 所有工作流节点
 * @returns 变量绑定信息数组
 */
export function getVariableBindings(variableName: string, allNodes: SecurityNode[]): VariableBinding[] {
  const bindings: VariableBinding[] = []

  allNodes.forEach(node => {
    // 只处理自定义工具节点
    if (node.type === 'custom-tool') {
      const nodeData = node.data as any
      const parameterMappings = nodeData?.parameter_mappings || {}

      // 检查每个参数映射，如果绑定的是指定的变量，则加入结果
      Object.entries(parameterMappings).forEach(([paramName, mapping]: [string, any]) => {
        if (mapping?.value === variableName) {
          bindings.push({
            nodeId: node.id,
            nodeName: nodeData?.title || node.title || '未命名节点',
            paramName: paramName
          })
        }
      })
    }
  })

  return bindings
}

/**
 * 验证变量绑定状态
 *
 * 检查变量是否存在且仍然有效，如果变量不存在则清除相关绑定
 *
 * @param variableName - 变量名称
 * @param variables - 当前所有变量
 * @param allNodes - 所有工作流节点
 * @returns 清理后的节点更新函数数组
 */
export function validateVariableBindings(
  variableName: string,
  variables: WorkflowVariable[],
  allNodes: SecurityNode[]
): Array<{ nodeId: string; updates: any }> {
  const updates: Array<{ nodeId: string; updates: any }> = []

  // 检查变量是否存在
  const variableExists = variables.some(variable => variable.name === variableName)

  if (!variableExists) {
    // 如果变量不存在，清理所有相关绑定
    allNodes.forEach(node => {
      if (node.type === 'custom-tool') {
        const parameterMappings = (node.data as any)?.parameter_mappings || {}
        let hasChanges = false
        const updatedMappings = { ...parameterMappings }

        // 检查每个参数映射，如果绑定的是不存在的变量，则清除绑定
        Object.keys(updatedMappings).forEach(paramName => {
          if (updatedMappings[paramName]?.value === variableName) {
            delete updatedMappings[paramName]
            hasChanges = true
          }
        })

        // 如果有变化，加入更新列表
        if (hasChanges) {
          updates.push({
            nodeId: node.id,
            updates: { parameter_mappings: updatedMappings }
          })
        }
      }
    })
  }

  return updates
}

/**
 * 批量更新参数绑定
 *
 * 根据选中的绑定配置批量更新节点的参数映射
 *
 * @param variableName - 变量名称
 * @param variableType - 变量类型
 * @param selectedBindings - 选中的绑定配置
 * @param allNodes - 所有工作流节点
 * @returns 节点更新函数数组
 */
export function updateParameterBindings(
  variableName: string,
  variableType: WorkflowVariable['type'],
  selectedBindings: { [nodeId: string]: string[] },
  allNodes: SecurityNode[]
): Array<{ nodeId: string; updates: any }> {
  const updates: Array<{ nodeId: string; updates: any }> = []

  Object.entries(selectedBindings).forEach(([nodeId, parameters]) => {
    if (parameters.length > 0) {
      // 获取节点当前的参数映射
      const node = allNodes.find(n => n.id === nodeId)
      if (node) {
        const currentMappings = (node.data as any)?.parameter_mappings || {}

        // 为选中的参数绑定新变量
        parameters.forEach(paramName => {
          currentMappings[paramName] = {
            source: 'global_variable',
            value: variableName,
            type: variableType
          }
        })

        // 加入更新列表
        updates.push({
          nodeId: node.id,
          updates: { parameter_mappings: currentMappings }
        })
      }
    }
  })

  return updates
}

/**
 * 获取节点的参数映射
 *
 * 返回指定节点的所有参数映射配置
 *
 * @param node - 目标节点
 * @returns 参数映射对象
 */
export function getNodeParameterMappings(node: SecurityNode): Record<string, any> {
  return (node.data as any)?.parameter_mappings || {}
}

/**
 * 检查变量是否被任何节点使用
 *
 * @param variableName - 变量名称
 * @param allNodes - 所有工作流节点
 * @returns 是否被使用
 */
export function isVariableInUse(variableName: string, allNodes: SecurityNode[]): boolean {
  return allNodes.some(node => {
    if (node.type === 'custom-tool') {
      const parameterMappings = (node.data as any)?.parameter_mappings || {}
      return Object.values(parameterMappings).some((mapping: any) =>
        mapping?.value === variableName
      )
    }
    return false
  })
}

/**
 * 获取使用指定变量的节点数量
 *
 * @param variableName - 变量名称
 * @param allNodes - 所有工作流节点
 * @returns 使用该变量的节点数量
 */
export function getVariableUsageCount(variableName: string, allNodes: SecurityNode[]): number {
  return getVariableBindings(variableName, allNodes).length
}

/**
 * 获取节点的绑定统计信息
 *
 * @param node - 目标节点
 * @returns 绑定统计信息
 */
export function getNodeBindingStats(node: SecurityNode): {
  totalParams: number
  boundParams: number
  unboundParams: number
} {
  if (node.type !== 'custom-tool') {
    return { totalParams: 0, boundParams: 0, unboundParams: 0 }
  }

  const nodeData = node.data as any
  const placeholders = nodeData?.placeholders || []
  const parameterMappings = nodeData?.parameter_mappings || {}

  const totalParams = placeholders.length
  const boundParams = placeholders.filter((placeholder: string) => {
    const paramName = placeholder.replace(/[{}]/g, '')
    const mapping = parameterMappings[paramName]
    return mapping && mapping.value && mapping.value.trim() !== ''
  }).length

  const unboundParams = totalParams - boundParams

  return { totalParams, boundParams, unboundParams }
}
