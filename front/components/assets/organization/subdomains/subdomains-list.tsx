"use client"

import React, { useState, useEffect, useMemo } from "react"
import { toast } from "sonner"
import { SubdomainsDataTable } from "./subdomains-data-table"
import { createSubdomainColumns } from "./subdomains-columns"
import { SubDomainService } from "@/services/subdomain.service"
import type { SubDomain } from "@/types/subdomain.types"

/**
 * 子域名列表组件
 * 用于显示和管理子域名列表
 */
export function SubdomainsList({ organizationId }: { organizationId: string }) {
  const [subdomains, setSubdomains] = useState<SubDomain[]>([])
  const [selectedSubdomains, setSelectedSubdomains] = useState<SubDomain[]>([])
  const [loading, setLoading] = useState(true)

  // 辅助函数 - 格式化日期
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString("zh-CN", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })
  }

  // 导航函数
  const navigate = (path: string) => {
    window.location.href = path
  }

  // 处理编辑子域名
  const handleEditSubdomain = (subdomain: SubDomain) => {
    toast.info(`编辑子域名功能开发中: ${subdomain.name}`)
  }

  // 处理删除子域名
  const handleDeleteSubdomain = async (subdomain: SubDomain) => {
    try {
      // 乐观更新：立即从UI中移除
      const updatedSubdomains = subdomains.filter(s => s.id !== subdomain.id)
      setSubdomains(updatedSubdomains)
      
      // 显示loading toast
      const loadingToast = toast.loading(`正在删除子域名: ${subdomain.name}`)
      
      // TODO: 调用删除API
      // await SubDomainService.deleteSubdomain(subdomain.id)
      
      // 模拟API延迟
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 成功toast
      toast.success(`子域名 ${subdomain.name} 已删除`, { id: loadingToast })
    } catch (error) {
      // 失败时回滚
      setSubdomains(prev => [...prev, subdomain].sort((a, b) => a.id - b.id))
      toast.error(`删除子域名失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  // 处理批量删除
  const handleBulkDelete = async () => {
    if (selectedSubdomains.length === 0) {
      toast.error("请先选择要删除的子域名")
      return
    }
    
    try {
      // 乐观更新：立即从UI中移除选中的子域名
      const selectedIds = selectedSubdomains.map(s => s.id)
      const updatedSubdomains = subdomains.filter(s => !selectedIds.includes(s.id))
      setSubdomains(updatedSubdomains)
      setSelectedSubdomains([])
      
      // 显示loading toast
      const loadingToast = toast.loading(`正在批量删除 ${selectedSubdomains.length} 个子域名`)
      
      // TODO: 调用批量删除API
      // await SubDomainService.bulkDeleteSubdomains(selectedIds)
      
      // 模拟API延迟
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // 成功toast
      toast.success(`已成功删除 ${selectedSubdomains.length} 个子域名`, { id: loadingToast })
    } catch (error) {
      // 失败时回滚
      setSubdomains(prev => [...prev, ...selectedSubdomains].sort((a, b) => a.id - b.id))
      toast.error(`批量删除失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  // 处理添加子域名
  const handleAddSubdomain = async () => {
    // 模拟添加子域名的数据
    const newSubdomainData = {
      subDomains: [`new${Date.now()}.example.com`],
      domainId: 1 // 这里应该根据实际情况获取域名ID
    }
    
    try {
      const loadingToast = toast.loading("正在添加子域名...")
      
      const response = await SubDomainService.createSubDomains(newSubdomainData)
      
      if (response.state === 'success') {
        // 重新获取子域名列表
        await fetchSubdomains()
        toast.success("子域名添加成功", { id: loadingToast })
      } else {
        toast.error(`添加失败: ${response.message || '未知错误'}`, { id: loadingToast })
      }
    } catch (error) {
      toast.error(`添加子域名失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  // 创建列定义
  const subdomainColumns = useMemo(
    () =>
      createSubdomainColumns({
        formatDate,
        navigate,
        handleEdit: handleEditSubdomain,
        handleDelete: handleDeleteSubdomain,
      }),
    []
  )

  // 获取子域名数据
  const fetchSubdomains = async () => {
    try {
      setLoading(true)
      
      const response = await SubDomainService.getSubDomains({
        organizationId: parseInt(organizationId),
        page: 1,
        pageSize: 100,
        sortBy: 'created_at',
        sortOrder: 'desc'
      })
      
      if (response.state === 'success' && response.data) {
        // 如果返回的是单个子域名，转换为数组
        // 注意：API 响应会被转换为 camelCase，所以 sub_domains 变成 subDomains
        if ('subDomains' in response.data) {
          const validSubdomains = (response.data.subDomains || []).filter(
            (item: any) => item && typeof item.id !== 'undefined' && item.id !== null
          )
          console.log('获取到的子域名数据:', validSubdomains)
          console.log('子域名数量:', validSubdomains.length)
          setSubdomains(validSubdomains)
        } else if (response.data.id) {
          console.log('获取到单个子域名:', response.data)
          setSubdomains([response.data])
        } else {
          console.log('没有获取到有效的子域名数据')
          setSubdomains([])
        }
      } else {
        console.log('API 响应失败:', response)
        setSubdomains([])
        toast.error(response.message || "获取子域名数据失败")
      }
    } catch (error) {
      console.error("获取子域名数据失败:", error)
      toast.error(`获取子域名数据失败: ${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSubdomains()
  }, [organizationId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        <span className="ml-2 text-muted-foreground">加载子域名数据中...</span>
      </div>
    )
  }

  return (
    <SubdomainsDataTable
      data={subdomains || []}
      columns={subdomainColumns}
      onAddNew={handleAddSubdomain}
      onBulkDelete={handleBulkDelete}
      onSelectionChange={setSelectedSubdomains}
      searchPlaceholder="搜索子域名..."
      searchColumn="name"
      addButtonText="添加子域名"
    />
  )
}
