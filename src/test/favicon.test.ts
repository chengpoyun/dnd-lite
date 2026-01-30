import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

describe('Favicon Configuration', () => {
  it('index.html 應包含正確的 favicon 引用', () => {
    const indexPath = resolve(__dirname, '../../index.html')
    const indexContent = readFileSync(indexPath, 'utf-8')
    
    expect(indexContent).toContain('rel="icon"')
    expect(indexContent).toContain('type="image/svg+xml"')
    expect(indexContent).toContain('href="/dnd-lite-favicon.svg"')
  })

  it('favicon 檔案應存在於 public 目錄', () => {
    const faviconPath = resolve(__dirname, '../../public/dnd-lite-favicon.svg')
    expect(existsSync(faviconPath)).toBe(true)
  })

  it('舊的 favicon.svg 應已被刪除', () => {
    const oldFaviconPath = resolve(__dirname, '../../public/favicon.svg')
    expect(existsSync(oldFaviconPath)).toBe(false)
  })
})
