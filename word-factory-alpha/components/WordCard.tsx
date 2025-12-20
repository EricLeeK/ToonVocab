import React from 'react';
import { WordItem } from '../types';

interface WordCardProps {
  word: WordItem;
  index: number;
}

const WordCard: React.FC<WordCardProps> = ({ word, index }) => {
  const speak = (text: string, lang: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="bg-white border-4 border-black rounded-3xl p-6 mb-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.1)] transition-transform hover:-translate-y-1">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 rounded-full bg-cyan-200 border-2 border-black flex items-center justify-center font-bold text-lg">
            {index + 1}
          </div>
          <h2 className="text-3xl font-black text-gray-800">{word.term}</h2>
          <button 
            onClick={() => speak(word.term, 'en-US')}
            className="text-gray-400 hover:text-blue-500 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
            </svg>
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-3 pl-14">
        {/* Chinese */}
        <div className="flex items-center space-x-3">
          <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded text-xs font-bold border border-red-200">CN</span>
          <span className="text-lg font-medium text-gray-700">{word.meaningCn}</span>
        </div>
        
        {/* English */}
        <div className="flex items-center space-x-3">
          <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded text-xs font-bold border border-blue-200">EN</span>
          <span className="text-lg italic text-gray-600">{word.meaningEn}</span>
        </div>

        {/* Japanese */}
        <div className="flex items-center space-x-3">
          <span className="bg-purple-100 text-purple-600 px-2 py-0.5 rounded text-xs font-bold border border-purple-200">JP</span>
          <div className="flex flex-col">
            <span className="text-xs text-gray-500">{word.meaningJpReading}</span>
            <span className="text-lg font-medium text-gray-700">{word.meaningJp}</span>
          </div>
          <button 
             onClick={() => speak(word.meaningJp, 'ja-JP')}
             className="text-gray-300 hover:text-purple-500 transition-colors ml-2"
          >
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default WordCard;