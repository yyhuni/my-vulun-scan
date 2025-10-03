// 测试参数绑定逻辑
console.log('=== 测试参数绑定状态检查逻辑 ===')

// 模拟节点数据
const mockNodes = [
  {
    id: 'tool_001',
    data: {
      placeholders: ['{target}', '{ports}', '{output_file}'],
      parameter_mappings: {
        // 空的参数映射对象 - 应该显示为未绑定
      }
    }
  },
  {
    id: 'tool_002', 
    data: {
      placeholders: ['{domain}', '{output_file}'],
      parameter_mappings: {
        domain: {
          source: 'global_variable',
          value: 'target_domain',
          type: 'string'
        },
        output_file: {
          source: 'global_variable', 
          value: '',  // 空值 - 应该显示为未绑定
          type: 'string'
        }
      }
    }
  }
]

// 模拟检查函数
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

// 测试用例
console.log('\n1. 测试空参数映射对象:')
console.log('tool_001 target:', getParameterBindingStatus('tool_001', 'target'))
console.log('tool_001 ports:', getParameterBindingStatus('tool_001', 'ports'))

console.log('\n2. 测试有值和空值的参数:')
console.log('tool_002 domain:', getParameterBindingStatus('tool_002', 'domain'))
console.log('tool_002 output_file:', getParameterBindingStatus('tool_002', 'output_file'))

console.log('\n3. 测试不存在的节点/参数:')
console.log('不存在的节点:', getParameterBindingStatus('tool_999', 'target'))
console.log('不存在的参数:', getParameterBindingStatus('tool_001', 'nonexistent'))

console.log('\n=== 测试完成 ===')
