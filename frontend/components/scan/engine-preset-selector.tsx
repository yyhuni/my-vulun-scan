"use client"

import React, { useMemo, useCallback } from "react"
import { Play, Server, Settings, Zap } from "lucide-react"
import { useTranslations } from "next-intl"

import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { CAPABILITY_CONFIG, parseEngineCapabilities, mergeEngineConfigurations } from "@/lib/engine-config"

import type { ScanEngine } from "@/types/engine.types"

export interface EnginePreset {
  id: string
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  engineIds: number[]
}

interface EnginePresetSelectorProps {
  engines: ScanEngine[]
  selectedEngineIds: number[]
  selectedPresetId: string | null
  onPresetChange: (presetId: string | null) => void
  onEngineIdsChange: (engineIds: number[]) => void
  onConfigurationChange: (config: string) => void
  disabled?: boolean
  className?: string
}

export function EnginePresetSelector({
  engines,
  selectedEngineIds,
  selectedPresetId,
  onPresetChange,
  onEngineIdsChange,
  onConfigurationChange,
  disabled = false,
  className,
}: EnginePresetSelectorProps) {
  const t = useTranslations("scan.initiate")
  const tStages = useTranslations("scan.progress.stages")

  // Preset definitions with precise engine filtering
  const enginePresets = useMemo(() => {
    if (!engines?.length) return []
    
    // Categorize engines by their capabilities
    const fullScanEngines: number[] = []
    const reconEngines: number[] = []
    const vulnEngines: number[] = []
    
    engines.forEach(e => {
      const caps = parseEngineCapabilities(e.configuration || "")
      const hasRecon = caps.includes("subdomain_discovery") || caps.includes("port_scan") || caps.includes("site_scan") || caps.includes("fingerprint_detect") || caps.includes("directory_scan") || caps.includes("url_fetch") || caps.includes("screenshot")
      const hasVuln = caps.includes("vuln_scan")
      
      if (hasRecon && hasVuln) {
        // Full capability engine - only for full scan
        fullScanEngines.push(e.id)
      } else if (hasRecon && !hasVuln) {
        // Recon only engine
        reconEngines.push(e.id)
      } else if (hasVuln && !hasRecon) {
        // Vuln only engine
        vulnEngines.push(e.id)
      }
    })
    
    return [
      {
        id: "full",
        label: t("presets.fullScan"),
        description: t("presets.fullScanDesc"),
        icon: Zap,
        engineIds: fullScanEngines,
      },
      {
        id: "recon",
        label: t("presets.recon"),
        description: t("presets.reconDesc"),
        icon: Server,
        engineIds: reconEngines,
      },
      {
        id: "vuln",
        label: t("presets.vulnScan"),
        description: t("presets.vulnScanDesc"),
        icon: Play,
        engineIds: vulnEngines,
      },
      {
        id: "custom",
        label: t("presets.custom"),
        description: t("presets.customDesc"),
        icon: Settings,
        engineIds: [],
      },
    ]
  }, [engines, t])

  const selectedEngines = useMemo(() => {
    if (!selectedEngineIds.length || !engines) return []
    return engines.filter((e) => selectedEngineIds.includes(e.id))
  }, [selectedEngineIds, engines])

  const selectedCapabilities = useMemo(() => {
    if (!selectedEngines.length) return []
    const allCaps = new Set<string>()
    selectedEngines.forEach((engine) => {
      parseEngineCapabilities(engine.configuration || "").forEach((cap) => allCaps.add(cap))
    })
    return Array.from(allCaps)
  }, [selectedEngines])

  // Get currently selected preset details
  const selectedPreset = useMemo(() => {
    return enginePresets.find(p => p.id === selectedPresetId)
  }, [enginePresets, selectedPresetId])

  // Get engines for the selected preset
  const presetEngines = useMemo(() => {
    if (!selectedPreset || selectedPreset.id === "custom") return []
    return engines?.filter(e => selectedPreset.engineIds.includes(e.id)) || []
  }, [selectedPreset, engines])

  // Update configuration when engines change
  const updateConfigurationFromEngines = useCallback((engineIds: number[]) => {
    if (!engines) return
    const selectedEngs = engines.filter(e => engineIds.includes(e.id))
    const mergedConfig = mergeEngineConfigurations(selectedEngs.map(e => e.configuration || ""))
    onConfigurationChange(mergedConfig)
  }, [engines, onConfigurationChange])

  const handlePresetSelect = useCallback((preset: EnginePreset) => {
    onPresetChange(preset.id)
    if (preset.id !== "custom") {
      onEngineIdsChange(preset.engineIds)
      updateConfigurationFromEngines(preset.engineIds)
    } else {
      // Custom mode - keep current selection or clear
      if (selectedEngineIds.length === 0) {
        onConfigurationChange("")
      }
    }
  }, [onPresetChange, onEngineIdsChange, updateConfigurationFromEngines, selectedEngineIds.length, onConfigurationChange])

  const handleEngineToggle = useCallback((engineId: number, checked: boolean) => {
    let newEngineIds: number[]
    if (checked) {
      newEngineIds = [...selectedEngineIds, engineId]
    } else {
      newEngineIds = selectedEngineIds.filter((id) => id !== engineId)
    }
    onEngineIdsChange(newEngineIds)
    updateConfigurationFromEngines(newEngineIds)
  }, [selectedEngineIds, onEngineIdsChange, updateConfigurationFromEngines])

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="flex-1 overflow-y-auto p-6">
        {/* Compact preset cards */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {enginePresets.map((preset) => {
            const isActive = selectedPresetId === preset.id
            const PresetIcon = preset.icon
            const matchedEngines = preset.id === "custom" 
              ? [] 
              : engines?.filter(e => preset.engineIds.includes(e.id)) || []
            
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handlePresetSelect(preset)}
                disabled={disabled}
                className={cn(
                  "flex flex-col items-center p-3 rounded-lg border-2 text-center transition-all",
                  isActive
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-muted/30",
                  disabled && "opacity-50 cursor-not-allowed"
                )}
              >
                <div className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg mb-2",
                  isActive ? "bg-primary text-primary-foreground" : "bg-muted"
                )}>
                  <PresetIcon className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium">{preset.label}</span>
                {preset.id !== "custom" && (
                  <span className="text-xs text-muted-foreground mt-1">
                    {matchedEngines.length} {t("presets.enginesCount")}
                  </span>
                )}
              </button>
            )
          })}
        </div>
        
        {/* Selected preset details */}
        {selectedPresetId && selectedPresetId !== "custom" && (
          <div className="border rounded-lg p-4 bg-muted/10">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-medium">{selectedPreset?.label}</h3>
                <p className="text-sm text-muted-foreground mt-1">{selectedPreset?.description}</p>
              </div>
            </div>
            
            {/* Capabilities */}
            <div className="mb-4">
              <h4 className="text-xs font-medium text-muted-foreground mb-2">{t("presets.capabilities")}</h4>
              <div className="flex flex-wrap gap-1.5">
                {selectedCapabilities.map((capKey) => {
                  const config = CAPABILITY_CONFIG[capKey]
                  return (
                    <Badge key={capKey} variant="outline" className={cn("text-xs", config?.color)}>
                      {tStages(capKey)}
                    </Badge>
                  )
                })}
              </div>
            </div>
            
            {/* Engines list */}
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-2">{t("presets.usedEngines")}</h4>
              <div className="flex flex-wrap gap-2">
                {presetEngines.map((engine) => (
                  <span key={engine.id} className="text-sm px-3 py-1.5 bg-background rounded-md border">
                    {engine.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* Custom mode engine selection */}
        {selectedPresetId === "custom" && (
          <div className="border rounded-lg p-4 bg-muted/10">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-medium">{selectedPreset?.label}</h3>
                <p className="text-sm text-muted-foreground mt-1">{selectedPreset?.description}</p>
              </div>
            </div>
            
            {/* Capabilities - dynamically calculated from selected engines */}
            <div className="mb-4">
              <h4 className="text-xs font-medium text-muted-foreground mb-2">{t("presets.capabilities")}</h4>
              <div className="flex flex-wrap gap-1.5">
                {selectedCapabilities.length > 0 ? (
                  selectedCapabilities.map((capKey) => {
                    const config = CAPABILITY_CONFIG[capKey]
                    return (
                      <Badge key={capKey} variant="outline" className={cn("text-xs", config?.color)}>
                        {tStages(capKey)}
                      </Badge>
                    )
                  })
                ) : (
                  <span className="text-xs text-muted-foreground">{t("presets.noCapabilities")}</span>
                )}
              </div>
            </div>
            
            {/* Engines list - selectable */}
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-2">{t("presets.usedEngines")}</h4>
              <div className="flex flex-wrap gap-2">
                {engines?.map((engine) => {
                  const isSelected = selectedEngineIds.includes(engine.id)
                  return (
                    <label
                      key={engine.id}
                      htmlFor={`preset-engine-${engine.id}`}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-md cursor-pointer transition-all border",
                        isSelected
                          ? "bg-primary/10 border-primary/30"
                          : "hover:bg-muted/50 border-border",
                        disabled && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <Checkbox
                        id={`preset-engine-${engine.id}`}
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          handleEngineToggle(engine.id, checked as boolean)
                        }}
                        disabled={disabled}
                        className="h-4 w-4"
                      />
                      <span className="text-sm">{engine.name}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          </div>
        )}
        
        {/* Empty state */}
        {!selectedPresetId && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Server className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm">{t("presets.selectHint")}</p>
          </div>
        )}
      </div>
    </div>
  )
}
