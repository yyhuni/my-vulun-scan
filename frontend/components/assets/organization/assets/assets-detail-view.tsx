"use client"

import React, { useState } from "react"
import { useOrganization } from "@/hooks/use-organizations"
import { useDeleteDomainFromOrganization } from "@/hooks/use-domains"
import { useQueryClient } from "@tanstack/react-query"
import { LoadingState } from "@/components/loading-spinner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { IconWorld, IconTrash } from "@tabler/icons-react"
import Link from "next/link"
import { LinkDomainDialog } from "@/components/assets/organization/assets/link-domain-dialog"
import { Link as LinkIcon } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface OrganizationAssetsDetailViewProps {
  organizationId: string
}

/**
 * 组织主资产（域名）详情视图组件
 * 显示和管理组织下的域名
 */
export function OrganizationAssetsDetailView({ organizationId }: OrganizationAssetsDetailViewProps) {
  const { data: organization, isLoading, error, refetch } = useOrganization(parseInt(organizationId))
  const queryClient = useQueryClient()
  
  // 关联域名对话框状态
  const [isLinkDomainDialogOpen, setIsLinkDomainDialogOpen] = useState(false)
  
  // 移除域名确认对话框状态
  const [domainToRemove, setDomainToRemove] = useState<{ id: number; name: string } | null>(null)
  
  // 移除域名的 mutation
  const deleteDomainMutation = useDeleteDomainFromOrganization()
  
  // 预加载域名列表数据（鼠标悬停时）
  const handlePrefetchDomains = () => {
    queryClient.prefetchQuery({
      queryKey: ['domains', 'all', { page: 1, pageSize: 100 }],
      queryFn: async () => {
        const { DomainService } = await import('@/services/domain.service')
        return DomainService.getAllDomains({ page: 1, pageSize: 100 })
      },
    })
  }

  // 处理移除域名
  const handleRemoveDomain = () => {
    if (!domainToRemove) return
    
    deleteDomainMutation.mutate(
      {
        organizationId: parseInt(organizationId),
        domainId: domainToRemove.id,
      },
      {
        onSuccess: () => {
          setDomainToRemove(null)
          // React Query 会自动刷新，无需手动 refetch
        },
      }
    )
  }

  // 错误状态
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="rounded-full bg-destructive/10 p-3 mb-4">
          <span className="text-destructive">⚠️</span>
        </div>
        <h3 className="text-lg font-semibold mb-2">加载失败</h3>
        <p className="text-muted-foreground text-center mb-4">
          {error.message || "加载组织详情时出现错误，请重试"}
        </p>
        <button 
          onClick={() => refetch()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
        >
          重新加载
        </button>
      </div>
    )
  }

  // 加载状态
  if (isLoading) {
    return <LoadingState message="加载组织详情中..." />
  }

  if (!organization) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">组织不存在</p>
      </div>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <IconWorld className="text-blue-500" />
              </div>
              <div>
                <CardTitle>主资产（域名）</CardTitle>
                <CardDescription>
                  {organization.domains && organization.domains.length > 0 ? `共 ${organization.domains.length} 个域名` : "暂无绑定域名"}
                </CardDescription>
              </div>
            </div>
            <Button 
              size="sm" 
              onClick={() => setIsLinkDomainDialogOpen(true)}
              onMouseEnter={handlePrefetchDomains}
            >
              <LinkIcon />
              关联域名
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {organization.domains && organization.domains.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {organization.domains.map((domain) => (
                <div key={domain.id} className="group flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="p-1.5 bg-blue-500/10 rounded">
                      <IconWorld className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link href={`/assets/domain/${domain.id}/subdomains`} className="font-medium text-primary hover:underline block truncate">
                        {domain.name}
                      </Link>
                      {domain.description && (
                        <p className="text-sm text-muted-foreground truncate mt-0.5">{domain.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-2 shrink-0">
                    <Badge variant="secondary">ID: {domain.id}</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => {
                        e.preventDefault()
                        setDomainToRemove({ id: domain.id, name: domain.name })
                      }}
                      title="从组织中移除"
                    >
                      <IconTrash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-muted-foreground">
              <IconWorld className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>暂无绑定的域名</p>
              <p className="text-sm mt-1">可以在域名管理页面将域名关联到此组织</p>
            </div>
          )}
        </CardContent>
      </Card>

      <LinkDomainDialog
        open={isLinkDomainDialogOpen}
        onOpenChange={setIsLinkDomainDialogOpen}
        organizationId={organization.id}
        organizationName={organization.name}
        onAdd={() => {
          // React Query 会自动刷新，无需手动 refetch
        }}
      />

      {/* 移除域名确认对话框 */}
      <AlertDialog open={!!domainToRemove} onOpenChange={(open) => !open && setDomainToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认移除域名</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>确定要从此组织中移除域名吗？</p>
                {domainToRemove && (
                  <div className="p-3 bg-muted rounded-md">
                    <p className="font-medium text-foreground">{domainToRemove.name}</p>
                    <p className="text-sm text-muted-foreground mt-1">ID: {domainToRemove.id}</p>
                  </div>
                )}
                <p className="text-sm">
                  <strong>注意：</strong>此操作只会解除域名与组织的关联关系，域名本身不会被删除，仍可正常使用。
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteDomainMutation.isPending}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveDomain}
              disabled={deleteDomainMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteDomainMutation.isPending ? "移除中..." : "确认移除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
