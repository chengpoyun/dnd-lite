import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WelcomePage } from '../../components/WelcomePage'

// 用假版號取代真實 package.json：這樣才驗得到「畫面真的跟著 package.json 走」。
// 若直接 import 真的 package.json 再拿它斷言，只要元件是從那裡讀的就必然成立，
// 那種寫法抓不到任何東西。
vi.mock('../../package.json', () => ({
  default: { version: '9.9.9-test' },
}))

/**
 * 登入頁頁尾的版本字串原本寫死成 v1.0，跟 About 頁（讀 package.json）長期對不上。
 */
describe('WelcomePage - 版本顯示', () => {
  it('頁尾版號應跟著 package.json 走', () => {
    render(<WelcomePage onNext={() => {}} />)

    expect(screen.getByText('D&D 角色助手 v9.9.9-test')).toBeInTheDocument()
  })

  it('頁尾不應殘留寫死的版號', () => {
    render(<WelcomePage onNext={() => {}} />)

    expect(screen.queryByText('D&D 角色助手 v1.0')).not.toBeInTheDocument()
  })
})
