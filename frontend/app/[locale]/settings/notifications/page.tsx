"use client"

import React from 'react'
import { useForm } from 'react-hook-form'
import { useTranslations } from 'next-intl'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { IconBrandDiscord, IconMail, IconBrandSlack, IconScan, IconShieldCheck, IconWorld, IconSettings } from '@tabler/icons-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { useNotificationSettings, useUpdateNotificationSettings } from '@/hooks/use-notification-settings'

export default function NotificationSettingsPage() {
  const t = useTranslations("settings.notifications")
  const { data, isLoading } = useNotificationSettings()
  const updateMutation = useUpdateNotificationSettings()

  // Schema with translations
  const schema = z
    .object({
      discord: z.object({
        enabled: z.boolean(),
        webhookUrl: z.string().url(t("discord.urlInvalid")).or(z.literal('')),
      }),
      wecom: z.object({
        enabled: z.boolean(),
        webhookUrl: z.string().url(t("wecom.urlInvalid")).or(z.literal('')),
      }),
      categories: z.object({
        scan: z.boolean(),
        vulnerability: z.boolean(),
        asset: z.boolean(),
        system: z.boolean(),
      }),
    })
    .superRefine((val, ctx) => {
      if (val.discord.enabled) {
        if (!val.discord.webhookUrl || val.discord.webhookUrl.trim() === '') {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t("discord.requiredError"),
            path: ['discord', 'webhookUrl'],
          })
        }
      }
      if (val.wecom.enabled) {
        if (!val.wecom.webhookUrl || val.wecom.webhookUrl.trim() === '') {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: t("wecom.requiredError"),
            path: ['wecom', 'webhookUrl'],
          })
        }
      }
    })

  const NOTIFICATION_CATEGORIES = [
    {
      key: 'scan' as const,
      label: t("categories.scan"),
      description: t("categories.scanDesc"),
      icon: IconScan,
    },
    {
      key: 'vulnerability' as const,
      label: t("categories.vulnerability"),
      description: t("categories.vulnerabilityDesc"),
      icon: IconShieldCheck,
    },
    {
      key: 'asset' as const,
      label: t("categories.asset"),
      description: t("categories.assetDesc"),
      icon: IconWorld,
    },
    {
      key: 'system' as const,
      label: t("categories.system"),
      description: t("categories.systemDesc"),
      icon: IconSettings,
    },
  ]

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    values: data ?? {
      discord: { enabled: false, webhookUrl: '' },
      wecom: { enabled: false, webhookUrl: '' },
      categories: {
        scan: true,
        vulnerability: true,
        asset: true,
        system: false,
      },
    },
  })

  const onSubmit = (values: z.infer<typeof schema>) => {
    updateMutation.mutate(values)
  }

  const discordEnabled = form.watch('discord.enabled')
  const wecomEnabled = form.watch('wecom.enabled')

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("pageTitle")}</h1>
        <p className="text-muted-foreground mt-1">{t("pageDesc")}</p>
      </div>

      <Tabs defaultValue="channels" className="w-full">
        <TabsList>
          <TabsTrigger value="channels">{t("tabs.channels")}</TabsTrigger>
          <TabsTrigger value="preferences">{t("tabs.preferences")}</TabsTrigger>
        </TabsList>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            {/* Push channels tab */}
            <TabsContent value="channels" className="space-y-4 mt-4">
              {/* Discord card */}
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#5865F2]/10">
                        <IconBrandDiscord className="h-5 w-5 text-[#5865F2]" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{t("discord.title")}</CardTitle>
                        <CardDescription>{t("discord.description")}</CardDescription>
                      </div>
                    </div>
                    <FormField
                      control={form.control}
                      name="discord.enabled"
                      render={({ field }) => (
                        <FormControl>
                          <Switch 
                            checked={field.value} 
                            onCheckedChange={field.onChange} 
                            disabled={isLoading || updateMutation.isPending} 
                          />
                        </FormControl>
                      )}
                    />
                  </div>
                </CardHeader>
                {discordEnabled && (
                  <CardContent className="pt-0">
                    <Separator className="mb-4" />
                    <FormField
                      control={form.control}
                      name="discord.webhookUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("discord.webhookLabel")}</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder={t("discord.webhookPlaceholder")} 
                              {...field} 
                              disabled={isLoading || updateMutation.isPending} 
                            />
                          </FormControl>
                          <FormDescription>
                            {t("discord.webhookHelp")}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                )}
              </Card>

              {/* Email - Coming soon */}
              <Card className="opacity-60">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                        <IconMail className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">{t("emailChannel.title")}</CardTitle>
                          <Badge variant="secondary" className="text-xs">{t("emailChannel.comingSoon")}</Badge>
                        </div>
                        <CardDescription>{t("emailChannel.description")}</CardDescription>
                      </div>
                    </div>
                    <Switch disabled />
                  </div>
                </CardHeader>
              </Card>

              {/* 企业微信 */}
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#07C160]/10">
                        <IconBrandSlack className="h-5 w-5 text-[#07C160]" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{t("wecom.title")}</CardTitle>
                        <CardDescription>{t("wecom.description")}</CardDescription>
                      </div>
                    </div>
                    <FormField
                      control={form.control}
                      name="wecom.enabled"
                      render={({ field }) => (
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={isLoading || updateMutation.isPending}
                          />
                        </FormControl>
                      )}
                    />
                  </div>
                </CardHeader>
                {wecomEnabled && (
                  <CardContent className="pt-0">
                    <Separator className="mb-4" />
                    <FormField
                      control={form.control}
                      name="wecom.webhookUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("wecom.webhookLabel")}</FormLabel>
                          <FormControl>
                            <Input
                              placeholder={t("wecom.webhookPlaceholder")}
                              {...field}
                              disabled={isLoading || updateMutation.isPending}
                            />
                          </FormControl>
                          <FormDescription>
                            {t("wecom.webhookHelp")}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                )}
              </Card>
            </TabsContent>

            {/* Notification preferences tab */}
            <TabsContent value="preferences" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t("categories.title")}</CardTitle>
                  <CardDescription>{t("categories.description")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-1">
                  {NOTIFICATION_CATEGORIES.map((category) => (
                    <FormField
                      key={category.key}
                      control={form.control}
                      name={`categories.${category.key}`}
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between py-3 border-b last:border-b-0">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                              <category.icon className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <FormLabel className="text-sm font-medium cursor-pointer">
                                {category.label}
                              </FormLabel>
                              <FormDescription className="text-xs">
                                {category.description}
                              </FormDescription>
                            </div>
                          </div>
                          <FormControl>
                            <Switch 
                              checked={field.value} 
                              onCheckedChange={field.onChange}
                              disabled={isLoading || updateMutation.isPending}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Save button */}
            <div className="flex justify-end mt-6">
              <Button type="submit" disabled={updateMutation.isPending || isLoading}>
                {t("saveSettings")}
              </Button>
            </div>
          </form>
        </Form>
      </Tabs>
    </div>
  )
}
