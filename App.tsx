import React, { useState, useEffect, useRef, useCallback } from 'react';
import { WordGroup, Word, ViewState, AISettings, WordFactoryGroup, WordFactoryItem, WordFactoryStatus } from './types';
import * as wordService from './services/wordService';
import * as aiService from './services/aiService';
import * as imageService from './services/imageService';
import { Button } from './components/Button';
import { Input } from './components/Input';
import {
  Plus,
  ArrowLeft,
  Trash2,
  Check,
  Image as ImageIcon,
  BookOpen,
  PlayCircle,
  RefreshCw,
  Download,
  X,
  Volume2,
  Copy,
  ClipboardCopy,
  Eye,
  FileText,
  Wrench,
  Factory,
  Settings,
  Minimize2
} from 'lucide-react';

// Text-to-Speech helper function
const speak = (text: string, lang: 'en-US' | 'ja-JP') => {
  if ('speechSynthesis' in window) {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9; // Slightly slower for clarity

    // Try to find a native voice for the language
    const voices = window.speechSynthesis.getVoices();
    const nativeVoice = voices.find(v => v.lang.startsWith(lang.split('-')[0]));
    if (nativeVoice) {
      utterance.voice = nativeVoice;
    }

    window.speechSynthesis.speak(utterance);
  } else {
    alert('Your browser does not support text-to-speech.');
  }
};

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('HOME');
  const [groups, setGroups] = useState<WordGroup[]>([]);
  const [activeGroup, setActiveGroup] = useState<WordGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [showImportModal, setShowImportModal] = useState(false);

  // Load groups on mount
  useEffect(() => {
    const loadGroups = async () => {
      setLoading(true);
      const data = await wordService.getGroups();
      setGroups(data);
      setLoading(false);
    };
    loadGroups();
  }, []);

  const refreshGroups = async () => {
    const data = await wordService.getGroups();
    setGroups(data);
  };

  const handleCreateNew = () => {
    const newGroup = wordService.createEmptyGroup();
    setActiveGroup(newGroup);
    setView('CREATE');
  };

  const handleSaveGroup = async () => {
    if (activeGroup) {
      // Validate that at least some words are entered
      const hasContent = activeGroup.words.some(w => w.term.trim() !== '');
      if (!hasContent) {
        alert("Please enter at least one word!");
        return;
      }
      await wordService.saveGroup(activeGroup);
      await refreshGroups();
      setView('HOME');
    }
  };

  const handleDeleteGroup = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this day?')) {
      await wordService.deleteGroup(id);
      await refreshGroups();
    }
  };

  const handleSelectGroup = (group: WordGroup) => {
    setActiveGroup(group);
    setView('STUDY');
  };

  const handleImportSuccess = async () => {
    setShowImportModal(false);
    await refreshGroups();
  };

  return (
    <div className="min-h-screen bg-[#F0EBE0] font-sans text-gray-800 flex justify-center py-4 md:py-8 px-2 md:px-0">
      <div className="w-full max-w-4xl flex relative">

        {/* Spiral Binding Visuals */}
        <div className="w-12 md:w-16 bg-[#3a3a3a] rounded-l-2xl flex flex-col items-center pt-10 gap-8 relative shrink-0 shadow-xl z-10">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="w-full h-8 relative">
              {/* The Hole */}
              <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-4 h-4 bg-[#F0EBE0] rounded-full shadow-inner"></div>
              {/* The Ring */}
              <div className="absolute left-[-10px] top-1/2 -translate-y-1/2 w-[calc(100%+20px)] h-2 bg-gray-400 rounded-full rotate-[-5deg] border border-gray-500 shadow-md"></div>
            </div>
          ))}
        </div>

        {/* Notebook Page */}
        <div className="flex-1 bg-white min-h-[90vh] rounded-r-2xl border-y-4 border-r-4 border-black shadow-2xl p-6 md:p-10 relative overflow-hidden">
          {/* Background Grid Lines (Optional subtle touch) */}
          <div className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(transparent_29px,#000_30px)] bg-[length:100%_30px] mt-10"></div>

          {/* Header */}
          <header className="mb-8 flex justify-between items-center relative z-10">
            <h1 className="text-3xl md:text-4xl font-black tracking-wider text-black drop-shadow-sm flex items-center gap-3">
              <span className="bg-toon-pink border-4 border-black rounded-full p-2">📚</span>
              ToonVocab
            </h1>
            {view !== 'HOME' && (
              <Button variant="secondary" onClick={() => setView('HOME')} icon={<ArrowLeft size={20} />}>
                Back
              </Button>
            )}
          </header>

          {/* Views */}
          <div className="relative z-10">
            {loading ? (
              <div className="py-20 text-center">
                <div className="animate-spin inline-block w-12 h-12 border-4 border-black border-t-transparent rounded-full mb-4"></div>
                <p className="text-xl font-bold text-gray-500">Loading...</p>
              </div>
            ) : (
              <>
                {view === 'HOME' && (
                  <HomeView
                    groups={groups}
                    onCreate={handleCreateNew}
                    onSelect={handleSelectGroup}
                    onDelete={handleDeleteGroup}
                    onImport={() => setShowImportModal(true)}
                    onToolbox={() => setView('TOOLBOX')}
                  />
                )}

                {view === 'CREATE' && activeGroup && (
                  <CreateEditView
                    group={activeGroup}
                    setGroup={setActiveGroup}
                    onSave={handleSaveGroup}
                  />
                )}

                {view === 'STUDY' && activeGroup && (
                  <StudyView
                    group={activeGroup}
                    onEdit={() => setView('CREATE')}
                    onStartReview={() => setView('REVIEW')}
                    onImageUpdate={async (img) => {
                      await wordService.updateGroupImage(activeGroup.id, img);
                      const groups = await wordService.getGroups();
                      const updated = groups.find(g => g.id === activeGroup.id);
                      if (updated) setActiveGroup(updated);
                    }}
                    onAddImage={async (img) => {
                      await wordService.addGroupImage(activeGroup.id, img);
                      const groups = await wordService.getGroups();
                      const updated = groups.find(g => g.id === activeGroup.id);
                      if (updated) setActiveGroup(updated);
                    }}
                    onDeleteImage={async (index) => {
                      await wordService.deleteGroupImage(activeGroup.id, index);
                      const groups = await wordService.getGroups();
                      const updated = groups.find(g => g.id === activeGroup.id);
                      if (updated) setActiveGroup(updated);
                    }}
                    onCompressAllImages={async (compressedMain, compressedUrls) => {
                      // Update main image if it was compressed
                      if (compressedMain) {
                        await wordService.updateGroupImage(activeGroup.id, compressedMain);
                      }
                      // Update imageUrls array if any were compressed
                      if (compressedUrls && compressedUrls.length > 0) {
                        // Need to save the whole group with updated imageUrls
                        const groups = await wordService.getGroups();
                        const currentGroup = groups.find(g => g.id === activeGroup.id);
                        if (currentGroup) {
                          const updated = { ...currentGroup, imageUrls: compressedUrls };
                          if (compressedMain) updated.imageUrl = compressedMain;
                          await wordService.saveGroup(updated);
                        }
                      }
                      // Refresh
                      const groups = await wordService.getGroups();
                      const updated = groups.find(g => g.id === activeGroup.id);
                      if (updated) setActiveGroup(updated);
                    }}
                  />
                )}

                {view === 'REVIEW' && activeGroup && (
                  <ReviewView
                    group={activeGroup}
                    onComplete={async (passed) => {
                      if (passed) {
                        const updated = { ...activeGroup, passed: true };
                        await wordService.saveGroup(updated);
                        setActiveGroup(updated);
                        await refreshGroups();
                      }
                    }}
                    onExit={() => setView('STUDY')}
                  />
                )}

                {view === 'TOOLBOX' && (
                  <ToolboxView onSelectTool={(tool) => setView(tool as ViewState)} />
                )}

                {view === 'ARTICLE_PICKER' && (
                  <ArticlePickerView />
                )}

                {view === 'WORD_FACTORY' && (
                  <WordFactoryView
                    onOpenSettings={() => setView('WORD_FACTORY_SETTINGS')}
                    homeGroups={groups}
                    onAddToHome={async (groupData) => {
                      await wordService.saveGroup(groupData);
                      await refreshGroups();
                    }}
                  />
                )}

                {view === 'WORD_FACTORY_SETTINGS' && (
                  <WordFactorySettingsView onBack={() => setView('WORD_FACTORY')} />
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onSuccess={handleImportSuccess}
        />
      )}
    </div>
  );
};

// --- Sub-Components ---











// --- Sub-Components ---

// Import Modal Component
const ImportModal: React.FC<{
  onClose: () => void;
  onSuccess: () => void;
}> = ({ onClose, onSuccess }) => {
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);

  const exampleJson = `{
  "title": "Day 5",
  "words": [
    {
      "term": "example",
      "meaningCn": "例子",
      "meaningEn": "a representative instance",
      "meaningJp": "例",
      "meaningJpReading": "れい"
    }
  ]
}`;

  const handleImport = async () => {
    setError('');
    try {
      const data = JSON.parse(jsonText);
      if (!data.title || !data.words || !Array.isArray(data.words)) {
        throw new Error('Invalid format. Must have "title" and "words" array.');
      }

      setImporting(true);
      const result = await wordService.importFromJson(data);
      if (result) {
        onSuccess();
      } else {
        throw new Error('Import failed');
      }
    } catch (e: any) {
      setError(e.message || 'Invalid JSON format');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl border-4 border-black shadow-comic max-w-2xl w-full max-h-[90vh] overflow-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black flex items-center gap-2">
            <Download size={24} /> Import JSON
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="mb-4">
          <p className="font-bold text-gray-600 mb-2">Paste your JSON below:</p>
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            className="w-full h-48 p-4 border-2 border-black rounded-xl font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-toon-pink"
            placeholder={exampleJson}
          />
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 border-2 border-red-300 rounded-xl text-red-700 font-bold">
            ❌ {error}
          </div>
        )}

        <div className="bg-gray-100 p-4 rounded-xl mb-6">
          <p className="font-bold text-sm text-gray-600 mb-2">📝 Expected JSON Format:</p>
          <pre className="text-xs overflow-x-auto bg-gray-800 text-green-400 p-3 rounded-lg">
            {exampleJson}
          </pre>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleImport}
            disabled={!jsonText.trim() || importing}
            icon={importing ? <RefreshCw className="animate-spin" size={20} /> : <Check size={20} />}
          >
            {importing ? 'Importing...' : 'Import'}
          </Button>
        </div>
      </div>
    </div>
  );
};

const HomeView: React.FC<{
  groups: WordGroup[];
  onCreate: () => void;
  onSelect: (g: WordGroup) => void;
  onDelete: (e: React.MouseEvent, id: string) => void;
  onImport: () => void;
  onToolbox: () => void;
}> = ({ groups, onCreate, onSelect, onDelete, onImport, onToolbox }) => (
  <div className="space-y-6">
    <div className="flex justify-between items-end flex-wrap gap-2">
      <p className="text-xl font-bold text-gray-500">My Daily Words</p>
      <div className="flex gap-2 flex-wrap">
        <Button variant="secondary" onClick={onToolbox} icon={<Wrench size={20} />}>Toolbox</Button>
        <Button variant="secondary" onClick={onImport} icon={<Download size={20} />}>Import JSON</Button>
        <Button onClick={onCreate} icon={<Plus size={24} />}>New Day</Button>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {groups.length === 0 && (
        <div className="col-span-full py-20 text-center border-4 border-dashed border-gray-300 rounded-3xl">
          <p className="text-2xl font-bold text-gray-400">No words yet! Start drawing & learning.</p>
        </div>
      )}
      {groups.map(group => (
        <div
          key={group.id}
          onClick={() => onSelect(group)}
          className={`
            relative p-6 rounded-3xl border-4 border-black cursor-pointer transition-transform hover:-translate-y-1 hover:shadow-comic
            ${group.passed ? 'bg-toon-green' : 'bg-white'}
          `}
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-2xl font-black">{group.title}</h3>
              <p className="text-gray-600 font-bold">{new Date(group.createdAt).toLocaleDateString()}</p>
            </div>
            {group.passed && <div className="bg-black text-white px-3 py-1 rounded-full text-xs font-bold">PASSED</div>}
          </div>

          <div className="flex justify-between items-center mt-4">
            <span className="font-bold text-gray-500">{group.words.filter(w => w.term).length} Words</span>
            <button
              onClick={(e) => onDelete(e, group.id)}
              className="p-3 bg-white hover:bg-red-100 rounded-full border-2 border-black text-red-500 transition-colors z-20 shadow-sm"
              title="Delete Day"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const CreateEditView: React.FC<{
  group: WordGroup;
  setGroup: (g: WordGroup) => void;
  onSave: () => void;
}> = ({ group, setGroup, onSave }) => {
  const handleWordChange = (index: number, field: keyof Word, value: string) => {
    const newWords = [...group.words];
    newWords[index] = { ...newWords[index], [field]: value };
    setGroup({ ...group, words: newWords });
  };

  return (
    <div className="bg-white border-4 border-black rounded-3xl p-6 md:p-8 shadow-comic">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black">Edit Words</h2>
        <Input
          value={group.title}
          onChange={(e) => setGroup({ ...group, title: e.target.value })}
          placeholder="Group Title (e.g. Day 1)"
          className="max-w-[200px] bg-gray-100"
        />
      </div>

      <div className="bg-toon-yellow/30 p-4 rounded-xl mb-6 border-2 border-dashed border-black">
        <p className="font-bold text-sm text-center mb-2">📸 Don't forget to upload your drawing in Study Mode!</p>
      </div>

      <div className="space-y-6 mb-8">
        {group.words.map((word, idx) => (
          <div key={word.id} className="flex flex-col gap-4 items-start p-4 bg-gray-50 rounded-xl border-2 border-gray-200">
            <div className="flex items-center gap-2 w-full">
              <div className="bg-black text-white font-bold w-8 h-8 flex items-center justify-center rounded-lg shrink-0">
                {idx + 1}
              </div>
              {/* Main Term */}
              <Input
                placeholder="English Word (e.g. Apple)"
                value={word.term}
                onChange={(e) => handleWordChange(idx, 'term', e.target.value)}
                className="font-bold border-black bg-gray-100"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 w-full pl-0 md:pl-10">
              <Input
                placeholder="🇨🇳 Chinese (中文)"
                value={word.meaningCn}
                onChange={(e) => handleWordChange(idx, 'meaningCn', e.target.value)}
                className="text-sm bg-gray-100"
              />
              <Input
                placeholder="🇬🇧 English Definition"
                value={word.meaningEn}
                onChange={(e) => handleWordChange(idx, 'meaningEn', e.target.value)}
                className="text-sm bg-gray-100"
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="🇯🇵 Japanese (日本語)"
                  value={word.meaningJp}
                  onChange={(e) => handleWordChange(idx, 'meaningJp', e.target.value)}
                  className="text-sm bg-gray-100"
                />
                <Input
                  placeholder="Japanese Reading (Hiragana)"
                  value={word.meaningJpReading}
                  onChange={(e) => handleWordChange(idx, 'meaningJpReading', e.target.value)}
                  className="text-sm bg-gray-100"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button onClick={onSave} icon={<Check />}>Save & Finish</Button>
      </div>
    </div>
  );
};

const StudyView: React.FC<{
  group: WordGroup;
  onEdit: () => void;
  onStartReview: () => void;
  onImageUpdate: (base64: string) => void;
  onAddImage: (base64: string) => Promise<void>;
  onDeleteImage: (index: number) => Promise<void>;
  onCompressAllImages: (compressedMain: string | null, compressedUrls: string[]) => Promise<void>;
}> = ({ group, onEdit, onStartReview, onImageUpdate, onAddImage, onDeleteImage, onCompressAllImages }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const visualFileInputRef = useRef<HTMLInputElement>(null);
  const [showImages, setShowImages] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [compressing, setCompressing] = useState(false);

  // Compress ALL images in the group (main image + imageUrls)
  const handleCompressAllImages = async () => {
    const allImages = group.imageUrls || [];
    const hasMainImage = !!group.imageUrl;
    const totalImages = (hasMainImage ? 1 : 0) + allImages.length;

    if (totalImages === 0) {
      alert('没有可压缩的图片');
      return;
    }

    setCompressing(true);
    try {
      let totalOriginalSize = 0;
      let totalCompressedSize = 0;

      // Compress main image
      let compressedMain: string | null = null;
      if (group.imageUrl) {
        const originalSize = imageService.getDataUrlSize(group.imageUrl);
        totalOriginalSize += originalSize;
        compressedMain = await imageService.compressImage(group.imageUrl);
        const compressedSize = imageService.getDataUrlSize(compressedMain);
        totalCompressedSize += compressedSize;
      }

      // Compress all imageUrls
      const compressedUrls: string[] = [];
      for (const imgUrl of allImages) {
        const originalSize = imageService.getDataUrlSize(imgUrl);
        totalOriginalSize += originalSize;
        const compressed = await imageService.compressImage(imgUrl);
        const compressedSize = imageService.getDataUrlSize(compressed);
        totalCompressedSize += compressedSize;
        compressedUrls.push(compressed);
      }

      // Save all compressed images
      await onCompressAllImages(compressedMain, compressedUrls);

      const savedPercent = Math.round((1 - totalCompressedSize / totalOriginalSize) * 100);
      alert(`压缩完成！\n共 ${totalImages} 张图片\n格式: AVIF\n原始: ${imageService.formatBytes(totalOriginalSize)}\n压缩后: ${imageService.formatBytes(totalCompressedSize)}\n减少: ${savedPercent}%`);
    } catch (err) {
      console.error('Compression failed:', err);
      alert('压缩失败，请重试');
    } finally {
      setCompressing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onImageUpdate(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVisualUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        await onAddImage(reader.result as string);
      } catch (err) {
        alert('Failed to upload image');
      } finally {
        setUploading(false);
        if (visualFileInputRef.current) visualFileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteImage = async (index: number) => {
    if (!window.confirm('Delete this image?')) return;
    await onDeleteImage(index);
  };

  const allImages = group.imageUrls || [];

  return (
    <div className="space-y-8">
      {/* Top Image Section */}
      <div className="w-full bg-white border-4 border-black rounded-3xl p-4 shadow-comic overflow-hidden relative min-h-[300px] flex items-center justify-center bg-gray-50">
        {group.imageUrl ? (
          <div className="relative w-full h-full group">
            <img
              src={group.imageUrl}
              alt="Visual Aid"
              className="w-full h-auto max-h-[500px] object-contain rounded-xl"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute top-4 right-4 bg-white border-2 border-black p-2 rounded-xl shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <RefreshCw size={20} />
            </button>
          </div>
        ) : (
          <div className="text-center py-12">
            <ImageIcon size={64} className="mx-auto text-gray-300 mb-4" />
            <p className="font-bold text-gray-500 mb-4">Draw your 10 words together and upload here!</p>
            <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
              Upload Drawing
            </Button>
          </div>
        )}
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={handleFileChange}
        />
      </div>

      <div className="flex justify-between items-center flex-wrap gap-2">
        <h2 className="text-3xl font-black">{group.title}</h2>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={async () => {
              const words = group.words.filter(w => w.term.trim()).map(w => w.term).join('\n');
              await navigator.clipboard.writeText(words);
              alert('Words copied to clipboard!');
            }}
            className="flex items-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl border-2 border-black text-sm font-bold transition-colors"
            title="Copy all words to clipboard"
          >
            <Copy size={16} /> Copy Words
          </button>
          {group.imageUrl && (
            <button
              onClick={async () => {
                try {
                  const response = await fetch(group.imageUrl!);
                  const blob = await response.blob();
                  await navigator.clipboard.write([
                    new ClipboardItem({ [blob.type]: blob })
                  ]);
                  alert('Image copied to clipboard!');
                } catch (err) {
                  alert('Failed to copy image. Your browser may not support this feature.');
                }
              }}
              className="flex items-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl border-2 border-black text-sm font-bold transition-colors"
              title="Copy image to clipboard"
            >
              <ClipboardCopy size={16} /> Copy Image
            </button>
          )}
          {(group.imageUrl || (group.imageUrls && group.imageUrls.length > 0)) && (
            <button
              onClick={handleCompressAllImages}
              disabled={compressing}
              className={`flex items-center gap-1 px-3 py-2 rounded-xl border-2 border-black text-sm font-bold transition-colors ${compressing
                ? 'bg-gray-300 cursor-wait'
                : 'bg-toon-blue hover:bg-blue-300'
                }`}
              title="一键压缩所有图片为AVIF格式"
            >
              {compressing ? (
                <><RefreshCw size={16} className="animate-spin" /> 压缩中...</>
              ) : (
                <><Minimize2 size={16} /> 压缩全部图片</>
              )}
            </button>
          )}
          <Button variant="secondary" onClick={onEdit} icon={<BookOpen size={20} />}>Edit</Button>
          <Button
            variant={showImages ? "primary" : "secondary"}
            onClick={() => setShowImages(!showImages)}
            icon={<Eye size={20} />}
          >
            {showImages ? 'Words' : 'Visualization'}
          </Button>
          <Button variant="success" onClick={onStartReview} icon={<PlayCircle size={20} />}>Test</Button>
        </div>
      </div>

      {/* Toggle between Words and Images view */}
      {showImages ? (
        /* Images Gallery View */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-gray-600">Additional visualization images</p>
            <button
              onClick={() => visualFileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-4 py-2 bg-toon-blue hover:bg-toon-blue/80 rounded-xl border-2 border-black font-bold transition-colors"
            >
              {uploading ? (
                <><RefreshCw size={18} className="animate-spin" /> Uploading...</>
              ) : (
                <><Plus size={18} /> Add Image</>
              )}
            </button>
            <input
              type="file"
              ref={visualFileInputRef}
              className="hidden"
              accept="image/*"
              onChange={handleVisualUpload}
            />
          </div>

          {allImages.length === 0 ? (
            <div className="text-center py-16 border-4 border-dashed border-gray-300 rounded-3xl">
              <ImageIcon size={48} className="mx-auto text-gray-300 mb-4" />
              <p className="text-gray-400 font-bold">No additional images yet</p>
              <p className="text-gray-400 text-sm">Click "Add Image" to upload visualization images</p>
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              {allImages.map((url, idx) => (
                <div key={idx} className="relative group pt-6 pl-6">
                  <div className="border-4 border-black rounded-3xl overflow-hidden shadow-comic bg-white relative">
                    <img
                      src={url}
                      alt={`Visualization ${idx + 1}`}
                      className="w-full h-auto min-h-[300px] object-contain bg-gray-50"
                    />
                    <button
                      onClick={() => handleDeleteImage(idx)}
                      className="absolute top-4 right-4 p-3 bg-red-500 text-white rounded-xl border-2 border-black opacity-0 group-hover:opacity-100 transition-opacity shadow-comic hover:bg-red-600 z-10"
                      title="Delete image"
                    >
                      <Trash2 size={24} />
                    </button>
                  </div>
                  <div className="absolute top-0 left-0 flex items-center justify-center bg-black text-white w-12 h-12 rounded-xl text-xl font-black border-2 border-white shadow-lg z-20">
                    <span className="leading-none">#{idx + 1}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Words List View */
        <div className="grid grid-cols-1 gap-4">
          {group.words.filter(w => w.term).map((word, idx) => (
            <div key={word.id} className="bg-white p-6 rounded-2xl border-2 border-black flex flex-col md:flex-row gap-6 items-start hover:bg-toon-yellow/20 transition-colors">
              <div className="bg-toon-blue font-bold w-12 h-12 flex items-center justify-center rounded-full border-2 border-black shrink-0 text-xl">
                {idx + 1}
              </div>

              <div className="flex-1 w-full">
                <div className="flex items-center gap-3 mb-4 border-b-2 border-gray-100 pb-2">
                  <p className="font-black text-3xl">{word.term}</p>
                  <button
                    onClick={() => speak(word.term, 'en-US')}
                    className="p-2 hover:bg-blue-100 rounded-full transition-colors text-blue-600"
                    title="Listen to English pronunciation"
                  >
                    <Volume2 size={20} />
                  </button>
                </div>

                <div className="space-y-3">
                  {word.meaningCn && (
                    <div className="flex items-start gap-2">
                      <span className="shrink-0 bg-red-100 text-red-800 text-xs px-2 py-1 rounded font-bold mt-1">CN</span>
                      <p className="text-lg text-gray-800 leading-snug">{word.meaningCn}</p>
                    </div>
                  )}
                  {word.meaningEn && (
                    <div className="flex items-start gap-2">
                      <span className="shrink-0 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded font-bold mt-1">EN</span>
                      <p className="text-lg text-gray-800 leading-snug font-medium italic">{word.meaningEn}</p>
                    </div>
                  )}
                  {word.meaningJp && (
                    <div className="flex items-start gap-2">
                      <span className="shrink-0 bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded font-bold mt-1">JP</span>
                      <div className="text-xl text-gray-800 leading-snug font-serif flex items-center gap-2">
                        <ruby>
                          {word.meaningJp}
                          <rt className="text-xs text-gray-500 font-sans tracking-wide">{word.meaningJpReading}</rt>
                        </ruby>
                        <button
                          onClick={() => speak(word.meaningJpReading || word.meaningJp, 'ja-JP')}
                          className="p-1.5 hover:bg-gray-200 rounded-full transition-colors text-gray-600"
                          title="Listen to Japanese pronunciation"
                        >
                          <Volume2 size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ReviewView: React.FC<{
  group: WordGroup;
  onComplete: (passed: boolean) => void;
  onExit: () => void;
}> = ({ group, onComplete, onExit }) => {
  // Filter only valid words
  const wordsToReview = React.useMemo(() => group.words.filter(w => w.term.trim() !== ''), [group]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [input, setInput] = useState('');
  const [results, setResults] = useState<boolean[]>([]);
  const [showResult, setShowResult] = useState(false); // Finished all words?

  const currentWord = wordsToReview[currentIndex];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const isCorrect = input.trim().toLowerCase() === currentWord.term.trim().toLowerCase();

    const newResults = [...results, isCorrect];
    setResults(newResults);
    setInput('');

    if (currentIndex + 1 < wordsToReview.length) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setShowResult(true);
      const passed = newResults.every(r => r === true);
      onComplete(passed);
    }
  };

  const isPassed = results.every(r => r === true) && results.length === wordsToReview.length;

  if (showResult) {
    return (
      <div className="text-center py-12 px-4 max-w-2xl mx-auto">
        <div className={`
          p-8 rounded-3xl border-4 border-black shadow-comic mb-8
          ${isPassed ? 'bg-toon-green' : 'bg-red-100'}
        `}>
          <div className="text-6xl mb-4">{isPassed ? '🎉' : '😓'}</div>
          <h2 className="text-4xl font-black mb-4">
            {isPassed ? 'Detection Passed!' : 'Keep Trying!'}
          </h2>
          <p className="text-xl font-bold mb-6">
            You got {results.filter(r => r).length} out of {wordsToReview.length} correct.
          </p>

          {!isPassed && (
            <div className="text-left bg-white/50 p-4 rounded-xl mb-6 max-h-60 overflow-y-auto">
              <p className="font-bold mb-2">Mistakes:</p>
              {results.map((res, idx) => !res && (
                <div key={idx} className="flex justify-between items-center border-b border-black/10 py-2">
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-500 text-xs">Correct:</span>
                    <span className="text-gray-800">{wordsToReview[idx].term}</span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="font-bold text-gray-500 text-xs">Clue:</span>
                    <span className="text-gray-600 text-sm truncate max-w-[150px]">{wordsToReview[idx].meaningCn}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-center gap-4">
            <Button onClick={onExit} variant="secondary">Back to Study</Button>
            {!isPassed && (
              <Button onClick={() => {
                setResults([]);
                setCurrentIndex(0);
                setShowResult(false);
              }}>Try Again</Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto py-12">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Review Mode</h2>
        <span className="bg-black text-white px-4 py-2 rounded-xl font-bold">
          {currentIndex + 1} / {wordsToReview.length}
        </span>
      </div>

      <div className="bg-white border-4 border-black rounded-3xl p-8 shadow-comic relative overflow-hidden">
        {/* Progress Bar */}
        <div className="absolute top-0 left-0 h-2 bg-gray-100 w-full">
          <div
            className="h-full bg-toon-pink transition-all duration-300"
            style={{ width: `${((currentIndex) / wordsToReview.length) * 100}%` }}
          />
        </div>

        <div className="text-center mb-8 mt-6">
          <p className="text-gray-400 font-bold uppercase text-xs mb-4">What is this word?</p>

          <div className="space-y-6">
            <div className="bg-red-50 p-4 rounded-xl border-2 border-red-100 text-left">
              <span className="block text-xs font-bold text-red-300 mb-1">CHINESE</span>
              <p className="text-xl font-black text-gray-800">{currentWord.meaningCn}</p>
            </div>

            <div className="flex flex-col gap-4">
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-left">
                <span className="block text-xs font-bold text-blue-300 mb-1">ENGLISH</span>
                <p className="text-lg font-bold text-blue-900 leading-snug">{currentWord.meaningEn}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-left">
                <span className="block text-xs font-bold text-gray-400 mb-1">JAPANESE</span>
                <div className="text-xl font-bold text-gray-700">
                  <ruby>
                    {currentWord.meaningJp}
                    <rt className="text-xs text-gray-400 font-normal">{currentWord.meaningJpReading}</rt>
                  </ruby>
                </div>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            autoFocus
            placeholder="Type the English word..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="text-center text-2xl font-bold bg-gray-50"
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
          />
          <Button type="submit" className="w-full py-4 text-xl">Next</Button>
        </form>
      </div>
    </div>
  );
};

// Toolbox View Component - Tool Selection Page
const ToolboxView: React.FC<{
  onSelectTool: (tool: string) => void;
}> = ({ onSelectTool }) => {
  // Define available tools
  const tools = [
    {
      id: 'ARTICLE_PICKER',
      name: 'Article Picker',
      description: 'Extract words from articles',
      icon: <FileText size={40} />,
      color: 'bg-toon-pink'
    },
    {
      id: 'WORD_FACTORY',
      name: '单词加工厂',
      description: 'AI翻译+可视化',
      icon: <Factory size={40} />,
      color: 'bg-toon-blue'
    },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-black flex items-center justify-center gap-3">
          <span className="bg-toon-yellow border-4 border-black rounded-full p-2">🧰</span>
          Toolbox
        </h2>
        <p className="text-gray-500 font-bold mt-2">Select a tool to get started</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => onSelectTool(tool.id)}
            className="group flex flex-col items-center p-6 bg-white border-4 border-black rounded-3xl shadow-comic hover:shadow-comic-lg hover:-translate-y-1 transition-all duration-200"
          >
            {/* Icon Container - Rounded Square */}
            <div className={`
              w-20 h-20 ${tool.color} border-4 border-black rounded-2xl
              flex items-center justify-center mb-4
              group-hover:scale-110 transition-transform duration-200
            `}>
              {tool.icon}
            </div>
            {/* Tool Name */}
            <span className="font-black text-lg text-center">{tool.name}</span>
            {/* Tool Description */}
            <span className="text-sm text-gray-500 text-center mt-1">{tool.description}</span>
          </button>
        ))}

        {/* Placeholder for future tools */}
        <div className="flex flex-col items-center p-6 bg-gray-50 border-4 border-dashed border-gray-300 rounded-3xl opacity-50">
          <div className="w-20 h-20 bg-gray-200 border-4 border-dashed border-gray-400 rounded-2xl flex items-center justify-center mb-4">
            <Plus size={40} className="text-gray-400" />
          </div>
          <span className="font-bold text-gray-400">More Coming</span>
          <span className="text-sm text-gray-400 text-center mt-1">Stay tuned!</span>
        </div>
      </div>
    </div>
  );
};

// Token info for tracking position
interface TokenInfo {
  text: string;
  index: number;
  isWord: boolean;
  isNewline: boolean;
}

// Word meaning from dictionary API
interface WordMeaning {
  word: string;
  phonetic?: string;
  definitions: string[];
  loading: boolean;
  error?: string;
}

// Floating Panel Component
const FloatingMeaningPanel: React.FC<{
  selectedItems: string[];
  phrases: string[];
  meanings: Map<string, WordMeaning>;
  onFetchMeaning: (word: string) => void;
}> = ({ selectedItems, phrases, meanings, onFetchMeaning }) => {
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isMinimized, setIsMinimized] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.panel-content')) return;
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // Fetch meanings for new words
  useEffect(() => {
    selectedItems.forEach(word => {
      if (!meanings.has(word)) {
        onFetchMeaning(word);
      }
    });
  }, [selectedItems, meanings, onFetchMeaning]);

  const allItems = [...selectedItems, ...phrases];

  if (allItems.length === 0) return null;

  return (
    <div
      ref={panelRef}
      className="fixed z-50 bg-white border-4 border-black rounded-2xl shadow-comic overflow-hidden"
      style={{
        left: position.x,
        top: position.y,
        width: isMinimized ? 200 : 320,
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none'
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header */}
      <div className="bg-toon-blue px-4 py-2 flex justify-between items-center border-b-4 border-black">
        <span className="font-black text-sm">📖 Word Meanings ({allItems.length})</span>
        <button
          onClick={() => setIsMinimized(!isMinimized)}
          className="w-6 h-6 bg-white rounded-full border-2 border-black flex items-center justify-center hover:bg-gray-100"
        >
          {isMinimized ? '+' : '−'}
        </button>
      </div>

      {/* Content */}
      {!isMinimized && (
        <div className="panel-content max-h-[400px] overflow-y-auto p-3 space-y-3" style={{ cursor: 'default' }}>
          {/* Phrases Section */}
          {phrases.length > 0 && (
            <div className="mb-4">
              <div className="text-xs font-bold text-purple-600 mb-2">📚 PHRASES</div>
              {phrases.map((phrase, idx) => (
                <div key={`phrase-${idx}`} className="bg-purple-100 p-2 rounded-lg mb-2 border-2 border-purple-300">
                  <span className="font-bold text-purple-800">{phrase}</span>
                </div>
              ))}
            </div>
          )}

          {/* Words Section */}
          {selectedItems.length > 0 && (
            <div>
              <div className="text-xs font-bold text-pink-600 mb-2">📝 WORDS</div>
              {selectedItems.map((word, idx) => {
                const meaning = meanings.get(word);
                return (
                  <div key={`word-${idx}`} className="bg-pink-50 p-2 rounded-lg mb-2 border-2 border-pink-200">
                    <div className="font-bold text-pink-800 flex items-center gap-2">
                      {word}
                      {meaning?.phonetic && (
                        <span className="text-xs font-normal text-gray-500">{meaning.phonetic}</span>
                      )}
                    </div>
                    {meaning?.loading && (
                      <div className="text-xs text-gray-400 italic">Loading...</div>
                    )}
                    {meaning?.error && (
                      <div className="text-xs text-red-400">{meaning.error}</div>
                    )}
                    {meaning?.definitions && meaning.definitions.length > 0 && (
                      <div className="text-xs text-gray-600 mt-1">
                        {meaning.definitions.slice(0, 2).map((def, i) => (
                          <div key={i} className="mb-1">• {def}</div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Article Picker View Component
const ArticlePickerView: React.FC = () => {
  const [articleText, setArticleText] = useState('');
  const [mode, setMode] = useState<'input' | 'picking'>('input');
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [phrases, setPhrases] = useState<number[][]>([]); // Arrays of token indices forming phrases
  const [hoveredConnector, setHoveredConnector] = useState<number | null>(null);
  const [wordMeanings, setWordMeanings] = useState<Map<string, WordMeaning>>(new Map());

  // Tokenize text into words, punctuation, newlines, and whitespace
  const tokenize = (text: string): TokenInfo[] => {
    const rawTokens = text.split(/(\n|\s+|[.,!?;:'"()\[\]{}—–\-]+)/g).filter(Boolean);
    return rawTokens.map((token, index) => ({
      text: token,
      index,
      isWord: /[a-zA-Z]/.test(token),
      isNewline: token === '\n'
    }));
  };

  // Normalize word for comparison (lowercase, trim)
  const normalizeWord = (word: string): string => {
    return word.toLowerCase().replace(/[^a-zA-Z]/g, '');
  };

  // Check if a token index is part of a phrase
  const getPhraseForIndex = (index: number): number[] | null => {
    return phrases.find(phrase => phrase.includes(index)) || null;
  };

  // Get the display text for a phrase
  const getPhraseText = (phraseIndices: number[]): string => {
    return phraseIndices.map(i => tokens[i]?.text || '').join(' ');
  };

  // Find adjacent selected word indices (for showing connectors)
  const findAdjacentPairs = (): [number, number][] => {
    const pairs: [number, number][] = [];
    const wordTokens = tokens.filter(t => t.isWord);

    for (let i = 0; i < wordTokens.length - 1; i++) {
      const current = wordTokens[i];
      const next = wordTokens[i + 1];

      // Check if both are selected and not already in the same phrase
      if (selectedIndices.has(current.index) && selectedIndices.has(next.index)) {
        const currentPhrase = getPhraseForIndex(current.index);
        const nextPhrase = getPhraseForIndex(next.index);

        // Only show connector if they're not in the same phrase
        if (!currentPhrase || !nextPhrase || currentPhrase !== nextPhrase) {
          pairs.push([current.index, next.index]);
        }
      }
    }
    return pairs;
  };

  // Merge two adjacent words/phrases into a phrase
  const handleMerge = (index1: number, index2: number) => {
    const phrase1 = getPhraseForIndex(index1);
    const phrase2 = getPhraseForIndex(index2);

    let newPhrase: number[];
    let newPhrases = phrases.filter(p => p !== phrase1 && p !== phrase2);

    if (phrase1 && phrase2) {
      // Merge two phrases
      newPhrase = [...phrase1, ...phrase2].sort((a, b) => a - b);
    } else if (phrase1) {
      // Add word to existing phrase
      newPhrase = [...phrase1, index2].sort((a, b) => a - b);
    } else if (phrase2) {
      // Add word to existing phrase
      newPhrase = [index1, ...phrase2].sort((a, b) => a - b);
    } else {
      // Create new phrase from two words
      newPhrase = [index1, index2].sort((a, b) => a - b);
    }

    setPhrases([...newPhrases, newPhrase]);
    setHoveredConnector(null);
  };

  // Fetch word meaning from Free Dictionary API
  const fetchMeaning = async (word: string) => {
    const normalized = normalizeWord(word);
    if (!normalized || wordMeanings.has(normalized)) return;

    setWordMeanings(prev => new Map(prev).set(normalized, {
      word: normalized,
      definitions: [],
      loading: true
    }));

    try {
      const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${normalized}`);
      if (!response.ok) throw new Error('Not found');

      const data = await response.json();
      const meanings = data[0]?.meanings || [];
      const definitions: string[] = [];
      const phonetic = data[0]?.phonetic || data[0]?.phonetics?.[0]?.text;

      meanings.forEach((m: any) => {
        m.definitions?.slice(0, 2).forEach((d: any) => {
          if (d.definition) definitions.push(d.definition);
        });
      });

      setWordMeanings(prev => new Map(prev).set(normalized, {
        word: normalized,
        phonetic,
        definitions: definitions.slice(0, 3),
        loading: false
      }));
    } catch {
      setWordMeanings(prev => new Map(prev).set(normalized, {
        word: normalized,
        definitions: [],
        loading: false,
        error: 'No definition found'
      }));
    }
  };

  const handleStartPicking = () => {
    if (!articleText.trim()) {
      alert('Please paste an article first!');
      return;
    }
    const tokenized = tokenize(articleText);
    setTokens(tokenized);
    setSelectedIndices(new Set());
    setPhrases([]);
    setWordMeanings(new Map());
    setMode('picking');
  };

  const handleWordClick = (tokenIndex: number) => {
    const token = tokens[tokenIndex];
    if (!token || !token.isWord) return;

    // Check if part of a phrase
    const phrase = getPhraseForIndex(tokenIndex);

    setSelectedIndices(prev => {
      const newSet = new Set(prev);
      if (phrase) {
        // Deselect entire phrase
        phrase.forEach(i => newSet.delete(i));
        setPhrases(phrases.filter(p => p !== phrase));
      } else if (newSet.has(tokenIndex)) {
        newSet.delete(tokenIndex);
      } else {
        newSet.add(tokenIndex);
      }
      return newSet;
    });
  };

  const handleExportJson = () => {
    // Collect single words
    const singleWords: string[] = [];
    const phraseTexts: string[] = [];

    selectedIndices.forEach(idx => {
      const phrase = getPhraseForIndex(idx);
      if (!phrase) {
        singleWords.push(normalizeWord(tokens[idx].text));
      }
    });

    // Collect phrases
    phrases.forEach(phraseIndices => {
      phraseTexts.push(getPhraseText(phraseIndices));
    });

    const exportData = {
      exportedAt: new Date().toISOString(),
      words: [...new Set(singleWords)].sort(),
      phrases: phraseTexts
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `selected-words-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setMode('input');
    setTokens([]);
    setSelectedIndices(new Set());
    setPhrases([]);
    setWordMeanings(new Map());
  };

  // Get selected words for the floating panel
  const getSelectedWords = (): string[] => {
    const words: string[] = [];
    selectedIndices.forEach(idx => {
      if (!getPhraseForIndex(idx)) {
        words.push(normalizeWord(tokens[idx].text));
      }
    });
    return [...new Set(words)];
  };

  // Get phrase texts for floating panel
  const getPhraseTexts = (): string[] => {
    return phrases.map(p => getPhraseText(p));
  };

  const adjacentPairs = mode === 'picking' ? findAdjacentPairs() : [];

  if (mode === 'input') {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-black">📝 Article Word Picker</h2>
        </div>

        <div className="bg-white border-4 border-black rounded-3xl p-6 shadow-comic">
          <p className="text-gray-600 mb-4 font-bold">
            Paste an English article below. You can then click on words to select them and export the selected words as JSON.
          </p>

          <textarea
            value={articleText}
            onChange={(e) => setArticleText(e.target.value)}
            placeholder="Paste your English article here..."
            className="w-full h-64 p-4 border-2 border-black rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-toon-pink text-lg"
          />

          <div className="flex justify-end mt-4">
            <Button
              onClick={handleStartPicking}
              disabled={!articleText.trim()}
              icon={<PlayCircle size={20} />}
            >
              Start Picking
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-black">📝 Article Word Picker</h2>
          <p className="text-gray-500 font-bold">
            Click on words to select/deselect. Selected: <span className="text-toon-pink">{selectedIndices.size}</span> words
            {phrases.length > 0 && <span className="text-purple-600 ml-2">({phrases.length} phrases)</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleReset} icon={<RefreshCw size={20} />}>
            Reset
          </Button>
          <Button
            onClick={handleExportJson}
            disabled={selectedIndices.size === 0}
            icon={<Download size={20} />}
          >
            Export JSON
          </Button>
        </div>
      </div>

      <div className="bg-white border-4 border-black rounded-3xl p-6 shadow-comic">
        <div className="text-lg leading-relaxed" style={{ fontFamily: "'Times New Roman', serif" }}>
          {tokens.map((token, index) => {
            // Handle newlines as <br> elements
            if (token.isNewline) {
              return <br key={index} />;
            }

            if (!token.isWord) {
              // Check if this is between two adjacent selected words - show connector
              const isConnectorPosition = adjacentPairs.some(([i1, i2]) => {
                // Check if this token is between i1 and i2
                return index > i1 && index < i2;
              });

              if (isConnectorPosition && selectedIndices.size > 0) {
                const pair = adjacentPairs.find(([i1, i2]) => index > i1 && index < i2);
                if (pair) {
                  return (
                    <span key={index} className="relative inline">
                      <span style={{ whiteSpace: 'pre' }}>{token.text}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMerge(pair[0], pair[1]);
                        }}
                        onMouseEnter={() => setHoveredConnector(index)}
                        onMouseLeave={() => setHoveredConnector(null)}
                        className={`
                          absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                          w-5 h-5 rounded-full flex items-center justify-center
                          text-xs font-bold transition-all duration-150
                          ${hoveredConnector === index
                            ? 'bg-purple-500 text-white scale-125 shadow-lg'
                            : 'bg-purple-200 text-purple-700 opacity-60 hover:opacity-100'}
                        `}
                        title="Click to merge into phrase"
                      >
                        ⊕
                      </button>
                    </span>
                  );
                }
              }

              // Render whitespace and punctuation as-is, preserving spaces
              return <span key={index} style={{ whiteSpace: 'pre' }}>{token.text}</span>;
            }

            const isSelected = selectedIndices.has(index);
            const phrase = getPhraseForIndex(index);
            const isPhrase = phrase !== null;

            return (
              <span
                key={index}
                onClick={() => handleWordClick(index)}
                style={isSelected ? { fontFamily: 'inherit' } : undefined}
                className={`
                  cursor-pointer rounded px-0.5 transition-all duration-150
                  ${isPhrase
                    ? 'bg-purple-400 text-white font-bold border-2 border-purple-600 shadow-sm'
                    : isSelected
                      ? 'bg-toon-pink text-white font-bold border-2 border-black shadow-sm'
                      : 'hover:bg-toon-yellow/50'
                  }
                `}
              >
                {token.text}
              </span>
            );
          })}
        </div>
      </div>

      {/* Floating Meaning Panel */}
      <FloatingMeaningPanel
        selectedItems={getSelectedWords()}
        phrases={getPhraseTexts()}
        meanings={wordMeanings}
        onFetchMeaning={fetchMeaning}
      />

      {/* Export button at the bottom */}
      <div className="flex justify-center">
        <Button
          onClick={handleExportJson}
          disabled={selectedIndices.size === 0}
          className="text-xl px-8 py-4"
          icon={<Download size={24} />}
        >
          Export {selectedIndices.size} Words as JSON
        </Button>
      </div>
    </div>
  );
};

// Word Factory Settings View Component
const WordFactorySettingsView: React.FC<{
  onBack: () => void;
}> = ({ onBack }) => {
  const [settings, setSettings] = useState<AISettings>(() => aiService.loadAISettings());
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    aiService.saveAISettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleProviderChange = (provider: AISettings['selectedProvider']) => {
    setSettings({ ...settings, selectedProvider: provider });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black flex items-center gap-3">
          <Settings size={28} />
          设置 - 单词加工厂
        </h2>
        <Button variant="secondary" onClick={onBack} icon={<ArrowLeft size={20} />}>
          返回
        </Button>
      </div>

      <div className="bg-white border-4 border-black rounded-3xl p-6 shadow-comic space-y-6">
        {/* Provider Selection */}
        <div>
          <label className="font-bold text-lg mb-3 block">选择 AI 服务商</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(['gemini', 'deepseek', 'siliconflow'] as const).map((provider) => (
              <button
                key={provider}
                onClick={() => handleProviderChange(provider)}
                className={`
                  p-4 rounded-xl border-2 transition-all text-left
                  ${settings.selectedProvider === provider
                    ? 'border-black bg-toon-yellow shadow-comic'
                    : 'border-gray-300 bg-white hover:border-gray-400'}
                `}
              >
                <div className="font-bold">{aiService.PROVIDER_DISPLAY_NAMES[provider]}</div>
                <div className="text-sm text-gray-500">
                  {provider === 'gemini' && 'Google AI'}
                  {provider === 'deepseek' && 'DeepSeek AI'}
                  {provider === 'siliconflow' && '国内服务'}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* API Keys */}
        <div className="space-y-4">
          <h3 className="font-bold text-lg">API Keys</h3>

          <div className="space-y-3">
            <div>
              <label className="font-bold text-sm block mb-1">
                Gemini API Key
                {settings.selectedProvider === 'gemini' && <span className="text-toon-pink ml-2">(当前使用)</span>}
              </label>
              <Input
                type="password"
                placeholder="输入你的 Gemini API Key"
                value={settings.geminiApiKey}
                onChange={(e) => setSettings({ ...settings, geminiApiKey: e.target.value })}
                className="bg-gray-50"
              />
            </div>

            <div>
              <label className="font-bold text-sm block mb-1">
                DeepSeek API Key
                {settings.selectedProvider === 'deepseek' && <span className="text-toon-pink ml-2">(当前使用)</span>}
              </label>
              <Input
                type="password"
                placeholder="输入你的 DeepSeek API Key"
                value={settings.deepseekApiKey}
                onChange={(e) => setSettings({ ...settings, deepseekApiKey: e.target.value })}
                className="bg-gray-50"
              />
            </div>

            <div>
              <label className="font-bold text-sm block mb-1">
                硅基流动 API Key
                {settings.selectedProvider === 'siliconflow' && <span className="text-toon-pink ml-2">(当前使用)</span>}
              </label>
              <Input
                type="password"
                placeholder="输入你的硅基流动 API Key"
                value={settings.siliconflowApiKey}
                onChange={(e) => setSettings({ ...settings, siliconflowApiKey: e.target.value })}
                className="bg-gray-50"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} icon={saved ? <Check size={20} /> : undefined}>
            {saved ? '已保存!' : '保存设置'}
          </Button>
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-toon-blue/20 border-2 border-toon-blue rounded-xl p-4">
        <p className="font-bold mb-2">💡 如何获取 API Key？</p>
        <ul className="text-sm space-y-1 text-gray-700">
          <li>• <strong>Gemini:</strong> 访问 <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="text-blue-600 underline">Google AI Studio</a></li>
          <li>• <strong>DeepSeek:</strong> 访问 <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noreferrer" className="text-blue-600 underline">DeepSeek Platform</a></li>
          <li>• <strong>硅基流动:</strong> 访问 <a href="https://cloud.siliconflow.cn/account/ak" target="_blank" rel="noreferrer" className="text-blue-600 underline">SiliconFlow 控制台</a></li>
        </ul>
      </div>
    </div>
  );
};

// Word Factory View Component - Main Tool View
const WORD_FACTORY_STORAGE_KEY = 'word_factory_session';

interface WordFactorySessionData {
  inputText: string;
  status: WordFactoryStatus;
  rawWords: string[];
  groups: WordFactoryGroup[];
  activeGroupId: number | null;
  addedToHomeMap: [number, string][];
}

const WordFactoryView: React.FC<{
  onOpenSettings: () => void;
  homeGroups: WordGroup[];
  onAddToHome: (groupData: WordGroup) => Promise<void>;
}> = ({ onOpenSettings, homeGroups, onAddToHome }) => {
  // Load initial state from localStorage
  const loadSavedSession = (): Partial<WordFactorySessionData> | null => {
    try {
      const saved = localStorage.getItem(WORD_FACTORY_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load Word Factory session:', e);
    }
    return null;
  };

  const savedSession = loadSavedSession();

  const [inputText, setInputText] = useState(savedSession?.inputText || '');
  const [status, setStatus] = useState<WordFactoryStatus>(savedSession?.status || WordFactoryStatus.IDLE);
  const [rawWords, setRawWords] = useState<string[]>(savedSession?.rawWords || []);
  const [groups, setGroups] = useState<WordFactoryGroup[]>(savedSession?.groups || []);
  const [activeGroupId, setActiveGroupId] = useState<number | null>(savedSession?.activeGroupId ?? null);
  const [error, setError] = useState<string>('');
  const [settings] = useState<AISettings>(() => aiService.loadAISettings());
  // Track which factory groups have been added to home (by factory group id -> home group id)
  const [addedToHomeMap, setAddedToHomeMap] = useState<Map<number, string>>(
    () => new Map(savedSession?.addedToHomeMap || [])
  );

  // Save session to localStorage when state changes
  useEffect(() => {
    if (status !== WordFactoryStatus.IDLE || groups.length > 0) {
      const sessionData: WordFactorySessionData = {
        inputText,
        status,
        rawWords,
        groups,
        activeGroupId,
        addedToHomeMap: Array.from(addedToHomeMap.entries()),
      };
      localStorage.setItem(WORD_FACTORY_STORAGE_KEY, JSON.stringify(sessionData));
    }
  }, [inputText, status, rawWords, groups, activeGroupId, addedToHomeMap]);

  const GROUP_SIZE = 10;

  // Process initial input
  const handleStartProcess = () => {
    if (!inputText.trim()) {
      alert('请输入单词列表!');
      return;
    }

    // Check API key
    const apiKey = aiService.getApiKey(settings);
    if (!apiKey) {
      alert(`请先在设置中配置 ${aiService.PROVIDER_DISPLAY_NAMES[settings.selectedProvider]} API Key`);
      onOpenSettings();
      return;
    }

    // Split by newlines or commas
    const words = inputText.split(/[\n,]+/).map(w => w.trim()).filter(w => w.length > 0);
    if (words.length === 0) {
      alert('没有检测到有效的单词!');
      return;
    }

    setRawWords(words);
    setError('');

    // Calculate number of groups
    const totalGroups = Math.ceil(words.length / GROUP_SIZE);
    const initialGroups: WordFactoryGroup[] = Array.from({ length: totalGroups }, (_, i) => ({
      id: i,
      title: `Group ${i + 1}`,
      words: [],
      isProcessing: false
    }));

    setGroups(initialGroups);
    setActiveGroupId(0);
    setStatus(WordFactoryStatus.PROCESSING);

    // Process first group
    processGroup(0, words, initialGroups);
  };

  // Process a specific group
  const processGroup = async (groupIndex: number, allWords: string[], currentGroups: WordFactoryGroup[]) => {
    const group = currentGroups[groupIndex];
    if (group.words.length > 0) return; // Already processed

    // Mark as processing
    setGroups(prev => prev.map(g =>
      g.id === groupIndex ? { ...g, isProcessing: true } : g
    ));

    // Slice words for this group
    const startIdx = groupIndex * GROUP_SIZE;
    const groupWords = allWords.slice(startIdx, startIdx + GROUP_SIZE);

    try {
      const result = await aiService.processGroupWords(groupWords, groupIndex, settings);

      setGroups(prev => prev.map(g => {
        if (g.id === groupIndex) {
          return {
            ...g,
            words: result.words,
            title: result.title,
            isProcessing: false
          };
        }
        return g;
      }));

      setStatus(WordFactoryStatus.COMPLETED);
    } catch (e: any) {
      console.error('Error processing group:', e);
      setError(e.message || '处理失败，请重试');
      setGroups(prev => prev.map(g =>
        g.id === groupIndex ? { ...g, isProcessing: false } : g
      ));
      setStatus(WordFactoryStatus.ERROR);
    }
  };

  // Handle group tab click
  const handleGroupClick = (groupId: number) => {
    setActiveGroupId(groupId);
    const group = groups.find(g => g.id === groupId);
    if (group && group.words.length === 0 && !group.isProcessing) {
      processGroup(groupId, rawWords, groups);
    }
  };

  // Download JSON
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

  // Copy JSON
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
      alert('JSON 已复制到剪贴板!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Reset - clears all state and localStorage
  const handleReset = () => {
    setStatus(WordFactoryStatus.IDLE);
    setInputText('');
    setRawWords([]);
    setGroups([]);
    setActiveGroupId(null);
    setError('');
    setAddedToHomeMap(new Map());
    // Clear persisted session
    localStorage.removeItem(WORD_FACTORY_STORAGE_KEY);
  };

  // Check if a factory group is still added to home (home group still exists)
  const isGroupAddedToHome = (factoryGroupId: number): boolean => {
    const homeGroupId = addedToHomeMap.get(factoryGroupId);
    if (!homeGroupId) return false;
    // Check if the home group still exists
    return homeGroups.some(g => g.id === homeGroupId);
  };

  // Add current group to home page
  const handleAddToHome = async () => {
    if (activeGroupId === null) return;
    const group = groups.find(g => g.id === activeGroupId);
    if (!group || group.words.length === 0) return;

    // Prompt for group name
    const defaultName = group.words[0]?.term || group.title;
    const inputName = prompt('请输入组名 (留空则使用第一个单词):', defaultName);

    // User cancelled
    if (inputName === null) return;

    const groupName = inputName.trim() || defaultName;

    // Generate unique ID for home group
    const homeGroupId = Math.random().toString(36).substr(2, 9);

    // Convert WordFactoryItem[] to Word[]
    const words: Word[] = group.words.map(w => ({
      id: Math.random().toString(36).substr(2, 9),
      term: w.term,
      meaningCn: w.meaningCn,
      meaningEn: w.meaningEn,
      meaningJp: w.meaningJp,
      meaningJpReading: w.meaningJpReading,
    }));

    // Create WordGroup with optional images
    const homeGroupData: WordGroup = {
      id: homeGroupId,
      title: groupName,
      createdAt: Date.now(),
      words,
      passed: false,
      // Add images if they were generated
      ...(group.images?.part1 && { imageUrl: group.images.part1 }),
      ...(group.images && (group.images.part1 || group.images.part2) && {
        imageUrls: [group.images.part1, group.images.part2].filter(Boolean) as string[]
      }),
    };

    try {
      await onAddToHome(homeGroupData);
      // Track that this factory group was added
      setAddedToHomeMap(prev => new Map(prev).set(activeGroupId, homeGroupId));
      alert(`"${groupName}" 已添加到首页!`);
    } catch (err) {
      console.error('Failed to add to home:', err);
      alert('添加失败，请重试');
    }
  };

  const activeGroup = groups.find(g => g.id === activeGroupId);

  // Input Mode
  if (status === WordFactoryStatus.IDLE) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-black flex items-center gap-3">
            <Factory size={28} />
            单词加工厂
          </h2>
          <button
            onClick={onOpenSettings}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="设置"
          >
            <Settings size={24} />
          </button>
        </div>

        <div className="bg-white border-4 border-black rounded-3xl p-6 shadow-comic">
          <p className="text-gray-600 mb-4 font-bold">
            输入单词列表，AI 将自动添加中/英/日三语翻译。
            <br />
            <span className="text-sm text-gray-400">当前服务商: {aiService.PROVIDER_DISPLAY_NAMES[settings.selectedProvider]}</span>
          </p>

          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="输入单词，用逗号或换行分隔...&#10;例如:&#10;apple&#10;banana&#10;computer"
            className="w-full h-64 p-4 border-2 border-black rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-toon-pink text-lg"
          />

          <div className="flex justify-end mt-4">
            <Button
              onClick={handleStartProcess}
              disabled={!inputText.trim()}
              icon={<PlayCircle size={20} />}
            >
              开始生产 🏭
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Processing/Result Mode
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black flex items-center gap-3">
          <Factory size={28} />
          单词加工厂
        </h2>
        <div className="flex gap-2">
          <button
            onClick={onOpenSettings}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="设置"
          >
            <Settings size={24} />
          </button>
          <Button variant="secondary" onClick={handleReset} icon={<RefreshCw size={20} />}>
            重新开始
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border-2 border-red-300 rounded-xl p-4 text-red-700 font-bold">
          ❌ {error}
        </div>
      )}

      {/* Group Tabs */}
      <div className="flex flex-wrap gap-2">
        {groups.map((group) => (
          <button
            key={group.id}
            onClick={() => handleGroupClick(group.id)}
            className={`
              px-4 py-2 rounded-lg font-bold border-2 border-black transition-all
              ${activeGroupId === group.id
                ? 'bg-toon-yellow shadow-comic'
                : 'bg-white hover:bg-gray-100'}
              ${group.isProcessing ? 'animate-pulse' : ''}
            `}
          >
            {group.title}
            {group.isProcessing && ' ⏳'}
          </button>
        ))}
      </div>

      {activeGroup && (
        <div className="space-y-6">
          {/* Action Bar */}
          <div className="flex flex-wrap gap-4 p-4 bg-white rounded-xl border-2 border-black items-center">
            <div className="inline-flex rounded-md shadow-sm" role="group">
              <button
                onClick={handleCopyJson}
                disabled={activeGroup.words.length === 0}
                className="px-4 py-2 text-sm font-bold bg-gray-100 border-2 border-black rounded-l-lg hover:bg-gray-200 disabled:opacity-50"
              >
                📋 复制
              </button>
              <button
                onClick={handleDownloadJson}
                disabled={activeGroup.words.length === 0}
                className="px-4 py-2 text-sm font-bold bg-gray-100 border-t-2 border-b-2 border-r-2 border-black rounded-r-lg hover:bg-gray-200 disabled:opacity-50"
              >
                💾 JSON
              </button>
            </div>

            {/* Add to Home Button */}
            <button
              onClick={handleAddToHome}
              disabled={activeGroup.words.length === 0 || isGroupAddedToHome(activeGroup.id)}
              className={`
                px-4 py-2 rounded-lg font-bold border-2 transition-all
                ${isGroupAddedToHome(activeGroup.id)
                  ? 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'border-black bg-toon-green hover:bg-green-400 shadow-comic active:translate-y-0.5 active:shadow-none'}
              `}
              title={isGroupAddedToHome(activeGroup.id) ? '已添加到首页' : '添加到首页'}
            >
              {isGroupAddedToHome(activeGroup.id) ? '✅ 已添加' : '📥 添加到首页'}
            </button>

            <div className="flex-1" />

            {/* Image generation placeholder */}
            <button
              disabled
              className="px-4 py-2 rounded-lg font-bold border-2 border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed"
              title="图片生成功能即将推出"
            >
              ✨ 生成图片 (即将推出)
            </button>
          </div>

          {/* Word List */}
          <div>
            <h3 className="text-xl font-black mb-4">{activeGroup.title}</h3>
            {activeGroup.isProcessing ? (
              <div className="p-12 text-center text-gray-500 font-bold bg-white/50 rounded-xl border-2 border-dashed border-gray-300">
                <RefreshCw size={32} className="animate-spin mx-auto mb-4" />
                正在用 AI 处理单词...
              </div>
            ) : activeGroup.words.length === 0 ? (
              <div className="p-12 text-center text-gray-500 font-bold bg-white/50 rounded-xl border-2 border-dashed border-gray-300">
                暂无数据
              </div>
            ) : (
              <div className="space-y-4">
                {activeGroup.words.map((word, idx) => (
                  <div
                    key={idx}
                    className="bg-white border-4 border-black rounded-3xl p-6 shadow-sm hover:-translate-y-0.5 transition-transform"
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-10 h-10 rounded-full bg-toon-blue border-2 border-black flex items-center justify-center font-bold text-lg">
                        {idx + 1}
                      </div>
                      <h4 className="text-2xl font-black">{word.term}</h4>
                      <button
                        onClick={() => speak(word.term, 'en-US')}
                        className="p-2 hover:bg-blue-100 rounded-full transition-colors text-blue-600"
                        title="播放英语发音"
                      >
                        <Volume2 size={20} />
                      </button>
                    </div>

                    <div className="space-y-2 pl-14">
                      <div className="flex items-center gap-3">
                        <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded text-xs font-bold border border-red-200">CN</span>
                        <span className="text-lg">{word.meaningCn}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded text-xs font-bold border border-blue-200">EN</span>
                        <span className="text-lg italic text-gray-600">{word.meaningEn}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="bg-purple-100 text-purple-600 px-2 py-0.5 rounded text-xs font-bold border border-purple-200">JP</span>
                        <div className="flex flex-col">
                          <span className="text-xs text-gray-500">{word.meaningJpReading}</span>
                          <span className="text-lg">{word.meaningJp}</span>
                        </div>
                        <button
                          onClick={() => speak(word.meaningJp, 'ja-JP')}
                          className="p-1.5 hover:bg-purple-100 rounded-full transition-colors text-purple-600"
                          title="播放日语发音"
                        >
                          <Volume2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;