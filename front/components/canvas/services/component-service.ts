/**
 * 工作流组件服务
 * 
 * 负责与后端API交互，获取和管理自定义工作流组件
 * 主要功能：
 * - 获取可用的自定义组件列表
 * - 根据ID获取单个组件详情
 * - 处理API错误和数据转换
 */

import { WorkflowComponent } from "@/types/workflow";
import { api } from "@/lib/api-client";

/**
 * 从API获取自定义组件列表
 *
 * 此函数向后端API发起请求，获取所有激活状态的自定义组件
 * 返回的数据会被转换为前端使用的WorkflowComponent格式
 *
 * @returns {Promise<WorkflowComponent[]>} 自定义组件列表的Promise
 * @throws {Error} 当网络请求失败或后端返回错误时抛出异常
 */
export async function fetchCustomComponents(): Promise<WorkflowComponent[]> {
  try {
    // 使用新的 API 客户端，自动转换 snake_case 为 camelCase
    // active_only=true 参数确保只获取激活状态的组件
    const response = await api.get('/workflow/components', { activeOnly: true });

    // 后端返回的数据结构: { code: "SUCCESS", message: "...", data: [...] }
    // 数据已经自动转换为 camelCase，无需手动转换
    const backendComponents = response.data.data || [];

    // 确保所有字段都有默认值
    const customComponents: WorkflowComponent[] = backendComponents.map((comp: any) => ({
      id: comp.id,
      name: comp.name,
      description: comp.description,
      category: comp.category,
      icon: comp.icon || 'Terminal',
      commandTemplate: comp.commandTemplate,  // 已经是 camelCase
      placeholders: comp.placeholders || [],
      status: comp.status,
      createdAt: comp.createdAt,              // 已经是 camelCase
      updatedAt: comp.updatedAt               // 已经是 camelCase
    }));

    return customComponents;
  } catch (error) {
    console.error('获取自定义组件失败:', error);

    // 重新抛出错误，以便调用者可以处理它
    // 这样可以让上层组件决定如何显示错误信息给用户
    throw new Error('无法获取自定义组件列表，请检查网络或后端服务。');
  }
}

/**
 * 根据ID获取单个组件详情
 * 
 * 当需要获取特定组件的详细信息时使用此函数
 * 通常用于组件配置或详情展示
 * 
 * @param {string} id - 组件ID，必须是有效的组件标识符
 * @returns {Promise<WorkflowComponent | null>} 组件详情的Promise，如果组件不存在返回null
 * @throws {Error} 当网络请求失败或后端返回错误时抛出异常
 */
export async function fetchComponentById(id: string): Promise<WorkflowComponent | null> {
  try {
    // 使用新的 API 客户端，自动转换 snake_case 为 camelCase
    const response = await api.get(`/workflow/components/${id}`);

    // 后端返回的数据结构: { code: "SUCCESS", message: "...", data: {...} }
    // 数据已经自动转换为 camelCase
    const comp = response.data.data;

    // 如果后端返回的data为空，说明组件不存在
    if (!comp) {
      return null;
    }

    // 确保所有字段都有默认值，数据已经是 camelCase 格式
    const customComponent: WorkflowComponent = {
      id: comp.id,
      name: comp.name,
      description: comp.description,
      category: comp.category,
      icon: comp.icon || 'Terminal',
      commandTemplate: comp.commandTemplate,  // 已经是 camelCase
      placeholders: comp.placeholders || [],
      status: comp.status,
      createdAt: comp.createdAt,              // 已经是 camelCase
      updatedAt: comp.updatedAt               // 已经是 camelCase
    };

    return customComponent;
  } catch (error) {
    console.error('获取组件详情失败:', error);

    // 404错误表示组件不存在，返回null而不是抛出错误
    if (error instanceof Error && error.message.includes('404')) {
      return null;
    }

    // 重新抛出错误，让调用者处理
    // 这样可以让UI组件显示适当的错误信息
    throw new Error('无法获取组件详情，请检查网络或后端服务。');
  }
}