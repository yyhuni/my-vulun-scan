// 测试多节点变量绑定逻辑
console.log('=== 测试多节点变量绑定逻辑 ===')

// 模拟节点数据
let mockNodes = [
  {
    id: 'tool_001',
    data: {
      title: 'Nmap扫描',
      placeholders: ['{target}', '{ports}', '{output_file}'],
      parameter_mappings: {}
    }
  },
  {
    id: 'tool_002', 
    data: {
      title: 'Nuclei扫描',
      placeholders: ['{target}', '{templates}', '{output_file}'],
      parameter_mappings: {}
    }
  }
]

// 模拟变量列表
let variables = []

// 模拟节点更新函数
function updateNode(nodeId, updates) {
  const nodeIndex = mockNodes.findIndex(n => n.id === nodeId)
  if (nodeIndex !== -1) {
    mockNodes[nodeIndex].data = { ...mockNodes[nodeIndex].data, ...updates }
    console.log(`节点 ${nodeId} 更新:`, updates)
  }
}

// 模拟创建变量并绑定的过程
function createVariableAndBind(variableName, variableValue, variableType, selectedBindings) {
  console.log(`\n--- 创建变量: ${variableName} = ${variableValue} ---`)
  
  // 添加变量到列表
  variables.push({ name: variableName, value: variableValue, type: variableType })
  
  // 处理变量绑定
  Object.entries(selectedBindings).forEach(([nodeId, parameters]) => {
    if (parameters.length > 0) {
      // 获取节点当前的参数映射
      const node = mockNodes.find(n => n.id === nodeId)
      if (node) {
        const currentMappings = node.data.parameter_mappings || {}

        // 为选中的参数绑定新变量
        parameters.forEach(paramName => {
          currentMappings[paramName] = {
            source: 'global_variable',
            value: variableName,
            type: variableType
          }
        })

        // 更新节点
        updateNode(nodeId, {
          parameter_mappings: currentMappings
        })
      }
    }
  })
}

// 模拟检查绑定状态函数
function getParameterBindingStatus(nodeId, paramName) {
  const node = mockNodes.find(n => n.id === nodeId)
  if (!node) return null

  const parameterMappings = node.data?.parameter_mappings || {}
  const binding = parameterMappings[paramName]
  
  // 检查绑定是否存在且有有效的值（不为空字符串）
  if (binding && binding.value && binding.value.trim() !== '') {
    return {
      isBound: true,
      variableName: binding.value,
      source: binding.source,
      type: binding.type
    }
  }
  
  return { isBound: false }
}

// 显示当前绑定状态
function showBindingStatus() {
  console.log('\n=== 当前绑定状态 ===')
  mockNodes.forEach(node => {
    console.log(`\n节点 ${node.id} (${node.data.title}):`)
    node.data.placeholders.forEach(placeholder => {
      const paramName = placeholder.replace(/[{}]/g, '')
      const status = getParameterBindingStatus(node.id, paramName)
      if (status.isBound) {
        console.log(`  ${placeholder}: 已绑定到 ${status.variableName}`)
      } else {
        console.log(`  ${placeholder}: 未绑定`)
      }
    })
  })
}

// 测试场景1: 创建第一个变量并绑定到两个节点的target参数
console.log('\n🧪 测试场景1: 创建target_ip变量并绑定到两个节点的target参数')
createVariableAndBind('target_ip', '192.168.1.1', 'string', {
  'tool_001': ['target'],
  'tool_002': ['target']
})
showBindingStatus()

// 测试场景2: 创建第二个变量并绑定到其他参数
console.log('\n🧪 测试场景2: 创建output_dir变量并绑定到两个节点的output_file参数')
createVariableAndBind('output_dir', '/tmp/scan_results', 'string', {
  'tool_001': ['output_file'],
  'tool_002': ['output_file']
})
showBindingStatus()

// 测试场景3: 创建第三个变量并绑定到特定节点的特定参数
console.log('\n🧪 测试场景3: 创建ports变量并绑定到tool_001的ports参数')
createVariableAndBind('scan_ports', '1-1000', 'string', {
  'tool_001': ['ports']
})
showBindingStatus()

console.log('\n=== 最终变量列表 ===')
variables.forEach((v, i) => {
  console.log(`${i + 1}. ${v.name} = ${v.value} (${v.type})`)
})

console.log('\n=== 测试完成 ===')
