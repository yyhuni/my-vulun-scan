#!/usr/bin/env node

/**
 * Mock 开关脚本
 * 
 * 用法：
 *   npm run mock:enable   # 启用 Mock
 *   npm run mock:disable  # 禁用 Mock
 *   npm run mock:status   # 查看 Mock 状态
 */

const fs = require('fs')
const path = require('path')

const ENV_FILE = path.join(__dirname, '../.env.local')
const MOCK_KEY = 'NEXT_PUBLIC_ENABLE_MOCK'

function readEnvFile() {
  if (!fs.existsSync(ENV_FILE)) {
    return {}
  }
  
  const content = fs.readFileSync(ENV_FILE, 'utf-8')
  const env = {}
  
  content.split('\n').forEach(line => {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=')
      env[key.trim()] = valueParts.join('=').trim()
    }
  })
  
  return env
}

function writeEnvFile(env) {
  const lines = Object.entries(env).map(([key, value]) => `${key}=${value}`)
  fs.writeFileSync(ENV_FILE, lines.join('\n') + '\n')
}

function enableMock() {
  const env = readEnvFile()
  env[MOCK_KEY] = 'true'
  writeEnvFile(env)
  console.log('✅ Mock 已启用')
  console.log('💡 重启开发服务器以生效')
}

function disableMock() {
  const env = readEnvFile()
  env[MOCK_KEY] = 'false'
  writeEnvFile(env)
  console.log('✅ Mock 已禁用')
  console.log('💡 重启开发服务器以生效')
}

function checkStatus() {
  const env = readEnvFile()
  const status = env[MOCK_KEY]
  
  if (status === 'true') {
    console.log('✅ Mock 当前状态：已启用')
  } else if (status === 'false') {
    console.log('❌ Mock 当前状态：已禁用')
  } else {
    console.log('⚠️  Mock 当前状态：未配置（默认禁用）')
  }
}

const command = process.argv[2]

switch (command) {
  case 'enable':
    enableMock()
    break
  case 'disable':
    disableMock()
    break
  case 'status':
    checkStatus()
    break
  default:
    console.log('用法：')
    console.log('  npm run mock:enable   # 启用 Mock')
    console.log('  npm run mock:disable  # 禁用 Mock')
    console.log('  npm run mock:status   # 查看 Mock 状态')
    process.exit(1)
}

