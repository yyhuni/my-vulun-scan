"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { IconSettings } from "@tabler/icons-react"
import { OpensourceToolsList } from "@/components/tools/config/opensource-tools-list"
import { CustomToolsList } from "@/components/tools/config/custom-tools-list"
import { AddToolDialog } from "@/components/tools/config/add-tool-dialog"
import { AddCustomToolDialog } from "@/components/tools/config/add-custom-tool-dialog"

/**
 * 工具配置页面
 * 展示和管理扫描工具集（开源工具和自定义工具）
 */
export default function ToolConfigPage() {
  const [activeTab, setActiveTab] = useState("opensource")

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-3xl font-bold">工具配置</h1>
        <p className="text-muted-foreground mt-1">
          管理和配置扫描工具
        </p>
      </div>

      <Tabs defaultValue="opensource" value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* Tab 标签和操作按钮在同一行 */}
        <div className="flex items-center justify-between mb-6">
          <TabsList>
            <TabsTrigger value="opensource">开源工具</TabsTrigger>
            <TabsTrigger value="custom">自定义工具</TabsTrigger>
          </TabsList>

          {/* 根据当前 tab 显示不同的操作按钮 */}
          <div className="flex items-center gap-3">
            {/* 开源工具按钮组 */}
            <div className={`flex items-center gap-3 ${activeTab === "opensource" ? "" : "hidden"}`}>
              <Button variant="outline" size="icon">
                <IconSettings className="h-5 w-5" />
              </Button>
              <AddToolDialog />
            </div>
            
            {/* 自定义工具按钮组 */}
            <div className={activeTab === "custom" ? "" : "hidden"}>
              <AddCustomToolDialog />
            </div>
          </div>
        </div>

        <TabsContent value="opensource" className="mt-0">
          <OpensourceToolsList />
        </TabsContent>

        <TabsContent value="custom" className="mt-0">
          <CustomToolsList />
        </TabsContent>
      </Tabs>
    </div>
  )
}
