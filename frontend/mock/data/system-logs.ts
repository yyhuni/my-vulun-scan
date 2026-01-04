import type { SystemLogResponse, LogFilesResponse, LogFile } from '@/types/system-log.types'

export const mockLogFiles: LogFile[] = [
  {
    filename: 'xingrin.log',
    category: 'system',
    size: 1234567,
    modifiedAt: '2024-12-28T10:00:00Z',
  },
  {
    filename: 'xingrin-error.log',
    category: 'error',
    size: 45678,
    modifiedAt: '2024-12-28T09:30:00Z',
  },
  {
    filename: 'worker.log',
    category: 'system',
    size: 234567,
    modifiedAt: '2024-12-28T10:00:00Z',
  },
  {
    filename: 'celery.log',
    category: 'system',
    size: 567890,
    modifiedAt: '2024-12-28T09:45:00Z',
  },
  {
    filename: 'nginx-access.log',
    category: 'system',
    size: 12345678,
    modifiedAt: '2024-12-28T10:00:00Z',
  },
  {
    filename: 'nginx-error.log',
    category: 'error',
    size: 23456,
    modifiedAt: '2024-12-28T08:00:00Z',
  },
]

export const mockSystemLogContent = `[2024-12-28 10:00:00] INFO: Server started on port 8000
[2024-12-28 10:00:01] INFO: Database connection established
[2024-12-28 10:00:02] INFO: Redis connection established
[2024-12-28 10:00:03] INFO: Worker node registered: local-worker-1
[2024-12-28 10:00:05] INFO: Celery worker started with 4 concurrent tasks
[2024-12-28 10:01:00] INFO: New scan task created: scan-001
[2024-12-28 10:01:01] INFO: Task scan-001 assigned to worker local-worker-1
[2024-12-28 10:01:05] INFO: Subdomain enumeration started for target: acme.com
[2024-12-28 10:02:30] INFO: Found 45 subdomains for acme.com
[2024-12-28 10:02:31] INFO: Port scanning started for 45 hosts
[2024-12-28 10:05:00] INFO: Port scanning completed, found 123 open ports
[2024-12-28 10:05:01] INFO: HTTP probing started for 123 endpoints
[2024-12-28 10:08:00] INFO: HTTP probing completed, found 89 live websites
[2024-12-28 10:08:01] INFO: Fingerprint detection started
[2024-12-28 10:10:00] INFO: Fingerprint detection completed
[2024-12-28 10:10:01] INFO: Vulnerability scanning started with nuclei
[2024-12-28 10:15:00] INFO: Vulnerability scanning completed, found 5 vulnerabilities
[2024-12-28 10:15:01] INFO: Scan task scan-001 completed successfully
[2024-12-28 10:15:02] INFO: Results saved to database
[2024-12-28 10:15:03] INFO: Notification sent to Discord webhook`

export const mockErrorLogContent = `[2024-12-28 08:30:00] ERROR: Connection refused: Redis server not responding
[2024-12-28 08:30:01] ERROR: Retrying Redis connection in 5 seconds...
[2024-12-28 08:30:06] INFO: Redis connection recovered
[2024-12-28 09:15:00] WARNING: High memory usage detected (85%)
[2024-12-28 09:15:01] INFO: Running garbage collection
[2024-12-28 09:15:05] INFO: Memory usage reduced to 62%
[2024-12-28 09:30:00] ERROR: Worker node disconnected: remote-worker-2
[2024-12-28 09:30:01] WARNING: Reassigning 3 tasks from remote-worker-2
[2024-12-28 09:30:05] INFO: Tasks reassigned successfully`

export function getMockLogFiles(): LogFilesResponse {
  return {
    files: mockLogFiles,
  }
}

export function getMockSystemLogs(params?: {
  file?: string
  lines?: number
}): SystemLogResponse {
  const filename = params?.file || 'xingrin.log'
  const lines = params?.lines || 100

  let content: string
  if (filename.includes('error')) {
    content = mockErrorLogContent
  } else {
    content = mockSystemLogContent
  }

  // 模拟行数限制
  const contentLines = content.split('\n')
  const limitedContent = contentLines.slice(-lines).join('\n')

  return {
    content: limitedContent,
  }
}
