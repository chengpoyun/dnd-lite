import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SessionExpiredModal } from '../../components/SessionExpiredModal'

describe('SessionExpiredModal', () => {
  it('isOpen 為 false 時完全不渲染', () => {
    const { container } = render(<SessionExpiredModal isOpen={false} onRelogin={vi.fn()} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('開啟時應說明帳號已在其他裝置登入', () => {
    render(<SessionExpiredModal isOpen onRelogin={vi.fn()} />)

    expect(screen.getByText('帳號已在其他裝置登入')).toBeInTheDocument()
    expect(screen.getByText(/此裝置已自動登出/)).toBeInTheDocument()
  })

  it('點「重新登入」應通知呼叫端', () => {
    const onRelogin = vi.fn()
    render(<SessionExpiredModal isOpen onRelogin={onRelogin} />)

    fireEvent.click(screen.getByText('重新登入'))

    expect(onRelogin).toHaveBeenCalledTimes(1)
  })

  it('點背景不可關閉，使用者只能走重新登入這條路', () => {
    const onRelogin = vi.fn()
    render(<SessionExpiredModal isOpen onRelogin={onRelogin} />)

    fireEvent.click(screen.getByTestId('modal-backdrop'))

    expect(onRelogin).not.toHaveBeenCalled()
    expect(screen.getByText('帳號已在其他裝置登入')).toBeInTheDocument()
  })
})
