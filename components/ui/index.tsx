import React from 'react'
import { STYLES, combineStyles, conditionalStyle } from '../../styles/common'

// 共用按鈕組件
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'small' | 'icon'
  loading?: boolean
  children: React.ReactNode
}

export const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary', 
  loading = false, 
  disabled, 
  className = '', 
  children, 
  ...props 
}) => {
  const baseStyle = STYLES.button[variant]
  const isDisabled = disabled || loading
  
  return (
    <button
      className={combineStyles(
        baseStyle,
        conditionalStyle(isDisabled, STYLES.state.disabled),
        className
      )}
      disabled={isDisabled}
      {...props}
    >
      {loading ? (
        <div className={STYLES.layout.flexCenter}>
          <div className={STYLES.loading.spinnerSmall}></div>
          <span className="ml-2">載入中...</span>
        </div>
      ) : children}
    </button>
  )
}

// 共用輸入框組件
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  variant?: 'base' | 'large'
}

export const Input: React.FC<InputProps> = ({ 
  variant = 'base', 
  className = '', 
  ...props 
}) => {
  return (
    <input
      className={combineStyles(STYLES.input[variant], className)}
      {...props}
    />
  )
}

// 共用卡片組件
interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  padding?: 'normal' | 'small'
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  hover = false,
  padding = 'normal'
}) => {
  const paddingClass = padding === 'small' 
    ? `${STYLES.spacing.cardXSmall} ${STYLES.spacing.cardYSmall}`
    : `${STYLES.spacing.cardX} ${STYLES.spacing.cardY}`
    
  return (
    <div className={combineStyles(
      STYLES.container.card,
      paddingClass,
      conditionalStyle(hover, STYLES.state.hover),
      className
    )}>
      {children}
    </div>
  )
}

// 列表卡片標題＋標籤列（ItemCard / AbilityCard 共用；空間不足時標籤換到下一行）
interface ListCardTitleRowProps {
  title: React.ReactNode
  tags: React.ReactNode
  className?: string
}

export const ListCardTitleRow: React.FC<ListCardTitleRowProps> = ({
  title,
  tags,
  className = ''
}) => (
  <div className={combineStyles(STYLES.listCard.titleRow, className)}>
    <div className={STYLES.listCard.title}>{title}</div>
    <div className={STYLES.listCard.tags}>{tags}</div>
  </div>
)

// 列表卡片基底（ItemCard / AbilityCard / MonsterCard 共用）
interface ListCardProps {
  children: React.ReactNode
  /** 點擊整張卡片時觸發（無 dragHandle 時加 hover 樣式） */
  onClick?: () => void
  /** 左側拖拉把手；有值時改為 flex 佈局且 padding 在內層 */
  dragHandle?: React.ReactNode
  className?: string
}

export const ListCard: React.FC<ListCardProps> = ({
  children,
  onClick,
  dragHandle,
  className = ''
}) => {
  if (dragHandle != null) {
    return (
      <div
        className={combineStyles(
          STYLES.listCard.withHandle,
          className
        )}
      >
        <div className="flex items-center justify-center shrink-0 w-10 border-r border-slate-700 bg-slate-800/50 text-slate-500 touch-none cursor-grab active:cursor-grabbing [&:active]:bg-slate-700/50">
          {dragHandle}
        </div>
        <div
          className={combineStyles(
            STYLES.listCard.inner,
            onClick != null ? STYLES.listCard.innerClickable : ''
          )}
          onClick={onClick}
          role={onClick != null ? 'button' : undefined}
        >
          {children}
        </div>
      </div>
    )
  }
  return (
    <div
      className={combineStyles(
        STYLES.listCard.base,
        onClick != null ? STYLES.listCard.clickable : '',
        className
      )}
      onClick={onClick}
      role={onClick != null ? 'button' : undefined}
    >
      {children}
    </div>
  )
}

// 共用頁面容器
interface PageContainerProps {
  children: React.ReactNode
  className?: string
}

export const PageContainer: React.FC<PageContainerProps> = ({ 
  children, 
  className = '' 
}) => {
  return (
    <div className={combineStyles(
      STYLES.container.page,
      STYLES.spacing.pageX,
      STYLES.spacing.pageY,
      className
    )}>
      <div className={STYLES.layout.maxWidth}>
        {children}
      </div>
    </div>
  )
}

// 共用載入組件
interface LoadingProps {
  size?: 'small' | 'medium' | 'large'
  text?: string
}

export const Loading: React.FC<LoadingProps> = ({ 
  size = 'medium', 
  text = '載入中...' 
}) => {
  const sizeClasses = {
    small: 'h-8 w-8',
    medium: 'h-12 w-12',
    large: 'h-16 w-16'
  }
  
  return (
    <div className={STYLES.layout.flexCenter}>
      <div className="text-center">
        <div className={combineStyles(
          STYLES.loading.spinner,
          sizeClasses[size],
          'mx-auto mb-4'
        )}></div>
        <p className={STYLES.text.subtitle}>{text}</p>
      </div>
    </div>
  )
}

// 共用標題組件
interface TitleProps {
  children: React.ReactNode
  size?: 'normal' | 'large'
  className?: string
}

export const Title: React.FC<TitleProps> = ({ 
  children, 
  size = 'normal', 
  className = '' 
}) => {
  const titleClass = size === 'large' ? STYLES.text.titleLarge : STYLES.text.title
  return <h1 className={combineStyles(titleClass, className)}>{children}</h1>
}

// 共用副標題組件
export const Subtitle: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className = '' 
}) => {
  return <p className={combineStyles(STYLES.text.subtitle, className)}>{children}</p>
}

// 共用頭像組件
interface AvatarProps {
  emoji: string
  size?: 'small' | 'medium' | 'large'
  className?: string
}

export const Avatar: React.FC<AvatarProps> = ({ 
  emoji, 
  size = 'medium', 
  className = '' 
}) => {
  const sizeClass = STYLES.avatar[size]
  const emojiSizeClass = size === 'small' ? 'text-sm' : size === 'large' ? 'text-xl sm:text-2xl' : 'text-lg sm:text-xl'
  
  return (
    <div className={combineStyles(sizeClass, className)}>
      <span className={emojiSizeClass}>{emoji}</span>
    </div>
  )
}

// 共用返回按鈕
interface BackButtonProps {
  onClick: () => void
  className?: string
}

export const BackButton: React.FC<BackButtonProps> = ({ onClick, className = '' }) => {
  return (
    <button
      onClick={onClick}
      className={combineStyles(
        STYLES.button.ghost,
        'p-0',
        className
      )}
    >
      <svg className={STYLES.icon.medium} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
    </button>
  )
}

// 導出Modal組件
export { Modal, ModalButton, ModalInput } from './Modal';