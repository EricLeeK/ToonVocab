import React, { useState, useEffect, useRef } from 'react';
import BinderLayout from './components/BinderLayout';
import InputSection from './components/InputSection';
import WordCard from './components/WordCard';
import { WordGroup, ProcessingStatus } from './types';
import { processGroupText, generateVocabImage } from './services/geminiService';
import { DEFAULT_IMAGE_PROMPT, GROUP_SIZE, WORDS_PER_IMAGE } from './constants';

const App: React.FC = () => {
  const [hasApiKey, setHasApiKey] = useState(false);
  const [status, setStatus] = useState<ProcessingStatus>(ProcessingStatus.IDLE);
  const [rawWords, setRawWords] = useState<string[]>([]);
  const [groups, setGroups] = useState<WordGroup[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<number | null>(null);
  
  // Custom image prompt
  const [customStyle, setCustomStyle] = useState<string>('');
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);

  // Check for API Key on mount
  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio && await window.aistudio.hasSelectedApiKey()) {
        setHasApiKey(true);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      // Assume success to handle race condition
      setHasApiKey(true);
    }
  };

  // 1. Handle Initial Input
  const handleInitialProcess = (words: string[]) => {
    setRawWords(words);
    
    // Calculate number of groups
    const totalGroups = Math.ceil(words.length / GROUP_SIZE);
    const initialGroups: WordGroup[] = Array.from({ length: totalGroups }, (_, i) => ({
      id: i,
      title: `Group ${i + 1}`,
      words: [],
      isProcessing: false // We will process on demand or all at once? Let's process selected immediately.
    }));
    
    setGroups(initialGroups);
    setActiveGroupId(0); 
    setStatus(ProcessingStatus.PROCESSING_TEXT); // Move to main view
    
    // Trigger processing for the first group immediately
    processGroupData(0, words, initialGroups);
  };

  // 2. Process a specific group's text data
  const processGroupData = async (index: number, allWords: string[], currentGroups: WordGroup[]) => {
    const group = currentGroups[index];
    if (group.words.length > 0) return; // Already processed

    // Slice raw words
    const startIdx = index * GROUP_SIZE;
    const slice = allWords.slice(startIdx, startIdx + GROUP_SIZE);
    
    // Calculate filler needed
    const fillerCount = Math.max(0, GROUP_SIZE - slice.length);
    const needsFiller = fillerCount > 0;

    // Update UI state to show loading for this group (optional, if we had a spinner on the tab)
    
    try {
      const result = await processGroupText(slice, index, needsFiller, fillerCount);
      
      setGroups(prev => prev.map(g => {
        if (g.id === index) {
          return { ...g, words: result.words, title: result.title };
        }
        return g;
      }));
    } catch (err) {
      console.error(err);
      alert("Failed to process words for this group. Please try again.");
    }
  };

  // Effect: When active group changes, check if we need to load text
  useEffect(() => {
    if (activeGroupId !== null && rawWords.length > 0) {
      const group = groups.find(g => g.id === activeGroupId);
      if (group && group.words.length === 0) {
        processGroupData(activeGroupId, rawWords, groups);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroupId]);

  // 3. Generate Images
  const handleGenerateImages = async () => {
    if (activeGroupId === null) return;
    const group = groups.find(g => g.id === activeGroupId);
    if (!group || group.words.length === 0) return;

    setIsGeneratingImages(true);
    try {
      const promptToUse = customStyle.trim() ? customStyle : DEFAULT_IMAGE_PROMPT;
      
      const part1Words = group.words.slice(0, 5);
      const part2Words = group.words.slice(5, 10);

      const [img1, img2] = await Promise.all([
        generateVocabImage(part1Words, promptToUse),
        generateVocabImage(part2Words, promptToUse)
      ]);

      setGroups(prev => prev.map(g => {
        if (g.id === activeGroupId) {
          return {
            ...g,
            images: { part1: img1, part2: img2 }
          };
        }
        return g;
      }));

    } catch (e: any) {
      console.error(e);
      // If error contains "Requested entity was not found", it implies invalid key selection state
      if (e.message?.includes("Requested entity was not found") || e.message?.includes("403") || e.message?.includes("PERMISSION_DENIED")) {
        alert("Permission denied. Please select a valid API key with billing enabled.");
        setHasApiKey(false); // Reset to force re-selection
        if (window.aistudio) {
             await window.aistudio.openSelectKey();
             setHasApiKey(true);
        }
      } else {
        alert("Image generation failed. Please try again.");
      }
    } finally {
      setIsGeneratingImages(false);
    }
  };

  // 4. Download JSON
  const handleDownloadJson = () => {
    if (activeGroupId === null) return;
    const group = groups.find(g => g.id === activeGroupId);
    if (!group) return;

    const data = {
      title: group.title,
      words: group.words
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${group.title.replace(/\s+/g, '_')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  // 5. Copy JSON
  const handleCopyJson = async () => {
    if (activeGroupId === null) return;
    const group = groups.find(g => g.id === activeGroupId);
    if (!group) return;

    const data = {
      title: group.title,
      words: group.words
    };
    
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      // Optional: Add toast notification logic here
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  // 6. Download Images
  const handleDownloadImages = () => {
     if (activeGroupId === null) return;
     const group = groups.find(g => g.id === activeGroupId);
     if (!group || !group.images) return;
     
     const downloadImage = (dataUrl: string, filename: string) => {
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
     };

     if (group.images.part1) downloadImage(group.images.part1, `${group.title.replace(/\s+/g, '_')}_Part1.png`);
     if (group.images.part2) {
        // Add a small delay to ensure browser initiates both downloads
        setTimeout(() => {
           downloadImage(group.images.part2!, `${group.title.replace(/\s+/g, '_')}_Part2.png`);
        }, 150);
     }
  };

  const activeGroup = groups.find(g => g.id === activeGroupId);

  // Render API Key Selection Screen if no key
  if (!hasApiKey) {
    return (
      <BinderLayout title="Word Factory Alpha">
        <div className="flex flex-col items-center justify-center h-full space-y-8 p-4 text-center">
           <div className="w-24 h-24 bg-yellow-300 rounded-full border-4 border-black flex items-center justify-center text-5xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              🔑
           </div>
           <h2 className="text-4xl font-black text-gray-800 font-comic">Unlock the Factory</h2>
           <p className="text-xl text-gray-600 max-w-lg">
             To use the advanced AI models for image generation (Gemini 3 Pro Image), you need to connect a Google Cloud Project with billing enabled.
           </p>
           <button
            onClick={handleSelectKey}
            className="px-8 py-4 bg-primary-btn rounded-xl border-4 border-black font-black text-xl shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all active:translate-y-1 active:shadow-none hover:bg-green-400"
          >
            Select API Key
          </button>
           <p className="text-sm text-gray-500">
            For pricing information, visit the <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="underline text-blue-600">billing documentation</a>.
          </p>
        </div>
      </BinderLayout>
    );
  }

  if (status === ProcessingStatus.IDLE) {
    return (
      <BinderLayout title="Word Factory Alpha">
        <InputSection onProcess={handleInitialProcess} isLoading={false} />
      </BinderLayout>
    );
  }

  return (
    <BinderLayout title="Word Factory Alpha">
      {/* Group Selector */}
      <div className="mb-6 flex flex-wrap gap-2">
        {groups.map((group) => (
          <button
            key={group.id}
            onClick={() => setActiveGroupId(group.id)}
            className={`
              px-4 py-2 rounded-lg font-bold border-2 border-black transition-all text-black
              ${activeGroupId === group.id 
                ? 'bg-yellow-300 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] translate-y-0.5' 
                : 'bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5'}
            `}
          >
            {group.title}
          </button>
        ))}
      </div>

      {activeGroup && (
        <div className="space-y-8 animate-fade-in">
          
          {/* Action Bar */}
          <div className="flex flex-wrap gap-4 p-4 bg-white rounded-xl border-4 border-black shadow-sm items-center">
            
            {/* Split Button for JSON */}
            <div className="inline-flex rounded-md shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" role="group">
              <button
                type="button"
                onClick={handleCopyJson}
                className="px-4 py-2 text-sm font-bold text-black bg-gray-100 border-2 border-black rounded-l-lg hover:bg-gray-200 focus:z-10 focus:ring-2 focus:ring-gray-500 focus:text-black"
              >
                📋 Copy
              </button>
              <button
                type="button"
                onClick={handleDownloadJson}
                className="px-4 py-2 text-sm font-bold text-black bg-gray-100 border-t-2 border-b-2 border-r-2 border-black rounded-r-lg hover:bg-gray-200 focus:z-10 focus:ring-2 focus:ring-gray-500 focus:text-black"
              >
                💾 JSON
              </button>
            </div>

            <div className="flex-1"></div>
            
            <div className="flex items-center space-x-2 w-full md:w-auto">
               <input 
                  type="text" 
                  placeholder="Custom Style (Optional)" 
                  className="border-2 border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 md:w-48"
                  value={customStyle}
                  onChange={(e) => setCustomStyle(e.target.value)}
               />
               <button 
                onClick={handleGenerateImages}
                disabled={isGeneratingImages || activeGroup.words.length === 0}
                className={`
                  flex items-center space-x-2 px-4 py-2 rounded-lg font-bold border-2 border-black
                  ${isGeneratingImages ? 'bg-gray-300' : 'bg-accent-blue text-white hover:brightness-110'}
                `}
               >
                 <span>{isGeneratingImages ? 'Generating...' : '✨ Visualization'}</span>
               </button>
               
               {/* Image Download Button */}
               <button 
                onClick={handleDownloadImages}
                disabled={!activeGroup.images?.part1 && !activeGroup.images?.part2}
                className={`
                  px-4 py-2 rounded-lg font-bold border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all
                  ${(!activeGroup.images?.part1 && !activeGroup.images?.part2) 
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                    : 'bg-primary-btn text-black hover:bg-green-400'}
                `}
                title="Download Images"
               >
                 ⬇️
               </button>
            </div>
          </div>

          {/* Illustrations */}
          {activeGroup.images && (
            <div className="grid md:grid-cols-2 gap-6">
               {activeGroup.images.part1 && (
                  <div className="relative group">
                    <div className="bg-white p-2 rounded-2xl border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transform rotate-1 transition hover:rotate-0">
                        <img src={activeGroup.images.part1} alt="Visualization 1" className="w-full rounded-xl" />
                        {/* Label removed */}
                    </div>
                  </div>
               )}
               {activeGroup.images.part2 && (
                  <div className="relative group">
                    <div className="bg-white p-2 rounded-2xl border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transform -rotate-1 transition hover:rotate-0">
                        <img src={activeGroup.images.part2} alt="Visualization 2" className="w-full rounded-xl" />
                         {/* Label removed */}
                    </div>
                  </div>
               )}
            </div>
          )}

          {/* Word List */}
          <div className="mt-8">
            <h2 className="text-2xl font-black mb-4 font-comic">Daily Vocabulary: {activeGroup.title}</h2>
            {activeGroup.words.length === 0 ? (
              <div className="p-12 text-center text-gray-500 font-bold bg-white/50 rounded-xl border-2 border-dashed border-gray-300">
                Processing words with AI...
              </div>
            ) : (
              activeGroup.words.map((word, idx) => (
                <WordCard key={idx} word={word} index={idx + (activeGroupId * 10)} />
              ))
            )}
          </div>

        </div>
      )}
    </BinderLayout>
  );
};

export default App;