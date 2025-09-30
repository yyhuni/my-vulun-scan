"use client"

import { useState } from "react";
import { Building2, Globe, Workflow, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useNavigation } from "@/hooks/use-navigation";
import { Badge } from "@/components/ui/badge";

// TODO: 替换为真实的 API 调用
// 这些数据应该从后端 API 获取

import type { ScanConfig } from "@/types/scan.types"

export default function ScanCreate() {
  const { navigate } = useNavigation();
  const [scanConfig, setScanConfig] = useState<ScanConfig>({
    organizationId: "",
    domainIds: [], // 改为数组
    workflowId: "",
    scanName: "",
    description: "",
  });

  // TODO: 这些数据应该从 API 获取
  const mockOrganizations = [
    { id: "ORG-001", name: "华为技术有限公司" },
    { id: "ORG-002", name: "腾讯科技有限公司" },
    { id: "ORG-003", name: "阿里巴巴集团" },
  ];

  const mockDomains = [
    // 华为技术有限公司 - 更多域名示例
    { id: "DOM-001", domain: "huawei.com", organization: "华为技术有限公司", organizationId: "ORG-001" },
    { id: "DOM-002", domain: "vmall.com", organization: "华为技术有限公司", organizationId: "ORG-001" },
    { id: "DOM-003", domain: "hicloud.com", organization: "华为技术有限公司", organizationId: "ORG-001" },
    { id: "DOM-004", domain: "huaweicloud.com", organization: "华为技术有限公司", organizationId: "ORG-001" },
    { id: "DOM-005", domain: "consumer.huawei.com", organization: "华为技术有限公司", organizationId: "ORG-001" },
    { id: "DOM-006", domain: "developer.huawei.com", organization: "华为技术有限公司", organizationId: "ORG-001" },
    { id: "DOM-007", domain: "support.huawei.com", organization: "华为技术有限公司", organizationId: "ORG-001" },
    { id: "DOM-008", domain: "enterprise.huawei.com", organization: "华为技术有限公司", organizationId: "ORG-001" },
    { id: "DOM-009", domain: "carrier.huawei.com", organization: "华为技术有限公司", organizationId: "ORG-001" },
    { id: "DOM-010", domain: "honor.com", organization: "华为技术有限公司", organizationId: "ORG-001" },
    { id: "DOM-011", domain: "hihonor.com", organization: "华为技术有限公司", organizationId: "ORG-001" },
    { id: "DOM-012", domain: "harmonyos.com", organization: "华为技术有限公司", organizationId: "ORG-001" },

    // 腾讯科技有限公司
    { id: "DOM-013", domain: "tencent.com", organization: "腾讯科技有限公司", organizationId: "ORG-002" },
    { id: "DOM-014", domain: "qq.com", organization: "腾讯科技有限公司", organizationId: "ORG-002" },
    { id: "DOM-015", domain: "weixin.qq.com", organization: "腾讯科技有限公司", organizationId: "ORG-002" },
    { id: "DOM-016", domain: "wechat.com", organization: "腾讯科技有限公司", organizationId: "ORG-002" },
    { id: "DOM-017", domain: "qzone.qq.com", organization: "腾讯科技有限公司", organizationId: "ORG-002" },
    { id: "DOM-018", domain: "qcloud.com", organization: "腾讯科技有限公司", organizationId: "ORG-002" },
    { id: "DOM-019", domain: "cloud.tencent.com", organization: "腾讯科技有限公司", organizationId: "ORG-002" },
    { id: "DOM-020", domain: "gaming.qq.com", organization: "腾讯科技有限公司", organizationId: "ORG-002" },

    // 阿里巴巴集团
    { id: "DOM-021", domain: "taobao.com", organization: "阿里巴巴集团", organizationId: "ORG-003" },
    { id: "DOM-022", domain: "tmall.com", organization: "阿里巴巴集团", organizationId: "ORG-003" },
    { id: "DOM-023", domain: "alipay.com", organization: "阿里巴巴集团", organizationId: "ORG-003" },
    { id: "DOM-024", domain: "alibaba.com", organization: "阿里巴巴集团", organizationId: "ORG-003" },
    { id: "DOM-025", domain: "alicloud.com", organization: "阿里巴巴集团", organizationId: "ORG-003" },
    { id: "DOM-026", domain: "aliyun.com", organization: "阿里巴巴集团", organizationId: "ORG-003" },
    { id: "DOM-027", domain: "1688.com", organization: "阿里巴巴集团", organizationId: "ORG-003" },
    { id: "DOM-028", domain: "dingtalk.com", organization: "阿里巴巴集团", organizationId: "ORG-003" },
  ];

  const mockWorkflows = [
    {
      id: "WF-001",
      name: "Subfinder 子域名扫描",
      description: "使用 Subfinder 工具进行子域名发现",
      type: "子域名扫描",
      estimatedTime: "5-15分钟"
    },
    {
      id: "WF-002",
      name: "全面安全评估",
      description: "包含端口扫描、漏洞扫描和服务识别的综合评估",
      type: "综合扫描",
      estimatedTime: "30-60分钟"
    },
    {
      id: "WF-003",
      name: "快速端口扫描",
      description: "针对常用端口的快速扫描",
      type: "端口扫描",
      estimatedTime: "2-5分钟"
    },
  ];

  // 获取当前选择的数据
  const selectedOrganization = mockOrganizations.find(org => org.id === scanConfig.organizationId);
  const selectedDomains = mockDomains.filter(domain => scanConfig.domainIds.includes(domain.id));
  const selectedWorkflow = mockWorkflows.find(workflow => workflow.id === scanConfig.workflowId);

  // 根据选择的组织过滤域名
  const filteredDomains = mockDomains.filter(domain =>
    domain.organizationId === scanConfig.organizationId
  );

  // 处理域名选择
  const handleDomainToggle = (domainId: string) => {
    setScanConfig(prev => ({
      ...prev,
      domainIds: prev.domainIds.includes(domainId)
        ? prev.domainIds.filter(id => id !== domainId)
        : [...prev.domainIds, domainId]
    }));
  };

  const handleSubmit = () => {
    // 验证表单
    if (!scanConfig.organizationId) {
      console.error("请先选择要扫描的组织");
      return;
    }

    if (scanConfig.domainIds.length === 0) {
      console.error("请至少选择一个要扫描的域名");
      return;
    }

    if (!scanConfig.workflowId) {
      console.error("请选择要使用的扫描工作流");
      return;
    }

    if (!scanConfig.scanName.trim()) {
      console.error("请为扫描任务输入一个名称");
      return;
    }

    // 这里应该调用API创建扫描任务
    console.log(`扫描任务 "${scanConfig.scanName}" 已成功创建并开始执行`);

    // 跳转到扫描总览页面
    navigate("/scan/overview");
  };

  // 检查表单是否可以提交
  const canSubmit = () => {
    return scanConfig.organizationId !== "" &&
           scanConfig.domainIds.length > 0 &&
           scanConfig.workflowId !== "" &&
           scanConfig.scanName.trim() !== "";
  };

  return (
    <div className="h-full flex flex-col">
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">新建扫描</h1>
        <p className="text-muted-foreground">配置并启动新的安全扫描任务</p>
      </div>

      {/* 主要内容区域 - 使用网格布局 */}
      <div className="flex-1 grid grid-cols-12 gap-6">
        {/* 左侧配置区域 */}
        <div className="col-span-8 space-y-6">
          {/* 基础配置卡片 */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">基础配置</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                {/* 组织选择 */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    <Label htmlFor="organization" className="font-medium">目标组织 *</Label>
                  </div>
                  <Select
                    value={scanConfig.organizationId}
                    onValueChange={(value) => setScanConfig({...scanConfig, organizationId: value, domainIds: []})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="请选择要扫描的组织" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockOrganizations.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedOrganization && (
                    <div className="text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded">
                      ✓ {selectedOrganization.name}
                    </div>
                  )}
                </div>

                {/* 任务配置 */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Play className="h-4 w-4 text-green-600" />
                    <Label htmlFor="scanName" className="font-medium">扫描任务名称 *</Label>
                  </div>
                  <Input
                    id="scanName"
                    value={scanConfig.scanName}
                    onChange={(e) => setScanConfig({...scanConfig, scanName: e.target.value})}
                    placeholder="请输入扫描任务名称"
                  />
                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-sm">任务描述（可选）</Label>
                    <Textarea
                      id="description"
                      value={scanConfig.description}
                      onChange={(e) => setScanConfig({...scanConfig, description: e.target.value})}
                      placeholder="请输入任务描述"
                      rows={2}
                      className="resize-none"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 域名选择卡片 */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Globe className="h-5 w-5 text-blue-600" />
                选择域名
                {selectedDomains.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    已选择 {selectedDomains.length} 个
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!scanConfig.organizationId ? (
                <div className="p-8 bg-gray-50 rounded-lg text-center text-muted-foreground">
                  <Globe className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>请先选择组织以显示可用域名</p>
                </div>
              ) : filteredDomains.length === 0 ? (
                <div className="p-8 bg-gray-50 rounded-lg text-center text-muted-foreground">
                  <Globe className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>该组织暂无可用域名</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* 批量操作按钮 */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setScanConfig({...scanConfig, domainIds: filteredDomains.map(d => d.id)})}
                      >
                        全选
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setScanConfig({...scanConfig, domainIds: []})}
                      >
                        清空
                      </Button>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      共 {filteredDomains.length} 个域名
                    </div>
                  </div>

                  {/* 域名列表 - 使用固定高度和滚动 */}
                  <div className="border rounded-lg">
                    <div className="max-h-64 overflow-y-auto">
                      <div className="grid grid-cols-2 gap-0">
                        {filteredDomains.map((domain, index) => (
                          <div
                            key={domain.id}
                            className={`
                              flex items-center space-x-3 p-3 cursor-pointer transition-all
                              ${index % 2 === 0 ? 'bg-gray-50/50' : 'bg-white'}
                              ${scanConfig.domainIds.includes(domain.id)
                                ? 'bg-blue-50 border-l-2 border-l-blue-500'
                                : 'hover:bg-gray-100'}
                              ${index < filteredDomains.length - 2 ? 'border-b border-gray-100' : ''}
                            `}
                            onClick={() => handleDomainToggle(domain.id)}
                          >
                            <Checkbox
                              id={domain.id}
                              checked={scanConfig.domainIds.includes(domain.id)}
                              onCheckedChange={() => handleDomainToggle(domain.id)}
                            />
                            <label
                              htmlFor={domain.id}
                              className="flex-1 text-sm font-medium cursor-pointer truncate"
                              title={domain.domain}
                            >
                              {domain.domain}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 已选择域名预览 */}
                  {selectedDomains.length > 0 && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="text-sm font-medium text-blue-900 mb-2">
                        已选择域名 ({selectedDomains.length})
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {selectedDomains.slice(0, 6).map((domain) => (
                          <Badge key={domain.id} variant="secondary" className="text-xs">
                            {domain.domain}
                          </Badge>
                        ))}
                        {selectedDomains.length > 6 && (
                          <Badge variant="outline" className="text-xs">
                            +{selectedDomains.length - 6} 个
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 工作流选择卡片 */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Workflow className="h-5 w-5 text-purple-600" />
                选择工作流
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {mockWorkflows.map((workflow) => (
                  <div
                    key={workflow.id}
                    className={`
                      p-4 border rounded-lg cursor-pointer transition-all
                      ${scanConfig.workflowId === workflow.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}
                    `}
                    onClick={() => setScanConfig({...scanConfig, workflowId: workflow.id})}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h4 className="font-medium">{workflow.name}</h4>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">{workflow.type}</Badge>
                            <Badge variant="secondary" className="text-xs">{workflow.estimatedTime}</Badge>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{workflow.description}</p>
                      </div>
                      {scanConfig.workflowId === workflow.id && (
                        <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center ml-3">
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 右侧预览和操作区域 */}
        <div className="col-span-4 space-y-6">
          {/* 配置预览卡片 */}
          <Card className="sticky top-6">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">配置预览</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 配置状态指示器 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">目标组织</span>
                  <div className="flex items-center gap-2">
                    {selectedOrganization ? (
                      <>
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm font-medium">已选择</span>
                      </>
                    ) : (
                      <>
                        <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                        <span className="text-sm text-muted-foreground">未选择</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">目标域名</span>
                  <div className="flex items-center gap-2">
                    {selectedDomains.length > 0 ? (
                      <>
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm font-medium">{selectedDomains.length} 个</span>
                      </>
                    ) : (
                      <>
                        <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                        <span className="text-sm text-muted-foreground">未选择</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">扫描工作流</span>
                  <div className="flex items-center gap-2">
                    {selectedWorkflow ? (
                      <>
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm font-medium">已选择</span>
                      </>
                    ) : (
                      <>
                        <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                        <span className="text-sm text-muted-foreground">未选择</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">任务名称</span>
                  <div className="flex items-center gap-2">
                    {scanConfig.scanName.trim() ? (
                      <>
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm font-medium">已填写</span>
                      </>
                    ) : (
                      <>
                        <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                        <span className="text-sm text-muted-foreground">未填写</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* 分隔线 */}
              <div className="border-t pt-4">
                {/* 详细配置信息 */}
                {selectedOrganization && (
                  <div className="mb-3">
                    <div className="text-xs text-muted-foreground mb-1">组织</div>
                    <div className="text-sm font-medium truncate" title={selectedOrganization.name}>
                      {selectedOrganization.name}
                    </div>
                  </div>
                )}

                {selectedDomains.length > 0 && (
                  <div className="mb-3">
                    <div className="text-xs text-muted-foreground mb-1">域名</div>
                    <div className="flex flex-wrap gap-1">
                      {selectedDomains.slice(0, 3).map((domain) => (
                        <Badge key={domain.id} variant="secondary" className="text-xs">
                          {domain.domain}
                        </Badge>
                      ))}
                      {selectedDomains.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{selectedDomains.length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {selectedWorkflow && (
                  <div className="mb-3">
                    <div className="text-xs text-muted-foreground mb-1">工作流</div>
                    <div className="text-sm font-medium">{selectedWorkflow.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      预计时间: {selectedWorkflow.estimatedTime}
                    </div>
                  </div>
                )}

                {scanConfig.scanName.trim() && (
                  <div className="mb-3">
                    <div className="text-xs text-muted-foreground mb-1">任务名称</div>
                    <div className="text-sm font-medium">{scanConfig.scanName}</div>
                  </div>
                )}
              </div>

              {/* 操作按钮 */}
              <div className="pt-4 border-t">
                <Button
                  onClick={handleSubmit}
                  disabled={!canSubmit()}
                  className="w-full bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  开始扫描
                  <Play className="h-4 w-4 ml-2" />
                </Button>

                {!canSubmit() && (
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    请完成所有必填项配置
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 帮助信息卡片 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">使用提示</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-muted-foreground">选择组织后会自动加载该组织下的所有域名</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-muted-foreground">可以同时选择多个域名进行批量扫描</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-muted-foreground">不同工作流的扫描时间和深度不同，请根据需要选择</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-muted-foreground">扫描任务创建后可在扫描总览页面查看进度</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}