"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { SearchResult } from "@/types/search.types"

interface SearchResultCardProps {
  result: SearchResult
}

const severityColors: Record<string, string> = {
  critical: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  high: "bg-red-500/10 text-red-500 border-red-500/20",
  medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  low: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  info: "bg-gray-500/10 text-gray-500 border-gray-500/20",
}

export function SearchResultCard({ result }: SearchResultCardProps) {
  const [vulnOpen, setVulnOpen] = useState(false)
  const [techExpanded, setTechExpanded] = useState(false)
  const [isOverflowing, setIsOverflowing] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const formatHeaders = (headers: Record<string, string>) => {
    return Object.entries(headers)
      .map(([key, value]) => `${key}: ${value}`)
      .join("\n")
  }

  // 检测内容是否溢出
  const maxHeight = 26 * 4 // 4行高度 (badge ~22px + gap 4px)
  
  useEffect(() => {
    const el = containerRef.current
    if (!el || techExpanded) return

    const checkOverflow = () => {
      setIsOverflowing(el.scrollHeight > maxHeight)
    }

    checkOverflow()

    const resizeObserver = new ResizeObserver(checkOverflow)
    resizeObserver.observe(el)

    return () => resizeObserver.disconnect()
  }, [result.technologies, techExpanded, maxHeight])

  return (
    <Card className="overflow-hidden py-0 gap-0">
      <CardContent className="p-0">
        {/* 顶部 Host 栏 */}
        <h3 className="font-semibold text-sm px-4 py-2 bg-muted/30 border-b">{result.host}</h3>

        {/* 中间左右分栏 */}
        <div className="flex flex-col md:flex-row">
          {/* 左侧信息区 */}
          <div className="w-full md:w-2/5 px-4 pt-2 pb-3 border-b md:border-b-0 md:border-r flex flex-col">
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center h-[28px]">
                <span className="text-muted-foreground w-12 shrink-0">标题</span>
                <span className="font-medium truncate">{result.title}</span>
              </div>
              <div className="flex items-center">
                <span className="text-muted-foreground w-12 shrink-0">Host</span>
                <span className="font-mono text-sm">{result.host}</span>
              </div>
              <div className="flex items-center">
                <span className="text-muted-foreground w-12 shrink-0">IP</span>
                <span className="font-mono text-sm">{result.ip}</span>
              </div>
            </div>

            {/* Technologies 直接显示 */}
            {result.technologies.length > 0 && (
              <div className="mt-3 flex flex-col gap-1">
                <div
                  ref={containerRef}
                  className="flex flex-wrap items-start gap-1 overflow-hidden transition-all duration-200"
                  style={{ maxHeight: techExpanded ? "none" : `${maxHeight}px` }}
                >
                  {result.technologies.map((tech, index) => (
                    <Badge
                      key={`${tech}-${index}`}
                      variant="secondary"
                      className="text-xs"
                    >
                      {tech}
                    </Badge>
                  ))}
                </div>
                {(isOverflowing || techExpanded) && (
                  <button
                    onClick={() => setTechExpanded(!techExpanded)}
                    className="inline-flex items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground transition-colors self-start"
                  >
                    {techExpanded ? (
                      <>
                        <ChevronUp className="h-3 w-3" />
                        <span>收起</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-3 w-3" />
                        <span>展开</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 右侧 Tab 区 */}
          <div className="w-full md:w-3/5 flex flex-col">
            <Tabs defaultValue="header" className="w-full h-full flex flex-col gap-0">
              <TabsList className="h-[28px] gap-4 rounded-none border-b bg-transparent px-4 pt-1">
                <TabsTrigger 
                  value="header" 
                  className="h-full rounded-none border-b-2 border-transparent border-x-0 border-t-0 bg-transparent px-1 text-sm shadow-none focus-visible:ring-0 focus-visible:outline-none data-[state=active]:border-b-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  Header
                </TabsTrigger>
                <TabsTrigger 
                  value="body" 
                  className="h-full rounded-none border-b-2 border-transparent border-x-0 border-t-0 bg-transparent px-1 text-sm shadow-none focus-visible:ring-0 focus-visible:outline-none data-[state=active]:border-b-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
                >
                  Body
                </TabsTrigger>
              </TabsList>
              <TabsContent value="header" className="flex-1 overflow-auto bg-muted/30 px-4 py-2">
                <pre className="text-xs font-mono whitespace-pre-wrap">
                  {formatHeaders(result.responseHeaders)}
                </pre>
              </TabsContent>
              <TabsContent value="body" className="flex-1 overflow-auto bg-muted/30 px-4 py-2">
                <pre className="text-xs font-mono whitespace-pre-wrap">
                  {result.responseBody.slice(0, 500)}
                  {result.responseBody.length > 500 && "..."}
                </pre>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* 底部漏洞区 */}
        {result.vulnerabilities.length > 0 && (
          <div className="border-t">
            <Collapsible open={vulnOpen} onOpenChange={setVulnOpen}>
              <CollapsibleTrigger className="flex items-center gap-1 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full">
                {vulnOpen ? (
                  <ChevronDown className="size-4" />
                ) : (
                  <ChevronUp className="size-4 rotate-90" />
                )}
                <span>关联漏洞 ({result.vulnerabilities.length})</span>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-4 pb-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">漏洞名称</TableHead>
                        <TableHead className="text-xs w-24">Severity</TableHead>
                        <TableHead className="text-xs w-24">Source</TableHead>
                        <TableHead className="text-xs w-32">Vuln Type</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.vulnerabilities.map((vuln) => (
                        <TableRow key={vuln.id}>
                          <TableCell className="text-xs font-medium">
                            {vuln.name}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-xs ${severityColors[vuln.severity]}`}
                            >
                              {vuln.severity}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">{vuln.source}</TableCell>
                          <TableCell className="text-xs">{vuln.vulnType}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
