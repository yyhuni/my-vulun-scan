'use client'

import { UploadIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { createContext, useContext } from 'react'
import type { DropEvent, DropzoneOptions, FileRejection } from 'react-dropzone'
import { useDropzone } from 'react-dropzone'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type DropzoneContextType = {
  src?: File[]
  accept?: DropzoneOptions['accept']
  maxSize?: DropzoneOptions['maxSize']
  minSize?: DropzoneOptions['minSize']
  maxFiles?: DropzoneOptions['maxFiles']
}

const renderBytes = (bytes: number) => {
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }

  return `${size.toFixed(2)}${units[unitIndex]}`
}

const DropzoneContext = createContext<DropzoneContextType | undefined>(
  undefined
)

export type DropzoneProps = Omit<DropzoneOptions, 'onDrop'> & {
  src?: File[]
  className?: string
  onDrop?: (
    acceptedFiles: File[],
    fileRejections: FileRejection[],
    event: DropEvent
  ) => void
  children?: ReactNode
}

export const Dropzone = ({
  accept,
  maxFiles = 1,
  maxSize,
  minSize,
  onDrop,
  onError,
  disabled,
  src,
  className,
  children,
  ...props
}: DropzoneProps) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept,
    maxFiles,
    maxSize,
    minSize,
    onError,
    disabled,
    onDrop: (acceptedFiles, fileRejections, event) => {
      if (fileRejections.length > 0) {
        const message = fileRejections.at(0)?.errors.at(0)?.message
        onError?.(new Error(message))
        return
      }

      onDrop?.(acceptedFiles, fileRejections, event)
    },
    ...props,
  })

  return (
    <DropzoneContext.Provider
      key={JSON.stringify(src)}
      value={{ src, accept, maxSize, minSize, maxFiles }}
    >
      <Button
        className={cn(
          'relative h-auto w-full flex-col overflow-hidden p-8',
          isDragActive && 'outline-none ring-2 ring-ring',
          className
        )}
        disabled={disabled}
        type="button"
        variant="outline"
        {...getRootProps()}
      >
        <input {...getInputProps()} disabled={disabled} />
        {children}
      </Button>
    </DropzoneContext.Provider>
  )
}

const useDropzoneContext = () => {
  const context = useContext(DropzoneContext)

  if (!context) {
    throw new Error('useDropzoneContext must be used within a Dropzone')
  }

  return context
}

export type DropzoneContentProps = {
  children?: ReactNode
  className?: string
}

const maxLabelItems = 3

export const DropzoneContent = ({
  children,
  className,
}: DropzoneContentProps) => {
  const { src } = useDropzoneContext()
  const t = useTranslations("common.dropzone")

  if (!src || src.length === 0) {
    return null
  }

  if (children) {
    return children
  }

  return (
    <div className={cn('flex flex-col items-center justify-center', className)}>
      <div className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <UploadIcon size={16} />
      </div>
      <p className="my-2 w-full truncate font-medium text-sm">
        {src.length > maxLabelItems
          ? t("moreFiles", { files: src.slice(0, maxLabelItems).map((file) => file.name).join(', '), count: src.length - maxLabelItems })
          : src.map((file) => file.name).join(', ')}
      </p>
      <p className="w-full text-wrap text-muted-foreground text-xs">
        {t("dragOrClickReplace")}
      </p>
    </div>
  )
}

export type DropzoneEmptyStateProps = {
  children?: ReactNode
  className?: string
}

export const DropzoneEmptyState = ({
  children,
  className,
}: DropzoneEmptyStateProps) => {
  const { src, accept, maxSize, minSize, maxFiles } = useDropzoneContext()
  const t = useTranslations("common.dropzone")

  if (src && src.length > 0) {
    return null
  }

  if (children) {
    return children
  }

  let caption = ''

  if (accept) {
    caption += t("supports") + ' '
    caption += Object.keys(accept).join(', ')
  }

  if (minSize && maxSize) {
    caption += ` ${t("sizeBetween", { min: renderBytes(minSize), max: renderBytes(maxSize) })}`
  } else if (minSize) {
    caption += ` ${t("minimum")} ${renderBytes(minSize)}`
  } else if (maxSize) {
    caption += ` ${t("maximum")} ${renderBytes(maxSize)}`
  }

  return (
    <div className={cn('flex flex-col items-center justify-center', className)}>
      <div className="flex size-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <UploadIcon size={16} />
      </div>
      <p className="my-2 w-full truncate text-wrap font-medium text-sm">
        {maxFiles === 1 ? t("uploadFile") : t("uploadFiles")}
      </p>
      <p className="w-full truncate text-wrap text-muted-foreground text-xs">
        {t("dragOrClick")}
      </p>
      {caption && (
        <p className="text-wrap text-muted-foreground text-xs mt-1">{caption}</p>
      )}
    </div>
  )
}
