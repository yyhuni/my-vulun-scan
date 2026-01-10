"use client"

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useQueryClient } from '@tanstack/react-query'
import {
  IconRadar,
  IconRefresh,
  IconExternalLink,
  IconBrandGithub,
  IconMessageReport,
  IconBook,
  IconFileText,
  IconCheck,
  IconArrowUp,
} from '@tabler/icons-react'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { useVersion } from '@/hooks/use-version'
import { VersionService } from '@/services/version.service'
import type { UpdateCheckResult } from '@/types/version.types'

interface AboutDialogProps {
  children: React.ReactNode
}

export function AboutDialog({ children }: AboutDialogProps) {
  const t = useTranslations('about')
  const { data: versionData } = useVersion()
  const queryClient = useQueryClient()

  const [isChecking, setIsChecking] = useState(false)
  const [updateResult, setUpdateResult] = useState<UpdateCheckResult | null>(null)
  const [checkError, setCheckError] = useState<string | null>(null)

  const handleCheckUpdate = async () => {
    setIsChecking(true)
    setCheckError(null)
    try {
      const result = await VersionService.checkUpdate()
      setUpdateResult(result)
      queryClient.setQueryData(['check-update'], result)
    } catch {
      setCheckError(t('checkFailed'))
    } finally {
      setIsChecking(false)
    }
  }

  const currentVersion = updateResult?.currentVersion || versionData?.version || '-'
  const latestVersion = updateResult?.latestVersion
  const hasUpdate = updateResult?.hasUpdate

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Logo and name */}
          <div className="flex flex-col items-center py-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-3">
              <IconRadar className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">XingRin</h2>
            <p className="text-sm text-muted-foreground">{t('description')}</p>
          </div>

          {/* Version info */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('currentVersion')}</span>
              <span className="font-mono text-sm">{currentVersion}</span>
            </div>

            {updateResult && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('latestVersion')}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">{latestVersion}</span>
                  {hasUpdate ? (
                    <Badge variant="default" className="gap-1">
                      <IconArrowUp className="h-3 w-3" />
                      {t('updateAvailable')}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1">
                      <IconCheck className="h-3 w-3" />
                      {t('upToDate')}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {checkError && (
              <p className="text-sm text-destructive">{checkError}</p>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={handleCheckUpdate}
                disabled={isChecking}
              >
                <IconRefresh className={`h-4 w-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
                {isChecking ? t('checking') : t('checkUpdate')}
              </Button>

              {hasUpdate && updateResult?.releaseUrl && (
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1"
                  asChild
                >
                  <a href={updateResult.releaseUrl} target="_blank" rel="noopener noreferrer">
                    <IconExternalLink className="h-4 w-4 mr-2" />
                    {t('viewRelease')}
                  </a>
                </Button>
              )}
            </div>

            {hasUpdate && (
              <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                <p>{t('updateHint')}</p>
                <code className="mt-1 block rounded bg-background px-2 py-1 font-mono text-xs">
                  sudo ./update.sh
                </code>
              </div>
            )}
          </div>

          <Separator />

          {/* Links */}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="ghost" size="sm" className="justify-start" asChild>
              <a href="https://github.com/yyhuni/xingrin" target="_blank" rel="noopener noreferrer">
                <IconBrandGithub className="h-4 w-4 mr-2" />
                GitHub
              </a>
            </Button>
            <Button variant="ghost" size="sm" className="justify-start" asChild>
              <a href="https://github.com/yyhuni/xingrin/releases" target="_blank" rel="noopener noreferrer">
                <IconFileText className="h-4 w-4 mr-2" />
                {t('changelog')}
              </a>
            </Button>
            <Button variant="ghost" size="sm" className="justify-start" asChild>
              <a href="https://github.com/yyhuni/xingrin/issues" target="_blank" rel="noopener noreferrer">
                <IconMessageReport className="h-4 w-4 mr-2" />
                {t('feedback')}
              </a>
            </Button>
            <Button variant="ghost" size="sm" className="justify-start" asChild>
              <a href="https://github.com/yyhuni/xingrin#readme" target="_blank" rel="noopener noreferrer">
                <IconBook className="h-4 w-4 mr-2" />
                {t('docs')}
              </a>
            </Button>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground">
            © 2025 XingRin · MIT License
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
