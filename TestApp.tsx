import React from 'react';

const TestApp: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* 標題 */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg mb-4">
            <span className="text-2xl">🎲</span>
          </div>
          <h1 className="text-3xl font-bold text-amber-400 mb-2">D&D 冒險者助手</h1>
          <p className="text-slate-400">測試版本 - 檢查部署狀態</p>
        </div>

        {/* 狀態卡片 */}
        <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
          <h2 className="text-lg font-semibold text-amber-300 mb-4">✅ 部署狀態</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-green-400">✓</span>
              <span className="text-slate-200">React 應用載入成功</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-green-400">✓</span>
              <span className="text-slate-200">Tailwind CSS 正常運作</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-green-400">✓</span>
              <span className="text-slate-200">GitHub Pages 部署成功</span>
            </div>
          </div>
        </div>

        {/* 功能測試 */}
        <div className="bg-slate-900 rounded-lg p-6 border border-slate-800">
          <h2 className="text-lg font-semibold text-amber-300 mb-4">🧪 功能測試</h2>
          <div className="space-y-2">
            <button className="w-full bg-amber-600 hover:bg-amber-700 text-slate-900 font-medium py-2 px-4 rounded-lg transition-colors duration-200">
              按鈕互動測試
            </button>
            <div className="text-center text-sm text-slate-400">
              如果你看到這個頁面，表示應用已經正常載入！
            </div>
          </div>
        </div>

        {/* 時間戳記 */}
        <div className="text-center text-xs text-slate-500">
          構建時間: {new Date().toLocaleString('zh-TW')}
        </div>
      </div>
    </div>
  );
};

export default TestApp;