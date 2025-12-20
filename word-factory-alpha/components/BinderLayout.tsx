import React from 'react';

interface BinderLayoutProps {
  children: React.ReactNode;
  title?: string;
}

const BinderLayout: React.FC<BinderLayoutProps> = ({ children, title }) => {
  return (
    <div className="flex h-full w-full max-w-6xl mx-auto py-4 px-2 md:px-8">
      {/* Binder Spine */}
      <div className="hidden md:flex flex-col w-16 bg-binder-dark rounded-l-lg items-center py-8 space-y-8 relative shadow-2xl z-10">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="w-20 h-4 bg-gray-500 rounded-full -ml-10 border-2 border-gray-600 shadow-inner flex items-center justify-center">
             <div className="w-full h-1 bg-gray-400 opacity-30"></div>
          </div>
        ))}
      </div>

      {/* Main Paper Content */}
      <div className="flex-1 bg-binder-paper rounded-r-lg md:rounded-l-none rounded-lg shadow-2xl overflow-hidden flex flex-col border-r-8 border-b-8 border-gray-200">
        
        {/* Header */}
        <div className="p-6 border-b-2 border-dashed border-gray-300 flex justify-between items-center bg-white/50 backdrop-blur-sm sticky top-0 z-20">
          <div className="flex items-center space-x-4">
             <div className="w-12 h-12 bg-pink-300 rounded-full border-4 border-black flex items-center justify-center text-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                🎨
             </div>
             <h1 className="text-3xl font-black tracking-tight text-gray-800 font-comic">{title || "Word Factory"}</h1>
          </div>
        </div>

        {/* Content Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-[linear-gradient(#e5e7eb_1px,transparent_1px)] [background-size:100%_2rem]">
          {children}
        </div>
      </div>
    </div>
  );
};

export default BinderLayout;