# HP Persistence Test

## Test Procedure
1. Load the character sheet
2. Go to combat view
3. Click on HP to edit it
4. Change the HP value (e.g., from 100 to 50)
5. Click "套用" to apply changes
6. Refresh the page
7. Verify the HP value persisted

## Expected Behavior
- HP modification should trigger console log: "❤️ 保存當前HP: [value]"
- Should see success message: "✅ HP保存成功"  
- After page refresh, HP should maintain the modified value

## Test AC Persistence
1. Click on AC value to edit
2. Change AC (e.g., from 15 to 18)
3. Apply changes
4. Refresh page
5. Verify AC persisted

## Test Initiative Persistence  
1. Click on initiative modifier to edit
2. Change value (e.g., from +2 to +3)
3. Apply changes
4. Refresh page
5. Verify initiative persisted

## Console Log Expected
```
❤️ 保存當前HP: 50
✅ HP保存成功

🛡️ 保存AC: 18  
✅ AC保存成功

⚡ 保存先攻值: 3
✅ 先攻值保存成功
```