"use client"

import React from "react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import {
  IconX,
  IconLoader2,
  IconChevronRight,
  IconChevronLeft,
  IconCheck,
  IconBuilding,
  IconTarget,
  IconClock,
  IconInfoCircle,
  IconSearch,
  IconSettings,
  IconCode,
} from "@tabler/icons-react"
import { CronExpressionParser } from "cron-parser"
import cronstrue from "cronstrue/i18n"
import { useStep } from "@/hooks/use-step"
import { useCreateScheduledScan } from "@/hooks/use-scheduled-scans"
import { useTargets } from "@/hooks/use-targets"
import { useEngines } from "@/hooks/use-engines"
import { useOrganizations } from "@/hooks/use-organizations"
import { useTranslations, useLocale } from "next-intl"
import type { CreateScheduledScanRequest } from "@/types/scheduled-scan.types"
import type { Target } from "@/types/target.types"
import type { Organization } from "@/types/organization.types"
import { EnginePresetSelector } from "../engine-preset-selector"
import { ScanConfigEditor } from "../scan-config-editor"


interface CreateScheduledScanDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
  presetOrganizationId?: number
  presetOrganizationName?: string
  presetTargetId?: number
  presetTargetName?: string
}

type SelectionMode = "organization" | "target"

export function CreateScheduledScanDialog({
  open,
  onOpenChange,
  onSuccess,
  presetOrganizationId,
  presetOrganizationName,
  presetTargetId,
  presetTargetName,
}: CreateScheduledScanDialogProps) {
  const { mutate: createScheduledScan, isPending } = useCreateScheduledScan()
  const { data: enginesData } = useEngines()
  const t = useTranslations("scan.scheduled")
  const locale = useLocale()

  const CRON_PRESETS = [
    { label: t("presets.everyHour"), value: "0 * * * *" },
    { label: t("presets.daily2am"), value: "0 2 * * *" },
    { label: t("presets.daily4am"), value: "0 4 * * *" },
    { label: t("presets.weekly"), value: "0 2 * * 1" },
    { label: t("presets.monthly"), value: "0 2 1 * *" },
  ]

  const FULL_STEPS = [
    { id: 1, title: t("steps.basicInfo"), icon: IconInfoCircle },
    { id: 2, title: t("steps.selectTarget"), icon: IconTarget },
    { id: 3, title: t("steps.selectEngine"), icon: IconSettings },
    { id: 4, title: t("steps.editConfig"), icon: IconCode },
    { id: 5, title: t("steps.scheduleSettings"), icon: IconClock },
  ]

  // Preset mode: skip target selection but keep basic info for name editing
  const PRESET_STEPS = [
    { id: 1, title: t("steps.basicInfo"), icon: IconInfoCircle },
    { id: 2, title: t("steps.selectEngine"), icon: IconSettings },
    { id: 3, title: t("steps.editConfig"), icon: IconCode },
    { id: 4, title: t("steps.scheduleSettings"), icon: IconClock },
  ]

  const [orgSearchInput, setOrgSearchInput] = React.useState("")
  const [targetSearchInput, setTargetSearchInput] = React.useState("")
  const [orgSearch, setOrgSearch] = React.useState("")
  const [targetSearch, setTargetSearch] = React.useState("")

  const handleOrgSearch = () => setOrgSearch(orgSearchInput)
  const handleTargetSearch = () => setTargetSearch(targetSearchInput)

  const { data: organizationsData, isFetching: isOrgFetching } = useOrganizations({ 
    pageSize: 50, 
    search: orgSearch || undefined 
  })
  const { data: targetsData, isFetching: isTargetFetching } = useTargets({ 
    pageSize: 50, 
    search: targetSearch || undefined 
  })

  const hasPreset = !!(presetOrganizationId || presetTargetId)
  const steps = hasPreset ? PRESET_STEPS : FULL_STEPS
  const totalSteps = steps.length

  const [currentStep, { goToNextStep, goToPrevStep, reset: resetStep }] = useStep(totalSteps)

  const [name, setName] = React.useState("")
  const [engineIds, setEngineIds] = React.useState<number[]>([])
  const [selectedPresetId, setSelectedPresetId] = React.useState<string | null>(null)
  const [selectionMode, setSelectionMode] = React.useState<SelectionMode>("organization")
  const [selectedOrgId, setSelectedOrgId] = React.useState<number | null>(null)
  const [selectedTargetId, setSelectedTargetId] = React.useState<number | null>(null)
  const [cronExpression, setCronExpression] = React.useState("0 2 * * *")
  
  // Configuration state management
  const [configuration, setConfiguration] = React.useState("")
  const [isConfigEdited, setIsConfigEdited] = React.useState(false)
  const [isYamlValid, setIsYamlValid] = React.useState(true)
  const [showOverwriteConfirm, setShowOverwriteConfirm] = React.useState(false)
  const [pendingConfigChange, setPendingConfigChange] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (open) {
      if (presetOrganizationId) {
        setSelectionMode("organization")
        setSelectedOrgId(presetOrganizationId)
        setName(presetOrganizationName ? `${presetOrganizationName} - ${t("title")}` : "")
      } else if (presetTargetId) {
        setSelectionMode("target")
        setSelectedTargetId(presetTargetId)
        setName(presetTargetName ? `${presetTargetName} - ${t("title")}` : "")
      }
    }
  }, [open, presetOrganizationId, presetOrganizationName, presetTargetId, presetTargetName, t])

  const targets: Target[] = targetsData?.targets || []
  const engines = enginesData || []
  const organizations: Organization[] = organizationsData?.organizations || []

  // Get selected engines for display
  const selectedEngines = React.useMemo(() => {
    if (!engineIds.length || !engines.length) return []
    return engines.filter(e => engineIds.includes(e.id))
  }, [engineIds, engines])

  const resetForm = () => {
    setName("")
    setEngineIds([])
    setSelectedPresetId(null)
    setSelectionMode("organization")
    setSelectedOrgId(null)
    setSelectedTargetId(null)
    setCronExpression("0 2 * * *")
    setConfiguration("")
    setIsConfigEdited(false)
    resetStep()
  }

  // Handle configuration change from preset selector (may need confirmation)
  const handlePresetConfigChange = React.useCallback((value: string) => {
    if (isConfigEdited && configuration !== value) {
      setPendingConfigChange(value)
      setShowOverwriteConfirm(true)
    } else {
      setConfiguration(value)
      setIsConfigEdited(false)
    }
  }, [isConfigEdited, configuration])

  // Handle manual config editing
  const handleManualConfigChange = React.useCallback((value: string) => {
    setConfiguration(value)
    setIsConfigEdited(true)
  }, [])

  const handleEngineIdsChange = React.useCallback((newEngineIds: number[]) => {
    setEngineIds(newEngineIds)
  }, [])

  const handleOverwriteConfirm = () => {
    if (pendingConfigChange !== null) {
      setConfiguration(pendingConfigChange)
      setIsConfigEdited(false)
    }
    setShowOverwriteConfirm(false)
    setPendingConfigChange(null)
  }

  const handleOverwriteCancel = () => {
    setShowOverwriteConfirm(false)
    setPendingConfigChange(null)
  }

  const handleYamlValidationChange = (isValid: boolean) => {
    setIsYamlValid(isValid)
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) resetForm()
    onOpenChange(isOpen)
  }

  const handleOrgSelect = (orgId: number) => {
    setSelectedOrgId(selectedOrgId === orgId ? null : orgId)
  }

  const handleTargetSelect = (targetId: number) => {
    setSelectedTargetId(selectedTargetId === targetId ? null : targetId)
  }

  const validateCurrentStep = (): boolean => {
    if (hasPreset) {
      switch (currentStep) {
        case 1: // Basic info (preset mode)
          if (!name.trim()) { toast.error(t("form.taskNameRequired")); return false }
          return true
        case 2: // Select engine
          if (!selectedPresetId) { toast.error(t("form.scanEngineRequired")); return false }
          if (engineIds.length === 0) { toast.error(t("form.scanEngineRequired")); return false }
          return true
        case 3: // Edit config
          if (!configuration.trim()) { toast.error(t("form.configurationRequired")); return false }
          if (!isYamlValid) { toast.error(t("form.yamlInvalid")); return false }
          return true
        case 4: // Schedule
          const parts = cronExpression.trim().split(/\s+/)
          if (parts.length !== 5) { toast.error(t("form.cronRequired")); return false }
          return true
        default: return true
      }
    }

    switch (currentStep) {
      case 1: // Basic info
        if (!name.trim()) { toast.error(t("form.taskNameRequired")); return false }
        return true
      case 2: // Select target
        if (selectionMode === "organization") {
          if (!selectedOrgId) { toast.error(t("toast.selectOrganization")); return false }
        } else {
          if (!selectedTargetId) { toast.error(t("toast.selectTarget")); return false }
        }
        return true
      case 3: // Select engine
        if (!selectedPresetId) { toast.error(t("form.scanEngineRequired")); return false }
        if (engineIds.length === 0) { toast.error(t("form.scanEngineRequired")); return false }
        return true
      case 4: // Edit config
        if (!configuration.trim()) { toast.error(t("form.configurationRequired")); return false }
        if (!isYamlValid) { toast.error(t("form.yamlInvalid")); return false }
        return true
      case 5: // Schedule
        const cronParts = cronExpression.trim().split(/\s+/)
        if (cronParts.length !== 5) { toast.error(t("form.cronRequired")); return false }
        return true
      default: return true
    }
  }

  const handleNext = () => { if (validateCurrentStep()) goToNextStep() }

  const handleSubmit = () => {
    if (!validateCurrentStep()) return
    const request: CreateScheduledScanRequest = {
      name: name.trim(),
      configuration: configuration.trim(),
      engineIds: engineIds,
      engineNames: selectedEngines.map(e => e.name),
      cronExpression: cronExpression.trim(),
    }
    if (selectionMode === "organization" && selectedOrgId) {
      request.organizationId = selectedOrgId
    } else if (selectedTargetId) {
      request.targetId = selectedTargetId
    }
    createScheduledScan(request, {
      onSuccess: () => { resetForm(); onOpenChange(false); onSuccess?.() },
      onError: (err: unknown) => {
        const error = err as { response?: { data?: { error?: { code?: string; message?: string } } } }
        if (error?.response?.data?.error?.code === 'CONFIG_CONFLICT') {
          toast.error(t("toast.configConflict"), {
            description: error.response.data.error.message,
          })
        }
      },
    })
  }

  const getCronDescription = (cron: string): string => {
    try {
      const parts = cron.trim().split(/\s+/)
      if (parts.length !== 5) return t("form.invalidExpression")
      return cronstrue.toString(cron, { locale: locale === 'zh' ? "zh_CN" : "en" })
    } catch { return t("form.invalidExpression") }
  }

  const getNextExecutions = (cron: string, count: number = 3): string[] => {
    try {
      const parts = cron.trim().split(/\s+/)
      if (parts.length !== 5) return []
      const interval = CronExpressionParser.parse(cron, { currentDate: new Date(), tz: "Asia/Shanghai" })
      const results: string[] = []
      for (let i = 0; i < count; i++) {
        const next = interval.next()
        results.push(next.toDate().toLocaleString(locale === 'zh' ? "zh-CN" : "en-US"))
      }
      return results
    } catch { return [] }
  }


  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[900px] p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>{t("createTitle")}</DialogTitle>
              <DialogDescription className="mt-1">{t("createDesc")}</DialogDescription>
            </div>
            {/* Step indicator */}
            <div className="text-sm text-muted-foreground mr-8">
              {t("stepIndicator", { current: currentStep, total: totalSteps })}
            </div>
          </div>
        </DialogHeader>

        <div className="border-t h-[480px] overflow-hidden">
          {/* Step 1: Basic Info + Scan Mode (full mode only) */}
          {currentStep === 1 && !hasPreset && (
            <div className="p-6 space-y-6 overflow-y-auto h-full">
              <div className="space-y-2">
                <Label htmlFor="name">{t("form.taskName")} *</Label>
                <Input id="name" placeholder={t("form.taskNamePlaceholder")} value={name} onChange={(e) => setName(e.target.value)} />
                <p className="text-xs text-muted-foreground">{t("form.taskNameDesc")}</p>
              </div>
              <Separator />
              <div className="space-y-3">
                <Label>{t("form.selectScanMode")}</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className={cn(
                    "flex flex-col items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors",
                    selectionMode === "organization" ? "border-primary bg-primary/5" : "border-muted hover:border-muted-foreground/50"
                  )} onClick={() => { setSelectionMode("organization"); setSelectedTargetId(null) }}>
                    <IconBuilding className="h-8 w-8" />
                    <div className="text-center">
                      <p className="font-medium">{t("form.organizationScan")}</p>
                      <p className="text-xs text-muted-foreground">{t("form.organizationScanDesc")}</p>
                    </div>
                    {selectionMode === "organization" && <IconCheck className="h-5 w-5 text-primary" />}
                  </div>
                  <div className={cn(
                    "flex flex-col items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-colors",
                    selectionMode === "target" ? "border-primary bg-primary/5" : "border-muted hover:border-muted-foreground/50"
                  )} onClick={() => { setSelectionMode("target"); setSelectedOrgId(null) }}>
                    <IconTarget className="h-8 w-8" />
                    <div className="text-center">
                      <p className="font-medium">{t("form.targetScan")}</p>
                      <p className="text-xs text-muted-foreground">{t("form.targetScanDesc")}</p>
                    </div>
                    {selectionMode === "target" && <IconCheck className="h-5 w-5 text-primary" />}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {selectionMode === "organization" ? t("form.organizationScanHint") : t("form.targetScanHint")}
                </p>
              </div>
            </div>
          )}

          {/* Step 1: Basic Info (preset mode - name only, target is locked) */}
          {currentStep === 1 && hasPreset && (
            <div className="p-6 space-y-6 overflow-y-auto h-full">
              <div className="space-y-2">
                <Label htmlFor="name">{t("form.taskName")} *</Label>
                <Input id="name" placeholder={t("form.taskNamePlaceholder")} value={name} onChange={(e) => setName(e.target.value)} />
                <p className="text-xs text-muted-foreground">{t("form.taskNameDesc")}</p>
              </div>
              <Separator />
              <div className="space-y-3">
                <Label>{t("form.scanTarget")}</Label>
                <div className="flex items-center gap-2 p-4 border rounded-lg bg-muted/50">
                  <IconTarget className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">{presetTargetName || presetOrganizationName}</span>
                  <Badge variant="secondary" className="ml-auto">
                    {presetTargetId ? t("form.targetScan") : t("form.organizationScan")}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{t("form.presetTargetHint")}</p>
              </div>
            </div>
          )}

          {/* Step 2: Select Target (Organization or Target) */}
          {currentStep === 2 && !hasPreset && (
            <div className="p-6 space-y-4 overflow-y-auto h-full">
              {selectionMode === "organization" ? (
                <>
                  <Label>{t("form.selectOrganization")}</Label>
                  <div className="flex items-center gap-2 mb-2">
                    <Input placeholder={t("form.searchOrganization")} value={orgSearchInput} onChange={(e) => setOrgSearchInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleOrgSearch()} className="h-9 flex-1" />
                    <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={handleOrgSearch} disabled={isOrgFetching}>
                      {isOrgFetching ? <IconLoader2 className="h-4 w-4 animate-spin" /> : <IconSearch className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Command className="border rounded-lg" shouldFilter={false}>
                    <CommandList className="max-h-[250px]">
                      {organizations.length === 0 ? <CommandEmpty>{t("form.noOrganization")}</CommandEmpty> : (
                        <CommandGroup>
                          {organizations.map((org) => (
                            <CommandItem key={org.id} value={org.id.toString()} onSelect={() => handleOrgSelect(org.id)} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Checkbox checked={selectedOrgId === org.id} onCheckedChange={() => handleOrgSelect(org.id)} />
                                <span>{org.name}</span>
                              </div>
                              <span className="text-xs text-muted-foreground">{t("form.targetCount", { count: org.targetCount || 0 })}</span>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                  {selectedOrgId && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">{t("form.selectedOrganization")}</p>
                      <Badge variant="secondary">
                        {organizations.find((o) => o.id === selectedOrgId)?.name}
                        <IconX className="h-3 w-3 ml-1 cursor-pointer" onClick={() => setSelectedOrgId(null)} />
                      </Badge>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <Label>{t("form.selectTarget")}</Label>
                  <div className="flex items-center gap-2 mb-2">
                    <Input placeholder={t("form.searchTarget")} value={targetSearchInput} onChange={(e) => setTargetSearchInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleTargetSearch()} className="h-9 flex-1" />
                    <Button type="button" variant="outline" size="icon" className="h-9 w-9" onClick={handleTargetSearch} disabled={isTargetFetching}>
                      {isTargetFetching ? <IconLoader2 className="h-4 w-4 animate-spin" /> : <IconSearch className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Command className="border rounded-lg" shouldFilter={false}>
                    <CommandList className="max-h-[250px]">
                      {targets.length === 0 ? <CommandEmpty>{t("form.noTarget")}</CommandEmpty> : (
                        <CommandGroup>
                          {targets.map((target) => (
                            <CommandItem key={target.id} value={target.id.toString()} onSelect={() => handleTargetSelect(target.id)} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Checkbox checked={selectedTargetId === target.id} onCheckedChange={() => handleTargetSelect(target.id)} />
                                <span>{target.name}</span>
                              </div>
                              {target.organizations && target.organizations.length > 0 && (
                                <span className="text-xs text-muted-foreground">{target.organizations.map((o) => o.name).join(", ")}</span>
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                  {selectedTargetId && (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">{t("form.selectedTarget")}</p>
                      <Badge variant="outline">
                        {targets.find((t) => t.id === selectedTargetId)?.name}
                        <IconX className="h-3 w-3 ml-1 cursor-pointer" onClick={() => setSelectedTargetId(null)} />
                      </Badge>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Step 3 (full) / Step 2 (preset): Select Engine */}
          {((currentStep === 3 && !hasPreset) || (currentStep === 2 && hasPreset)) && engines.length > 0 && (
            <EnginePresetSelector
              engines={engines}
              selectedEngineIds={engineIds}
              selectedPresetId={selectedPresetId}
              onPresetChange={setSelectedPresetId}
              onEngineIdsChange={handleEngineIdsChange}
              onConfigurationChange={handlePresetConfigChange}
              disabled={isPending}
            />
          )}

          {/* Step 4 (full) / Step 3 (preset): Edit Configuration */}
          {((currentStep === 4 && !hasPreset) || (currentStep === 3 && hasPreset)) && (
            <ScanConfigEditor
              configuration={configuration}
              onChange={handleManualConfigChange}
              onValidationChange={handleYamlValidationChange}
              selectedEngines={selectedEngines}
              isConfigEdited={isConfigEdited}
              disabled={isPending}
            />
          )}

          {/* Step 5 (full) / Step 4 (preset): Schedule Settings */}
          {((currentStep === 5 && !hasPreset) || (currentStep === 4 && hasPreset)) && (
            <div className="p-6 space-y-6 overflow-y-auto h-full">
              <div className="space-y-2">
                <Label>{t("form.cronExpression")} *</Label>
                <Input placeholder={t("form.cronPlaceholder")} value={cronExpression} onChange={(e) => setCronExpression(e.target.value)} className="font-mono" />
                <p className="text-xs text-muted-foreground">{t("form.cronFormat")}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">{t("form.quickSelect")}</Label>
                <div className="flex flex-wrap gap-2">
                  {CRON_PRESETS.map((preset) => (
                    <Badge key={preset.value} variant={cronExpression === preset.value ? "default" : "outline"} className="cursor-pointer" onClick={() => setCronExpression(preset.value)}>
                      {preset.label}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <IconClock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{t("form.executionPreview")}</span>
                  {cronExpression.trim().split(/\s+/).length === 5 && (
                    <Badge variant="secondary" className="ml-auto"><IconCheck className="h-3 w-3 mr-1" />{t("form.valid")}</Badge>
                  )}
                </div>
                <p className="text-sm">{getCronDescription(cronExpression)}</p>
                <Separator />
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t("form.nextExecutionTime")}</p>
                  {getNextExecutions(cronExpression).map((time, i) => (
                    <p key={i} className="text-sm">• {time}{i === 0 && <span className="text-muted-foreground ml-2">{t("form.upcoming")}</span>}</p>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t flex justify-between">
          <Button variant="outline" onClick={goToPrevStep} disabled={currentStep === 1}>
            <IconChevronLeft className="h-4 w-4 mr-1" />{t("buttons.previous")}
          </Button>
          {currentStep < totalSteps ? (
            <Button onClick={handleNext}>{t("buttons.next")}<IconChevronRight className="h-4 w-4 ml-1" /></Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isPending}>
              {isPending && <IconLoader2 className="h-4 w-4 mr-1 animate-spin" />}{t("buttons.createTask")}
            </Button>
          )}
        </div>
      </DialogContent>
      
      {/* Overwrite confirmation dialog */}
      <AlertDialog open={showOverwriteConfirm} onOpenChange={setShowOverwriteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("overwriteConfirm.title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("overwriteConfirm.description")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleOverwriteCancel}>
              {t("overwriteConfirm.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleOverwriteConfirm}>
              {t("overwriteConfirm.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}
