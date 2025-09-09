import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react"

interface TablePaginationProps {
  currentPage: number
  totalItems: number
  itemsPerPage: number
  onPageChange: (page: number) => void
  onItemsPerPageChange?: (itemsPerPage: number) => void
  className?: string
  itemsPerPageOptions?: number[]
}

export function TablePagination({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  className = "",
  
}: TablePaginationProps) {
  const totalPages = Math.ceil(totalItems / itemsPerPage)
  const itemName = "项" // 固定使用"项"
  const itemsPerPageOptions = [10, 20, 50, 100, 200, 500, 1000] // 每页显示条数选项

  const goToFirstPage = () => {
    if (currentPage > 1) {
      onPageChange(1)
    }
  }

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1)
    }
  }

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1)
    }
  }

  const goToLastPage = () => {
    if (currentPage < totalPages) {
      onPageChange(totalPages)
    }
  }

  // 生成页码选项
  const getPageOptions = () => {
    const options = []
    for (let i = 1; i <= totalPages; i++) {
      options.push(i)
    }
    return options
  }

  if (totalItems === 0) {
    return null
  }

  return (
    <div className={`flex items-center justify-between ${className}`}>
      {/* 左侧：统计信息和每页显示条数控制 */}
      <div className="flex items-center space-x-4">
        <div className="text-sm text-muted-foreground">
          共有 {totalItems} {itemName}
        </div>
        {onItemsPerPageChange && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">每页显示</span>
            <Select
              value={itemsPerPage.toString()}
              onValueChange={(value) => onItemsPerPageChange(parseInt(value))}
            >
              <SelectTrigger className="w-20 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {itemsPerPageOptions.map((option) => (
                  <SelectItem key={option} value={option.toString()}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">{itemName}</span>
          </div>
        )}
      </div>

      {/* 右侧：分页控制 */}
      <div className="flex items-center space-x-1">
        {/* 首页按钮 */}
        <Button
          variant="outline"
          size="sm"
          onClick={goToFirstPage}
          disabled={currentPage === 1}
          className="h-8 px-3"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>

        {/* 上一页按钮 */}
        <Button
          variant="outline"
          size="sm"
          onClick={goToPreviousPage}
          disabled={currentPage === 1}
          className="h-8 px-3"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* 当前页/总页数选择器 */}
        <Select
          value={currentPage.toString()}
          onValueChange={(value) => onPageChange(parseInt(value))}
        >
          <SelectTrigger className="w-24 h-8 text-center justify-center">
            <SelectValue>
              {currentPage}/{totalPages}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="w-24">
            {getPageOptions().map((page) => (
              <SelectItem key={page} value={page.toString()} className="text-center">
                {page}/{totalPages}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 下一页按钮 */}
        <Button
          variant="outline"
          size="sm"
          onClick={goToNextPage}
          disabled={currentPage === totalPages}
          className="h-8 px-3"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        {/* 尾页按钮 */}
        <Button
          variant="outline"
          size="sm"
          onClick={goToLastPage}
          disabled={currentPage === totalPages}
          className="h-8 px-3"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
} 