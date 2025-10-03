"use client"

import { Table } from "@tanstack/react-table"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DataTableViewOptions } from "./data-table-view-options"
import { DataTableFacetedFilter } from "./data-table-faceted-filter"

import type { DataTableToolbarProps } from "@/types/common.types"

export function DataTableToolbar<TData>({
  table,
  searchableColumns = [],
  filterableColumns = [],
  extraButtons,
}: DataTableToolbarProps<TData>) {
  const isFiltered = table.getState().columnFilters.length > 0
  const searchColumn = searchableColumns[0] // 使用第一个可搜索列作为主要搜索

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        {searchColumn && (
          <Input
            placeholder={`Filter ${searchColumn}...`}
            value={(table.getColumn(searchColumn)?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn(searchColumn)?.setFilterValue(event.target.value)
            }
            className="h-8 w-[150px] lg:w-[250px]"
          />
        )}
        {filterableColumns.map((filterColumn) => {
          const column = table.getColumn(filterColumn.key)
          if (!column) return null
          
          return (
            <DataTableFacetedFilter
              key={filterColumn.key}
              column={column}
              title={filterColumn.title}
              options={filterColumn.options}
            />
          )
        })}
        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-8 px-2 lg:px-3"
          >
            Reset
            <X />
          </Button>
        )}
      </div>
      <DataTableViewOptions table={table} extraButtons={extraButtons} />
    </div>
  )
}
