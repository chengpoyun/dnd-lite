import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WelcomePage } from '../../components/WelcomePage'
import packageJson from '../../package.json'

/**
 * 登入頁頁尾的版本字串原本寫死成 v1.0，跟 About 頁（讀 package.json）長期對不上。
 * 這支測試確保兩邊都以 package.json 為唯一來源。
 */
describe('WelcomePage - 版本顯示', () => {
  it('頁尾應顯示 package.json 的版本', () => {
    render(<WelcomePage onNext={() => {}} />)

    expect(
      screen.getByText(`D&D 角色助手 v${packageJson.version}`)
    ).toBeInTheDocument()
  })

  it('頁尾不應殘留寫死的版號', () => {
    render(<WelcomePage onNext={() => {}} />)

    expect(screen.queryByText('D&D 角色助手 v1.0')).not.toBeInTheDocument()
  })
})
