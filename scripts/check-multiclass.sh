#!/bin/bash
# 檢查角色的多職業數據

# 從 .env 讀取 token
cd /home/barry/dnd-lite
export $(cat .env | grep SUPABASE_ACCESS_TOKEN | xargs)
export $(cat .env | grep NEXT_PUBLIC_SUPABASE_URL | xargs)

if [ -z "$1" ]; then
  echo "用法: ./check-multiclass.sh <character_id>"
  echo "請提供角色 ID"
  exit 1
fi

CHARACTER_ID=$1

echo "=== 檢查角色 $CHARACTER_ID 的多職業數據 ==="
echo ""

echo "1. 角色基本信息:"
curl -s "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/characters?id=eq.${CHARACTER_ID}&select=id,name,character_class,level" \
  -H "apikey: ${SUPABASE_ACCESS_TOKEN}" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}"

echo ""
echo "2. 職業列表 (character_classes):"
curl -s "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/character_classes?character_id=eq.${CHARACTER_ID}&select=*" \
  -H "apikey: ${SUPABASE_ACCESS_TOKEN}" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}"

echo ""
echo "3. 生命骰池 (character_hit_dice_pools):"
curl -s "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/character_hit_dice_pools?character_id=eq.${CHARACTER_ID}&select=*" \
  -H "apikey: ${SUPABASE_ACCESS_TOKEN}" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}"
