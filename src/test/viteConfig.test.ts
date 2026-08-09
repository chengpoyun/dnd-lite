// @vitest-environment node
// vite.config 會連帶載入 esbuild，esbuild 在 jsdom 環境下會因 TextEncoder 實作差異而拒絕啟動，
// 故這支測試改用 node 環境執行。
import { describe, it, expect } from 'vitest'
import type { ConfigEnv, UserConfig } from 'vite'
import viteConfig from '../../vite.config'

/**
 * vite.config.ts 的建置設定測試。
 *
 * 重點：正式站的 bundle 不應該保留 console.log 這類開發用日誌
 * （會把角色 ID、使用者 ID、DB 查詢耗時印在使用者的 console），
 * 但 console.warn / console.error 要留著，否則線上出問題時完全無從診斷。
 */
const resolve = (env: ConfigEnv): UserConfig =>
  (viteConfig as unknown as (env: ConfigEnv) => UserConfig)(env)

const buildEnv: ConfigEnv = { command: 'build', mode: 'production' }
const serveEnv: ConfigEnv = { command: 'serve', mode: 'development' }

describe('vite.config - 正式建置移除開發用日誌', () => {
  it('build 時應把 console.log / debug / info 標記為可移除', () => {
    const config = resolve(buildEnv)
    const pure = (config.esbuild as { pure?: string[] } | undefined)?.pure ?? []

    expect(pure).toContain('console.log')
    expect(pure).toContain('console.debug')
    expect(pure).toContain('console.info')
  })

  it('build 時應移除 debugger 敘述', () => {
    const config = resolve(buildEnv)
    const drop = (config.esbuild as { drop?: string[] } | undefined)?.drop ?? []

    expect(drop).toContain('debugger')
  })

  it('build 時不應移除 console.warn / console.error（線上診斷需要）', () => {
    const config = resolve(buildEnv)
    const esbuild = config.esbuild as { pure?: string[]; drop?: string[] } | undefined

    expect(esbuild?.pure ?? []).not.toContain('console.warn')
    expect(esbuild?.pure ?? []).not.toContain('console.error')
    // drop: ['console'] 會把所有 console 都拿掉，不可使用
    expect(esbuild?.drop ?? []).not.toContain('console')
  })

  it('dev（serve）時不應移除任何 console，保留開發可觀測性', () => {
    const config = resolve(serveEnv)
    const esbuild = config.esbuild as { pure?: string[]; drop?: string[] } | undefined

    expect(esbuild?.pure ?? []).toHaveLength(0)
    expect(esbuild?.drop ?? []).toHaveLength(0)
  })

  it('既有的建置設定不應被破壞', () => {
    const config = resolve(buildEnv)

    expect(config.base).toBe('/dnd-lite/')
    expect(config.build?.target).toContain('safari14')
  })
})

describe('vite.config - 第三方套件分包', () => {
  const getManualChunks = () => {
    const config = resolve(buildEnv)
    const output = config.build?.rollupOptions?.output as
      | { manualChunks?: (id: string) => string | undefined }
      | undefined
    const manualChunks = output?.manualChunks

    expect(typeof manualChunks).toBe('function')
    return manualChunks as (id: string) => string | undefined
  }

  it('react / react-dom / scheduler 應歸到 react-vendor', () => {
    const manualChunks = getManualChunks()

    expect(manualChunks('/app/node_modules/react/index.js')).toBe('react-vendor')
    expect(manualChunks('/app/node_modules/react/jsx-runtime.js')).toBe('react-vendor')
    expect(manualChunks('/app/node_modules/react-dom/client.js')).toBe('react-vendor')
    expect(manualChunks('/app/node_modules/scheduler/index.js')).toBe('react-vendor')
  })

  it('Windows 的反斜線路徑也要能正確歸類', () => {
    const manualChunks = getManualChunks()

    expect(manualChunks('C:\\app\\node_modules\\react\\index.js')).toBe('react-vendor')
    expect(
      manualChunks('C:\\app\\node_modules\\@supabase\\supabase-js\\dist\\index.js')
    ).toBe('supabase-vendor')
  })

  it('react-markdown 不可被誤判成 react（否則會被拉進首屏 chunk）', () => {
    const manualChunks = getManualChunks()

    expect(manualChunks('/app/node_modules/react-markdown/index.js')).toBeUndefined()
    expect(manualChunks('/app/node_modules/react-zoom-pan-pinch/dist/index.js')).toBeUndefined()
  })

  it('@supabase 應歸到 supabase-vendor', () => {
    const manualChunks = getManualChunks()

    expect(manualChunks('/app/node_modules/@supabase/supabase-js/dist/module/index.js')).toBe(
      'supabase-vendor'
    )
    expect(manualChunks('/app/node_modules/@supabase/realtime-js/dist/index.js')).toBe(
      'supabase-vendor'
    )
  })

  it('專案自己的程式碼不應被歸到任何 vendor chunk', () => {
    const manualChunks = getManualChunks()

    expect(manualChunks('/app/components/CombatView.tsx')).toBeUndefined()
    expect(manualChunks('/app/services/detailedCharacter.ts')).toBeUndefined()
  })
})
