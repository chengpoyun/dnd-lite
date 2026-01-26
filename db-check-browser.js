// 資料庫檢查工具 - 在瀏覽器控制台中使用
// 打開瀏覽器開發者工具，在控制台貼上這段程式碼執行

window.checkSkillsDB = async function() {
  console.log('🔍 檢查技能熟練度資料庫狀態...')
  
  try {
    // 取得當前角色 ID
    const characterId = localStorage.getItem('dnd_last_character_id')
    if (!characterId) {
      console.error('❌ 找不到角色 ID')
      return
    }
    console.log('👤 當前角色 ID:', characterId)
    
    // 檢查技能熟練度表
    const { data: skills, error: skillsError } = await window.supabase
      .from('character_skill_proficiencies')
      .select('*')
      .eq('character_id', characterId)
    
    if (skillsError) {
      console.error('❌ 技能熟練度查詢錯誤:', skillsError)
    } else {
      console.log('✅ 技能熟練度資料:', skills)
    }
    
    // 檢查豁免骰熟練度表
    const { data: saves, error: savesError } = await window.supabase
      .from('character_saving_throws')
      .select('*')
      .eq('character_id', characterId)
    
    if (savesError) {
      console.error('❌ 豁免骰查詢錯誤:', savesError)
    } else {
      console.log('✅ 豁免骰熟練度資料:', saves)
    }
    
    // 檢查 localStorage 的技能資料
    const statsString = localStorage.getItem(`dnd_character_${characterId}`)
    if (statsString) {
      const localData = JSON.parse(statsString)
      console.log('💾 localStorage 技能熟練度:', localData.character?.proficiencies || {})
      console.log('💾 localStorage 豁免骰熟練度:', localData.character?.savingProficiencies || [])
    }
    
  } catch (error) {
    console.error('💥 檢查失敗:', error)
  }
}

// 自動執行
window.checkSkillsDB()

console.log('📋 你可以隨時執行 window.checkSkillsDB() 來檢查資料庫狀態')