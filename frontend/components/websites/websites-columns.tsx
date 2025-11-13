"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { IconDots, IconEye, IconTrash, IconExternalLink } from "@tabler/icons-react"
import type { WebSite } from "@/types/website.types"

interface CreateWebSiteColumnsProps {
  formatDate: (dateString: string) => string
  onDelete: (website: WebSite) => void
  onViewDetail?: (website: WebSite) => void
}

export function createWebSiteColumns({
  formatDate,
  onDelete,
  onViewDetail,
}: CreateWebSiteColumnsProps): ColumnDef<WebSite>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "url",
      header: "URL",
      cell: ({ row }) => {
        const url = row.getValue("url") as string
        return (
          <div className="flex items-center space-x-2">
            <span className="max-w-[300px] truncate font-medium" title={url}>
              {url}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => window.open(url, '_blank')}
            >
              <IconExternalLink className="h-3 w-3" />
            </Button>
          </div>
        )
      },
    },
    {
      accessorKey: "title",
      header: "Title",
      cell: ({ row }) => {
        const title = row.getValue("title") as string
        return (
          <div className="max-w-[200px] truncate" title={title}>
            {title || "-"}
          </div>
        )
      },
    },
    {
      accessorKey: "statusCode",
      header: "Status",
      cell: ({ row }) => {
        const statusCode = row.getValue("statusCode") as number
        if (!statusCode) return "-"
        
        let variant: "default" | "secondary" | "destructive" | "outline" = "default"
        if (statusCode >= 200 && statusCode < 300) {
          variant = "default"
        } else if (statusCode >= 300 && statusCode < 400) {
          variant = "secondary"
        } else if (statusCode >= 400) {
          variant = "destructive"
        }
        
        return <Badge variant={variant}>{statusCode}</Badge>
      },
    },
    {
      accessorKey: "contentLength",
      header: "Size",
      cell: ({ row }) => {
        const contentLength = row.getValue("contentLength") as number
        if (!contentLength) return "-"
        
        const formatBytes = (bytes: number) => {
          if (bytes === 0) return "0 B"
          const k = 1024
          const sizes = ["B", "KB", "MB", "GB"]
          const i = Math.floor(Math.log(bytes) / Math.log(k))
          return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
        }
        
        return formatBytes(contentLength)
      },
    },
    {
      accessorKey: "location",
      header: "Location",
      cell: ({ row }) => {
        const location = row.getValue("location") as string
        return (
          <div className="max-w-[200px] truncate" title={location}>
            {location || "-"}
          </div>
        )
      },
    },
    {
      accessorKey: "webserver",
      header: "Web Server",
      cell: ({ row }) => {
        const webserver = row.getValue("webserver") as string
        return (
          <div className="max-w-[120px] truncate" title={webserver}>
            {webserver || "-"}
          </div>
        )
      },
    },
    {
      accessorKey: "contentType",
      header: "Content Type",
      cell: ({ row }) => {
        const contentType = row.getValue("contentType") as string
        return (
          <div className="max-w-[150px] truncate" title={contentType}>
            {contentType || "-"}
          </div>
        )
      },
    },
    {
      accessorKey: "tech",
      header: "Technologies",
      cell: ({ row }) => {
        const tech = row.getValue("tech") as string[]
        if (!tech || tech.length === 0) return "-"
        return (
          <div className="flex flex-wrap gap-1 max-w-[200px]">
            {tech.slice(0, 2).map((technology, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {technology}
              </Badge>
            ))}
            {tech.length > 2 && (
              <Badge variant="secondary" className="text-xs">
                +{tech.length - 2}
              </Badge>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "createdAt",
      header: "Created At",
      cell: ({ row }) => {
        const createdAt = row.getValue("createdAt") as string
        return <div className="text-sm">{createdAt ? formatDate(createdAt) : "-"}</div>
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const website = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <IconDots className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(website.url)}
              >
                Copy URL
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => window.open(website.url, '_blank')}
              >
                <IconExternalLink className="mr-2 h-4 w-4" />
                Open in new tab
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {onViewDetail && (
                <DropdownMenuItem onClick={() => onViewDetail(website)}>
                  <IconEye className="mr-2 h-4 w-4" />
                  View details
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => onDelete(website)}
                className="text-destructive"
              >
                <IconTrash className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}
