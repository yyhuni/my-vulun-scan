"use client"

import React, { useState } from "react"
import { useOrganization } from "@/hooks/use-organizations"
import { useDeleteAssetFromOrganization } from "@/hooks/use-assets"
import { useQueryClient } from "@tanstack/react-query"
import { LoadingState } from "@/components/loading-spinner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { IconWorld, IconTrash } from "@tabler/icons-react"
import Link from "next/link"
import { LinkAssetDialog } from "@/components/assets/organization/assets/link-asset-dialog"
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
 * 组织主资产详情视图组件
 * 显示和管理组织下的资产
 */
export function OrganizationAssetsDetailView({ organizationId }: OrganizationAssetsDetailViewProps) {
  const { data: organization, isLoading, error, refetch } = useOrganization(parseInt(organizationId))
  const queryClient = useQueryClient()
  
  // 关联资产对话框状态
  const [isLinkAssetDialogOpen, setIsLinkAssetDialogOpen] = useState(false)
  
  // 移除资产确认对话框状态
  const [assetToRemove, setAssetToRemove] = useState<{ id: number; name: string } | null>(null)
  
  // 移除资产的 mutation
  const deleteAssetMutation = useDeleteAssetFromOrganization()
  
  // 预加载资产列表数据（鼠标悬停时）
  const handlePrefetchAssets = () => {
    queryClient.prefetchQuery({
      queryKey: ['assets', 'all', { page: 1, pageSize: 100 }],
      queryFn: async () => {
        const { AssetService } = await import('@/services/asset.service')
        return AssetService.getAllAssets({ page: 1, pageSize: 100 })
      },
    })
  }

  // 处理移除资产
  const handleRemoveAsset = () => {
    if (!assetToRemove) return
    
    deleteAssetMutation.mutate(
      {
        organizationId: parseInt(organizationId),
        assetId: assetToRemove.id,
      },
      {
        onSuccess: () => {
          setAssetToRemove(null)
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
                <CardTitle>主资产</CardTitle>
                <CardDescription>
                  {organization.assets && organization.assets.length > 0 ? `共 ${organization.assets.length} 个资产` : "暂无绑定资产"}
                </CardDescription>
              </div>
            </div>
            <Button 
              size="sm" 
              onClick={() => setIsLinkAssetDialogOpen(true)}
              onMouseEnter={handlePrefetchAssets}
            >
              <LinkIcon />
              关联资产
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {organization.assets && organization.assets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {organization.assets.map((asset) => (
                <div key={asset.id} className="group flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="p-1.5 bg-blue-500/10 rounded">
                      <IconWorld className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link href={`/assets/asset/${asset.id}/domains`} className="font-medium text-primary hover:underline block truncate">
                        {asset.name}
                      </Link>
                      {asset.description && (
                        <p className="text-sm text-muted-foreground truncate mt-0.5">{asset.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-2 shrink-0">
                    <Badge variant="secondary">ID: {asset.id}</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={(e) => {
                        e.preventDefault()
                        setAssetToRemove({ id: asset.id, name: asset.name })
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
              <p>暂无绑定的资产</p>
              <p className="text-sm mt-1">可以在资产管理页面将资产关联到此组织</p>
            </div>
          )}
        </CardContent>
      </Card>

      <LinkAssetDialog
        open={isLinkAssetDialogOpen}
        onOpenChange={setIsLinkAssetDialogOpen}
        organizationId={organization.id}
        organizationName={organization.name}
        onAdd={() => {
          // React Query 会自动刷新，无需手动 refetch
        }}
      />

      {/* 移除资产确认对话框 */}
      <AlertDialog open={!!assetToRemove} onOpenChange={(open) => !open && setAssetToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认移除资产</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>确定要从此组织中移除资产吗？</p>
                {assetToRemove && (
                  <div className="p-3 bg-muted rounded-md">
                    <p className="font-medium text-foreground">{assetToRemove.name}</p>
                    <p className="text-sm text-muted-foreground mt-1">ID: {assetToRemove.id}</p>
                  </div>
                )}
                <p className="text-sm">
                  <strong>注意：</strong>此操作只会解除资产与组织的关联关系，资产本身不会被删除，仍可正常使用。
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteAssetMutation.isPending}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveAsset}
              disabled={deleteAssetMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteAssetMutation.isPending ? "移除中..." : "确认移除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
