// 測試豁免骰熟練度保存和載入
window.testSavingThrows = async function() {
  console.log('=== 測試豁免骰熟練度 ===')
  
  try {
    // 獲取當前角色 ID
    const characterId = localStorage.getItem('dnd_last_character_id')
    if (!characterId) {
      console.error('❌ 沒有找到角色 ID')
      return
    }
    
    console.log(`🎭 測試角色 ID: ${characterId}`)
    
    // 1. 從 localStorage 載入完整角色數據
    const localDataStr = localStorage.getItem(`dnd_character_${characterId}`)
    let fullCharacterData = null
    if (localDataStr) {
      fullCharacterData = JSON.parse(localDataStr)
      console.log('📦 localStorage 完整數據:')
      console.log('   - 角色名稱:', fullCharacterData.character?.name)
      console.log('   - savingThrows 數組:', fullCharacterData.savingThrows)
      console.log('   - savingThrows 類型:', Array.isArray(fullCharacterData.savingThrows) ? 'array' : typeof fullCharacterData.savingThrows)
      console.log('   - savingThrows 長度:', fullCharacterData.savingThrows?.length)
    } else {
      console.log('📦 localStorage: 沒有完整角色數據')
    }
    
    // 2. 從資料庫載入豁免熟練度
    const { data: savingThrows, error: savingError } = await window.supabase
      .from('character_saving_throws')
      .select('*')
      .eq('character_id', characterId)
    
    if (savingError) {
      console.error('❌ 從資料庫載入豁免熟練度失敗:', savingError)
    } else {
      console.log('💾 資料庫豁免熟練度:', savingThrows)
      console.log('💾 熟練的屬性:', savingThrows?.filter(st => st.is_proficient).map(st => st.ability))
    }
    
    // 3. 測試直接從 HybridDataManager 載入
    console.log('🔄 測試 HybridDataManager.getCharacter...')
    const loadedData = await window.HybridDataManager.getCharacter(characterId)
    console.log('🎯 HybridDataManager 載入結果:', {
      savingThrows: loadedData?.savingThrows,
      savingThrowsType: Array.isArray(loadedData?.savingThrows) ? 'array' : typeof loadedData?.savingThrows,
      savingThrowsLength: loadedData?.savingThrows?.length,
      proficientAbilities: loadedData?.savingThrows?.filter(st => st.is_proficient).map(st => st.ability)
    })
    
    // 4. 比較結果
    const localProfs = fullCharacterData?.savingThrows?.filter(st => st.is_proficient).map(st => st.ability) || []
    const dbProfs = savingThrows?.filter(st => st.is_proficient).map(st => st.ability) || []
    const hybridProfs = loadedData?.savingThrows?.filter(st => st.is_proficient).map(st => st.ability) || []
    
    console.log('🔄 比較結果:')
    console.log('   - localStorage:', localProfs)
    console.log('   - 資料庫:', dbProfs)
    console.log('   - HybridDataManager:', hybridProfs)
    
    if (JSON.stringify(localProfs.sort()) === JSON.stringify(dbProfs.sort()) && 
        JSON.stringify(localProfs.sort()) === JSON.stringify(hybridProfs.sort())) {
      console.log('✅ 所有數據一致')
    } else {
      console.log('⚠️ 數據不一致！')
    }
    
  } catch (error) {
    console.error('💥 測試失敗:', error)
  }
}

// 自動執行
console.log('📋 執行 window.testSavingThrows() 來測試豁免骰熟練度')