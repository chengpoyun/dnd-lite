import React from 'react';
import { TransformWrapper, TransformComponent, useControls } from 'react-zoom-pan-pinch';

const MAP_IMAGE_SRC = `${import.meta.env.BASE_URL}maps/kovar-map.jpg`;

const ResetViewButton: React.FC = () => {
  const { resetTransform } = useControls();
  return (
    <button
      onClick={() => resetTransform()}
      className="absolute bottom-4 right-4 z-10 flex items-center gap-2 px-4 py-2 bg-slate-800/90 border border-slate-700 rounded-lg text-slate-200 text-sm font-medium shadow-lg active:bg-slate-700"
    >
      <span>🔄</span>
      重置視圖
    </button>
  );
};

export const MapPage: React.FC = () => {
  return (
    <div
      className="relative -m-6 h-[calc(100dvh-56px)] bg-slate-950 overflow-hidden"
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      <TransformWrapper
        initialScale={1}
        minScale={0.5}
        maxScale={12}
        centerOnInit
        doubleClick={{ mode: 'toggle' }}
      >
        <ResetViewButton />
        <TransformComponent
          wrapperStyle={{ width: '100%', height: '100%' }}
          contentStyle={{ width: '100%', height: '100%' }}
        >
          <img
            src={MAP_IMAGE_SRC}
            alt="科瓦雷地圖"
            className="w-full h-full object-contain select-none"
            draggable={false}
          />
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
};

export default MapPage;
