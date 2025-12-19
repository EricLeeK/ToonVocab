import React, { useState, useEffect, useRef } from 'react';
import { WordGroup, Word, ViewState } from './types';
import * as wordService from './services/wordService';
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
  FileText
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
                    onArticlePicker={() => setView('ARTICLE_PICKER')}
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

                {view === 'ARTICLE_PICKER' && (
                  <ArticlePickerView />
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
  onArticlePicker: () => void;
}> = ({ groups, onCreate, onSelect, onDelete, onImport, onArticlePicker }) => (
  <div className="space-y-6">
    <div className="flex justify-between items-end flex-wrap gap-2">
      <p className="text-xl font-bold text-gray-500">My Daily Words</p>
      <div className="flex gap-2 flex-wrap">
        <Button variant="secondary" onClick={onArticlePicker} icon={<FileText size={20} />}>Article Picker</Button>
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
}> = ({ group, onEdit, onStartReview, onImageUpdate, onAddImage, onDeleteImage }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const visualFileInputRef = useRef<HTMLInputElement>(null);
  const [showImages, setShowImages] = useState(false);
  const [uploading, setUploading] = useState(false);

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

// Article Picker View Component
const ArticlePickerView: React.FC = () => {
  const [articleText, setArticleText] = useState('');
  const [mode, setMode] = useState<'input' | 'picking'>('input');
  const [tokens, setTokens] = useState<string[]>([]);
  const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set());

  // Tokenize text into words, punctuation, newlines, and whitespace
  const tokenize = (text: string): string[] => {
    // Split by newlines first, then by words and punctuation
    return text.split(/(\n|\s+|[.,!?;:'"()\[\]{}—–\-]+)/g).filter(Boolean);
  };

  // Check if a token is a newline
  const isNewline = (token: string): boolean => {
    return token === '\n';
  };

  // Check if a token is a word (contains letters)
  const isWord = (token: string): boolean => {
    return /[a-zA-Z]/.test(token);
  };

  // Normalize word for comparison (lowercase, trim)
  const normalizeWord = (word: string): string => {
    return word.toLowerCase().replace(/[^a-zA-Z]/g, '');
  };

  const handleStartPicking = () => {
    if (!articleText.trim()) {
      alert('Please paste an article first!');
      return;
    }
    const tokenized = tokenize(articleText);
    setTokens(tokenized);
    setSelectedWords(new Set());
    setMode('picking');
  };

  const handleWordClick = (word: string) => {
    const normalized = normalizeWord(word);
    if (!normalized) return;

    setSelectedWords(prev => {
      const newSet = new Set(prev);
      if (newSet.has(normalized)) {
        newSet.delete(normalized);
      } else {
        newSet.add(normalized);
      }
      return newSet;
    });
  };

  const handleExportJson = () => {
    const wordsArray = Array.from(selectedWords).sort();
    const exportData = {
      exportedAt: new Date().toISOString(),
      words: wordsArray
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
    setSelectedWords(new Set());
  };

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
            Click on words to select/deselect. Selected: <span className="text-toon-pink">{selectedWords.size}</span> words
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleReset} icon={<RefreshCw size={20} />}>
            Reset
          </Button>
          <Button
            onClick={handleExportJson}
            disabled={selectedWords.size === 0}
            icon={<Download size={20} />}
          >
            Export JSON
          </Button>
        </div>
      </div>

      <div className="bg-white border-4 border-black rounded-3xl p-6 shadow-comic">
        <div className="text-lg leading-relaxed">
          {tokens.map((token, index) => {
            // Handle newlines as <br> elements
            if (isNewline(token)) {
              return <br key={index} />;
            }

            if (!isWord(token)) {
              // Render whitespace and punctuation as-is, preserving spaces
              return <span key={index} style={{ whiteSpace: 'pre' }}>{token}</span>;
            }

            const normalized = normalizeWord(token);
            const isSelected = selectedWords.has(normalized);

            return (
              <span
                key={index}
                onClick={() => handleWordClick(token)}
                className={`
                  cursor-pointer rounded px-0.5 transition-all duration-150
                  ${isSelected
                    ? 'bg-toon-pink text-white font-bold border-2 border-black shadow-sm'
                    : 'hover:bg-toon-yellow/50'
                  }
                `}
              >
                {token}
              </span>
            );
          })}
        </div>
      </div>

      {/* Export button at the bottom */}
      <div className="flex justify-center">
        <Button
          onClick={handleExportJson}
          disabled={selectedWords.size === 0}
          className="text-xl px-8 py-4"
          icon={<Download size={24} />}
        >
          Export {selectedWords.size} Words as JSON
        </Button>
      </div>
    </div>
  );
};

export default App;