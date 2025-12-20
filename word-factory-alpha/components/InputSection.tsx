import React, { useState } from 'react';

interface InputSectionProps {
  onProcess: (words: string[]) => void;
  isLoading: boolean;
}

const InputSection: React.FC<InputSectionProps> = ({ onProcess, isLoading }) => {
  const [text, setText] = useState('');

  const handleSubmit = () => {
    if (!text.trim()) return;
    // Split by newlines or commas
    const words = text.split(/[\n,]+/).map(w => w.trim()).filter(w => w.length > 0);
    if (words.length > 0) {
      onProcess(words);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full space-y-8 p-4">
      <div className="text-center space-y-2">
        <h2 className="text-4xl font-black text-gray-800 font-comic">Welcome to Word Factory</h2>
        <p className="text-gray-600">Enter your raw vocabulary list below. We'll organize, translate, and illustrate them for you.</p>
      </div>
      
      <div className="w-full max-w-2xl bg-white p-2 rounded-2xl border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <textarea
          className="w-full h-64 p-4 text-lg border-none focus:ring-0 resize-none font-medium text-gray-700 bg-[url('https://www.transparenttextures.com/patterns/notebook.png')]"
          placeholder="apple, banana, computer, ..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={isLoading}
        ></textarea>
      </div>

      <button
        onClick={handleSubmit}
        disabled={isLoading || !text.trim()}
        className={`
          px-8 py-4 bg-primary-btn rounded-xl border-4 border-black font-black text-xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]
          transition-all active:translate-y-1 active:shadow-none hover:bg-green-400
          ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        {isLoading ? 'Processing...' : 'Start Production 🏭'}
      </button>
    </div>
  );
};

export default InputSection;