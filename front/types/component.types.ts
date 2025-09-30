// 组件Props类型定义

import type { ReactNode } from "react"
import type { BreadcrumbItemType } from "./common.types"
import type { MainDomain, ValidationResult } from "./domain.types"

// App Layout 组件
export interface AppLayoutProps {
  children: ReactNode
  breadcrumbItems?: BreadcrumbItemType[]
  noPadding?: boolean
}

// 组织相关组件
export interface OrganizationSubDomainsProps {
  organizationId: number
}

export interface OrganizationVulnerabilitiesProps {
  organizationId: number
}

export interface OrganizationAssetsProps {
  organizationId: number
}

export interface OrganizationOverviewProps {
  organization: import("./organization.types").Organization
}

export interface OrganizationDetailProps {
  organizationId: number
}

export interface OrganizationScanHistoryProps {
  organizationId: number
}

// 组织对话框组件
export interface AddOrganizationDialogProps {
  isOpen: boolean
  onClose: () => void
  onAddOrganization: (organization: { name: string; description: string }) => void
}

export interface EditOrganizationDialogProps {
  organization: import("./organization.types").Organization
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: (organization: import("./organization.types").Organization) => void
}

export interface OrganizationDialogProps {
  onAdd: (organization: import("./organization.types").Organization) => void
  organization?: import("./organization.types").Organization | null
  onEdit?: (organization: import("./organization.types").Organization) => void
}

// 域名相关组件
export interface AddDomainDialogProps {
  isOpen: boolean
  onClose: () => void
  organizationName: string
  onAddDomain: (domains: string[]) => void
}

export interface AddSubDomainDialogProps {
  isOpen: boolean
  onClose: () => void
  organizationName: string
  mainDomains: MainDomain[]
  onAddSubDomain: (subdomains: { name: string; domainId: number }[]) => void
}

// 数据表格组件
export interface DataTableProps<T> {
  data: T[]
  columns: any[]
  loading?: boolean
  pagination?: {
    page: number
    pageSize: number
    total: number
  }
  onPaginationChange?: (pagination: { page: number; pageSize: number }) => void
}

// 通用UI组件
export interface EmptyStateProps {
  icon?: any // LucideIcon
  title: string
  description: string
  action?: {
    label: string
    onClick?: () => void
    href?: string
    variant?: "default" | "outline" | "secondary" | "destructive" | "ghost" | "link"
    disabled?: boolean
  }
  children?: ReactNode
  className?: string
}

export interface LoadingProps {
  size?: "sm" | "md" | "lg"
  text?: string
  className?: string
  fullScreen?: boolean
  showSkeleton?: boolean
  skeletonType?: "dashboard" | "table" | "form" | "cards" | "workflow"
}

export interface DataStateWrapperProps {
  state: import("./common.types").DataViewState

  // Loading 配置
  loadingText?: string
  loadingSize?: "sm" | "md" | "lg"

  // Empty 配置
  emptyIcon?: any // LucideIcon
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: {
    label: string
    onClick?: () => void
    href?: string
    variant?: "default" | "outline" | "secondary" | "destructive" | "ghost" | "link"
    disabled?: boolean
  }

  // Error 配置
  errorStatusCode?: number
  errorTitle?: string
  errorDescription?: string
  showRetry?: boolean
  onRetry?: () => void

  // Data 内容
  children: ReactNode

  // 额外的检查条件（比如过滤后的数据是否为空）
  hasData?: boolean

  // 类名
  className?: string
}

// 扫描相关组件
export interface ScanOverviewProps {
  organizationId?: number
}

export interface ScanCreateProps {
  // 扫描创建页面可能不需要特殊的props
}

// 仪表板组件
export interface DashboardProps {
  // 仪表板页面可能不需要特殊的props
}

// 资产概览组件
export interface AssetsOverviewProps {
  // 资产概览页面可能不需要特殊的props
}
