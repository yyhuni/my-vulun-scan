"use client"

import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { useNotificationSettings, useUpdateNotificationSettings } from '@/hooks/use-notification-settings'

const schema = z
  .object({
    discord: z.object({
      enabled: z.boolean(),
      webhookUrl: z.string().url('请输入有效的 Discord Webhook URL').or(z.literal('')),
    }),
    preferences: z.object({
      scanUpdates: z.boolean(),
      interestingSubdomains: z.boolean(),
      vulnerabilitiesFound: z.boolean(),
      subdomainChanges: z.boolean(),
    }),
  })
  .superRefine((val, ctx) => {
    if (val.discord.enabled) {
      if (!val.discord.webhookUrl || val.discord.webhookUrl.trim() === '') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: '启用 Discord 时必须填写 Webhook URL',
          path: ['discord', 'webhookUrl'],
        })
      }
    }
  })

export default function NotificationSettingsPage() {
  const { data, isLoading } = useNotificationSettings()
  const updateMutation = useUpdateNotificationSettings()

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    values: data ?? {
      discord: { enabled: false, webhookUrl: '' },
      preferences: {
        scanUpdates: true,
        interestingSubdomains: true,
        vulnerabilitiesFound: true,
        subdomainChanges: false,
      },
    },
  })

  const onSubmit = (values: z.infer<typeof schema>) => {
    updateMutation.mutate(values)
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">通知设置</h1>
        <p className="text-muted-foreground mt-1">目前仅支持 Discord 通知</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Discord</CardTitle>
          <CardDescription>推荐使用。将通知推送到你的 Discord 频道。</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="discord.enabled"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <div>
                        <FormLabel>启用 Discord 通知</FormLabel>
                        <FormDescription>开启后，系统会把通知发送到你的 Discord Webhook。</FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} disabled={isLoading || updateMutation.isPending} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="discord.webhookUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Webhook URL</FormLabel>
                      <FormControl>
                        <Input placeholder="https://discord.com/api/webhooks/xxxxxxxxxx" {...field} disabled={!form.watch('discord.enabled') || isLoading || updateMutation.isPending} />
                      </FormControl>
                      <FormDescription>
                        参考 Discord Webhook 文档创建并粘贴你的 Webhook 地址。
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-medium">发送通知类型</h3>

                <FormField
                  control={form.control}
                  name="preferences.scanUpdates"
                  render={({ field }) => (
                    <FormItem className="flex items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>扫描相关更新</FormLabel>
                        <FormDescription>例如：扫描启动、扫描完成</FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="preferences.interestingSubdomains"
                  render={({ field }) => (
                    <FormItem className="flex items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>有趣的子域</FormLabel>
                        <FormDescription>发现可能有价值的子域名时通知</FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="preferences.vulnerabilitiesFound"
                  render={({ field }) => (
                    <FormItem className="flex items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>发现漏洞</FormLabel>
                        <FormDescription>信息级别的漏洞不会通知</FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="preferences.subdomainChanges"
                  render={({ field }) => (
                    <FormItem className="flex items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>子域名变更</FormLabel>
                        <FormDescription>新发现或不可达的子域名</FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-3">
                <Button type="submit" disabled={updateMutation.isPending || isLoading}>保存</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}
