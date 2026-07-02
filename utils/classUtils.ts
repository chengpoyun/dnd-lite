// D&D 5E 職業工具函數
import { DND_CLASSES, SUBCLASSES_BY_CLASS, type DndClassName, type ClassInfo, type HitDicePools } from '../types'

/**
 * 獲取所有可用的D&D職業列表
 */
export const getAvailableClasses = (): DndClassName[] => {
  return Object.keys(DND_CLASSES) as DndClassName[]
}

/**
 * 取得某職業的可選子職業列表（未知職業回傳空陣列）
 */
export const getSubclassesForClass = (className: string): string[] => {
  return SUBCLASSES_BY_CLASS[className as DndClassName] ?? []
}

/**
 * 子職業可選的最低職業等級（D&D 5E：3 等後才取得子職業）
 */
export const SUBCLASS_MIN_LEVEL = 3

/**
 * 該職業等級是否已可選擇子職業（3 等以上）
 */
export const canSelectSubclass = (level: number): boolean => {
  return (Number(level) || 0) >= SUBCLASS_MIN_LEVEL
}

/**
 * 格式化單一職業名稱（有子職業時加上括號，如「牧師（生命領域）」）
 */
const formatClassName = (classInfo: ClassInfo): string => {
  return classInfo.subclassName
    ? `${classInfo.name}（${classInfo.subclassName}）`
    : classInfo.name
}

/**
 * 根據職業名稱獲取對應的生命骰類型
 */
export const getClassHitDie = (className: string): 'd4' | 'd6' | 'd8' | 'd10' | 'd12' => {
  const classData = DND_CLASSES[className as DndClassName]
  return classData?.hitDie || 'd8' // 預設為d8
}

/**
 * 計算角色的主職業（等級最高的職業）
 */
export const getPrimaryClass = (classes: ClassInfo[]): ClassInfo | null => {
  if (!classes.length) return null
  
  // 按等級排序，等級相同時按加入順序
  return classes.reduce((primary, current) => {
    if (current.level > primary.level) {
      return current
    }
    return primary
  })
}

/**
 * 計算角色的總等級
 */
export const getTotalLevel = (classes: ClassInfo[]): number => {
  return classes.reduce((total, classInfo) => total + classInfo.level, 0)
}

/**
 * 依主職業排序（等級高者在前，等級相同時主職業優先），供職業顯示相關函式共用
 */
const sortClassesByPrimary = (classes: ClassInfo[]): ClassInfo[] => {
  return [...classes].sort((a, b) => {
    if (b.level !== a.level) return b.level - a.level
    return a.isPrimary ? -1 : 1
  })
}

/**
 * 格式化職業顯示文字（有子職業時以括號附加，如「牧師（生命領域）」）
 * @param classes 職業列表
 * @param format 'full' | 'primary' | 'simple'
 * - full: "戰士（冠軍） Lv5 / 法師 Lv3"
 * - primary: "戰士（冠軍）" (只顯示主職業)
 * - simple: "戰士（冠軍）/法師" (不顯示等級)
 */
export const formatClassDisplay = (
  classes: ClassInfo[],
  format: 'full' | 'primary' | 'simple' = 'full'
): string => {
  if (!classes.length) return '無職業'

  const sortedClasses = sortClassesByPrimary(classes)

  switch (format) {
    case 'primary':
      return sortedClasses[0] ? formatClassName(sortedClasses[0]) : '無職業'

    case 'simple':
      return sortedClasses.map(c => formatClassName(c)).join('/')

    case 'full':
    default:
      return sortedClasses.map(c => `${formatClassName(c)} Lv${c.level}`).join(' / ')
  }
}

/**
 * 依主職業排序，逐一職業格式化為「職業（子職業） LvX」陣列，供每個職業各自一行顯示使用
 * （角色頭部多職業時，避免將所有職業擠在同一行導致爆版）
 */
export const formatClassDisplayLines = (classes: ClassInfo[]): string[] => {
  if (!classes.length) return []

  const sortedClasses = sortClassesByPrimary(classes)

  return sortedClasses.map(c => `${formatClassName(c)} Lv${c.level}`)
}

/**
 * 計算各類型生命骰的總數
 */
export const calculateHitDiceTotals = (classes: ClassInfo[]): HitDicePools => {
  const pools: HitDicePools = {
    d12: { current: 0, total: 0 },
    d10: { current: 0, total: 0 },
    d8: { current: 0, total: 0 },
    d6: { current: 0, total: 0 }
  }
  
  classes.forEach(classInfo => {
    const dieType = classInfo.hitDie
    if (pools[dieType]) {
      pools[dieType].total += classInfo.level
      pools[dieType].current += classInfo.level // 新角色滿血
    }
  })
  
  return pools
}

/**
 * 驗證職業名稱是否有效
 */
export const isValidClassName = (className: string): boolean => {
  return className in DND_CLASSES
}

/**
 * 獲取職業的詳細資訊
 */
export const getClassInfo = (className: string) => {
  const classData = DND_CLASSES[className as DndClassName]
  return classData ? {
    name: className,
    hitDie: classData.hitDie,
    isValid: true
  } : {
    name: className,
    hitDie: 'd8' as const,
    isValid: false
  }
}

/**
 * 長休時恢復生命骰（D&D 5E規則：恢復一半，向上取整）
 */
export const recoverHitDiceOnLongRest = (pools: HitDicePools): HitDicePools => {
  const recovered = { ...pools }
  
  Object.keys(recovered).forEach(dieType => {
    const pool = recovered[dieType as keyof HitDicePools]
    const recoverAmount = Math.ceil(pool.total / 2)
    pool.current = Math.min(pool.total, pool.current + recoverAmount)
  })
  
  return recovered
}

/**
 * 使用特定類型的生命骰
 */
export const useHitDie = (
  pools: HitDicePools, 
  dieType: 'd12' | 'd10' | 'd8' | 'd6',
  amount: number = 1
): HitDicePools => {
  if (pools[dieType].current < amount) {
    throw new Error(`沒有足夠的${dieType}生命骰`)
  }
  
  return {
    ...pools,
    [dieType]: {
      ...pools[dieType],
      current: pools[dieType].current - amount
    }
  }
}

/**
 * 格式化多種生命骰池的顯示（如：5d10 + 3d6）
 */
export const formatHitDicePools = (
  pools: HitDicePools, 
  format: 'current' | 'total' | 'status' = 'status'
): string => {
  const diceTypes: (keyof HitDicePools)[] = ['d12', 'd10', 'd8', 'd6']
  const parts: string[] = []
  
  diceTypes.forEach(dieType => {
    const pool = pools[dieType]
    if (pool.total > 0) {
      switch (format) {
        case 'current':
          if (pool.current > 0) {
            parts.push(`${pool.current}${dieType}`)
          }
          break
        case 'total':
          parts.push(`${pool.total}${dieType}`)
          break
        case 'status':
          parts.push(`${pool.current}/${pool.total}${dieType}`)
          break
      }
    }
  })
  
  return parts.length > 0 ? parts.join(' + ') : '無生命骰'
}

/**
 * 計算生命骰池的總當前數量
 */
export const getTotalCurrentHitDice = (pools: HitDicePools): number => {
  return Object.values(pools).reduce((total, pool) => total + pool.current, 0)
}

/**
 * 計算生命骰池的總數量
 */
export const getTotalMaxHitDice = (pools: HitDicePools): number => {
  return Object.values(pools).reduce((total, pool) => total + pool.total, 0)
}