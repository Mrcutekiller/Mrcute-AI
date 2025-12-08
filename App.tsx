import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useLiveSession } from './hooks/useLiveSession';
import Visualizer from './components/Visualizer';
import { GoogleGenAI } from '@google/genai';
import { HistoryItem, HistoryType } from './types';

// --- Types for Web Speech API ---
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

// --- Icons (Inline SVGs) ---
const MicIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
);
const HomeIcon = ({ active }: { active: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
);
const HistoryIcon = ({ active }: { active: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);
const ChatIcon = ({ active }: { active: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4c0-1.1.9-2 2-2h8a2 2 0 0 1 2 2v5Z"/><path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1"/></svg>
);
const UploadIcon = ({ active }: { active: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
);
const SettingsIcon = ({ active }: { active: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.09a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.39a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
);
const AlertIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
);
const SendIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" x2="11" y1="2" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
);
const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
);
const FileIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500 mb-2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
);
const PdfIcon = ({ className = "text-red-500 mb-2" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><path d="M6 13h12"/><path d="M6 17h12"/><path d="M8 9h2"/></svg>
);
const AudioFileIcon = ({ className = "text-purple-500 mb-2" }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
);
const ChevronRight = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
);
const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
);
const SaveIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
);
const PaperclipIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
);
const CloseIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
);
const SunIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
);
const MoonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
);

const App: React.FC = () => {
  // --- Environment Check ---
  if (!process.env.API_KEY) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-slate-900 text-white p-4 font-sans">
        <div className="max-w-md text-center bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
             <AlertIcon />
          </div>
          <h1 className="text-2xl font-bold mb-3">Setup Required</h1>
          <p className="mb-6 text-slate-300">The <code>API_KEY</code> environment variable is missing.</p>
          <div className="text-sm text-left bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
            <p className="font-semibold text-slate-200 mb-2">How to fix on Vercel:</p>
            <ol className="list-decimal list-inside space-y-1 text-slate-400">
              <li>Go to your Vercel Project Dashboard.</li>
              <li>Click <strong>Settings</strong> {'>'} <strong>Environment Variables</strong>.</li>
              <li>Add Key: <code>API_KEY</code></li>
              <li>Add Value: Your Gemini API Key.</li>
              <li>Redeploy your project.</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState('home');
  const [targetLanguage, setTargetLanguage] = useState('English');

  const { 
    connect, 
    disconnect, 
    isConnected, 
    transcripts,
    setTranscripts,
    updateTranscript,
    volume,
    isMuted,
    error
  } = useLiveSession();
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showHistoryDetail, setShowHistoryDetail] = useState<HistoryItem | null>(null);

  // --- Settings State (Persisted) ---
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('mrcute_settings');
    return saved ? JSON.parse(saved) : { voice: 'Kore', textSize: 'text-sm', theme: 'dark' };
  });

  useEffect(() => {
    localStorage.setItem('mrcute_settings', JSON.stringify(settings));
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings]);

  // --- History State (Persisted) ---
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    const saved = localStorage.getItem('mrcute_history');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('mrcute_history', JSON.stringify(history));
  }, [history]);

  // --- Auto-save Transcripts ---
  useEffect(() => {
    // Load autosave on mount
    const saved = localStorage.getItem('mrcute_transcript_autosave');
    if (saved) {
       try {
         const parsed = JSON.parse(saved);
         // Restore Dates from strings
         const restored = parsed.map((p: any) => ({...p, timestamp: new Date(p.timestamp)}));
         setTranscripts(restored);
       } catch (e) { console.error("Failed to load transcript autosave", e); }
    }
  }, [setTranscripts]);

  useEffect(() => {
    // Save every 60 seconds
    const interval = setInterval(() => {
      if (transcripts.length > 0) {
        localStorage.setItem('mrcute_transcript_autosave', JSON.stringify(transcripts));
        console.log("Transcripts auto-saved");
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [transcripts]);

  // --- Main Chat State (Persisted) ---
  const [chatMessages, setChatMessages] = useState<{id: string, role: 'user' | 'model', text: string}[]>(() => {
    const saved = localStorage.getItem('mrcute_chat_current');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isDictating, setIsDictating] = useState(false);
  const [chatAttachment, setChatAttachment] = useState<{name: string, mimeType: string, data: string} | null>(null);
  const chatSessionRef = useRef<any>(null);

  // --- Context/Embedded Chat State (Temporary) ---
  const [contextMessages, setContextMessages] = useState<{id: string, role: 'user' | 'model', text: string}[]>([]);
  const [contextInput, setContextInput] = useState('');
  const [isContextLoading, setIsContextLoading] = useState(false);
  const contextSessionRef = useRef<any>(null);

  // --- Edit State ---
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // Upload State
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'analyzing' | 'done' | 'error'>('idle');
  const [uploadResult, setUploadResult] = useState<string | null>(null);
  const [uploadImagePreview, setUploadImagePreview] = useState<string | null>(null);
  const [uploadFileType, setUploadFileType] = useState<string | null>(null); // To track mime type

  // Save Current Chat Context
  useEffect(() => {
    localStorage.setItem('mrcute_chat_current', JSON.stringify(chatMessages));
  }, [chatMessages]);

  // Auto-scroll Live Transcript
  useEffect(() => {
    if (scrollRef.current && !editingId) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcripts, editingId]);

  // Auto-scroll Chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, isChatLoading, chatAttachment]);

  // --- Functions ---
  const handleConnect = useCallback(() => {
    connect(settings.voice, targetLanguage);
  }, [connect, settings.voice, targetLanguage]);

  // --- Voice Command Listener for "Start Recording" ---
  useEffect(() => {
    if (isConnected) return; // Only listen if NOT connected

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    
    // Simple command detection
    recognition.onresult = (event: any) => {
       const lastResult = event.results[event.results.length - 1];
       if (lastResult.isFinal) {
         const transcript = lastResult[0].transcript.toLowerCase();
         if (transcript.includes('start recording') || transcript.includes('start session')) {
            console.log("Voice command detected: Start Recording");
            handleConnect();
            recognition.stop();
         }
       }
    };

    // Auto-restart if it stops while still disconnected
    recognition.onend = () => {
      if (!isConnected && activeTab === 'home') {
        try { recognition.start(); } catch(e) {}
      }
    };
    
    try {
        recognition.start();
    } catch(e) { /* Already started */ }

    return () => {
        recognition.onend = null; // Remove restart handler
        recognition.stop();
    };
  }, [isConnected, activeTab, handleConnect]);

  const addToHistory = (type: HistoryType, title: string, content: any, preview: string, imageData?: string, mimeType?: string) => {
    const newItem: HistoryItem = {
      id: crypto.randomUUID(),
      type,
      title,
      date: new Date().toISOString(),
      content,
      preview,
      // @ts-ignore
      image: imageData,
      mimeType: mimeType
    };
    try {
        setHistory(prev => [newItem, ...prev]);
    } catch (e) {
        console.warn("Storage full, saving without image");
        const noImageItem = {...newItem, image: undefined};
        setHistory(prev => [noImageItem, ...prev]);
    }
  };

  const handleDisconnect = () => {
    if (transcripts.length > 0) {
      const preview = transcripts.map(t => t.text).join(' ').substring(0, 100) + '...';
      addToHistory('voice', `Voice Session (${targetLanguage}) ${new Date().toLocaleTimeString()}`, transcripts, preview);
      // Clear autosave after explicit disconnect/save
      localStorage.removeItem('mrcute_transcript_autosave');
    }
    disconnect();
  };

  const handleSaveChat = () => {
    if (chatMessages.length === 0) return;
    const preview = chatMessages[chatMessages.length - 1].text.substring(0, 80) + '...';
    addToHistory('chat', `AI Chat ${new Date().toLocaleTimeString()}`, chatMessages, preview);
    setChatMessages([]);
    localStorage.removeItem('mrcute_chat_current');
    alert("Chat saved to History!");
  };

  const handleSendMessage = async () => {
    if ((!chatInput.trim() && !chatAttachment)) return;
    
    const userMsgText = chatInput.trim();
    const currentAttachment = chatAttachment;
    
    setChatInput('');
    setChatAttachment(null);
    const newMessageId = crypto.randomUUID();
    
    setChatMessages(prev => [...prev, { 
      id: newMessageId, 
      role: 'user', 
      text: userMsgText + (currentAttachment ? ` [Attachment: ${currentAttachment.name}]` : '') 
    }]);
    
    setIsChatLoading(true);

    try {
      const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
      chatSessionRef.current = genAI.chats.create({
        model: "gemini-2.5-flash",
        config: {
          systemInstruction: "You are an intelligent and helpful AI teaching assistant. " +
            "Your goal is to answer questions, explain concepts, and analyze uploaded materials (like diagrams, slides, or quizzes). " +
            "If the user uploads a quiz or test, solve the questions and provide brief explanations. " +
            "If there are lecture notes provided in context, refer to them. " +
            "Be conversational, concise, and helpful."
        }
      });

      const context = transcripts.map(t => t.text).join('\n');
      const promptText = `[CURRENT LECTURE NOTES CONTEXT]:\n${context || "(No notes yet)"}\n\n[USER INPUT]: ${userMsgText}`;

      const parts: any[] = [];
      if (currentAttachment) {
        parts.push({ inlineData: { mimeType: currentAttachment.mimeType, data: currentAttachment.data } });
      }
      parts.push({ text: promptText });

      const result = await chatSessionRef.current.sendMessage({ message: parts });
      const responseText = result.text;

      setChatMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'model', text: responseText }]);
    } catch (err) {
      console.error("Chat Error", err);
      setChatMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'model', text: "Sorry, I encountered an error processing your request." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleContextSendMessage = async (contextText: string, contextImage?: string, mimeType?: string) => {
    if (!contextInput.trim()) return;

    const userText = contextInput;
    setContextInput('');
    setContextMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'user', text: userText }]);
    setIsContextLoading(true);

    try {
        const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        if (!contextSessionRef.current) {
            contextSessionRef.current = genAI.chats.create({
                model: "gemini-2.5-flash",
                config: {
                    systemInstruction: "You are a helpful assistant analyzing a specific document or history record for the user. Answer questions based on the provided content."
                }
            });

            const parts: any[] = [];
            if (contextImage) {
                // Handle different attachment types in context chat
                const mime = mimeType || 'image/jpeg';
                // Remove data prefix if exists
                const data = contextImage.includes('base64,') ? contextImage.split('base64,')[1] : contextImage;
                parts.push({ inlineData: { mimeType: mime, data: data } });
            }
            parts.push({ text: `[CONTEXT CONTENT]:\n${contextText}\n\nI am ready to answer questions about this.` });
            
            await contextSessionRef.current.sendMessage({ message: parts });
        }

        const result = await contextSessionRef.current.sendMessage({ message: userText });
        setContextMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'model', text: result.text }]);
    } catch (e) {
        console.error("Context Chat Error", e);
        setContextMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'model', text: "Error getting response." }]);
    } finally {
        setIsContextLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
       const base64 = (ev.target?.result as string).split(',')[1];
       setChatAttachment({
          name: file.name,
          mimeType: file.type,
          data: base64
       });
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startEdit = (id: string, currentText: string) => {
    setEditingId(id);
    setEditValue(currentText);
  };

  const saveEdit = (type: 'transcript' | 'chat') => {
    if (!editingId) return;

    if (type === 'transcript') {
      updateTranscript(editingId, editValue);
    } else {
      setChatMessages(prev => prev.map(m => m.id === editingId ? { ...m, text: editValue } : m));
    }
    setEditingId(null);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const startDictation = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsDictating(true);
    recognition.onend = () => setIsDictating(false);
    recognition.onerror = () => setIsDictating(false);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setChatInput(prev => prev + (prev ? ' ' : '') + transcript);
    };

    recognition.start();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadStatus('uploading');
    setContextMessages([]); 
    contextSessionRef.current = null;
    setUploadFileType(file.type);
    
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = e.target?.result as string;
        const cleanBase64 = base64Data.split(',')[1];
        
        // Preview handling
        if (file.type.startsWith('image/')) {
            setUploadImagePreview(base64Data);
        } else {
            // For non-images, we store base64 but render icon
            setUploadImagePreview(base64Data); 
        }
        
        setUploadStatus('analyzing');

        const genAI = new GoogleGenAI({ apiKey: process.env.API_KEY });
        let responseText = "";
        let parts: any[] = [];
        let prompt = "";

        // Determine prompts based on file type
        if (file.type.startsWith('image/')) {
            prompt = "Analyze this image. 1. QUIZ DETECTION: Check if this is a quiz/test. If yes, list answers. 2. SUMMARY: Provide a detailed summary.";
            parts = [{ inlineData: { mimeType: file.type, data: cleanBase64 } }, { text: prompt }];
        } else if (file.type === 'application/pdf') {
            prompt = "Analyze this PDF document. 1. QUIZ DETECTION: Check if this is a quiz/test. If yes, list answers. 2. SUMMARY: Summarize main topics and key points.";
            parts = [{ inlineData: { mimeType: file.type, data: cleanBase64 } }, { text: prompt }];
        } else if (file.type.startsWith('audio/')) {
            prompt = "Listen to this audio. 1. SUMMARY: Provide a comprehensive transcription and summary of the spoken content. 2. KEY POINTS: List the most important takeaways.";
            parts = [{ inlineData: { mimeType: file.type, data: cleanBase64 } }, { text: prompt }];
        } else {
            // Text Fallback
            const text = atob(cleanBase64);
            prompt = "Analyze this text. 1. QUIZ DETECTION: Check for questions. 2. SUMMARY: Summarize content.";
            parts = [{ text: prompt + "\n\n" + text.substring(0, 30000) }];
        }

        const response = await genAI.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts }
        });
        
        responseText = response.text || "No result generated.";
        setUploadResult(responseText);
        setUploadStatus('done');

        // Save to history
        addToHistory('upload', `Upload: ${file.name}`, responseText, responseText.substring(0, 100) + '...', base64Data, file.type);
      };

      reader.readAsDataURL(file);

    } catch (e) {
      console.error(e);
      setUploadStatus('error');
    }
  };

  const renderFormattedContent = (text: string, role: string, id: string, type: 'transcript' | 'chat') => {
    if (editingId === id) {
      return (
        <div className="w-full">
           <textarea 
             value={editValue}
             onChange={(e) => setEditValue(e.target.value)}
             className="w-full bg-white dark:bg-slate-900/50 text-slate-800 dark:text-slate-100 p-2 rounded-lg border border-slate-300 dark:border-blue-500/50 outline-none focus:ring-1 focus:ring-blue-500 text-sm mb-2 h-24 resize-none"
           />
           <div className="flex gap-2 justify-end">
             <button onClick={cancelEdit} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded text-slate-500 dark:text-slate-400"><CloseIcon /></button>
             <button onClick={() => saveEdit(type)} className="p-1 bg-blue-600 hover:bg-blue-500 rounded text-white"><SaveIcon /></button>
           </div>
        </div>
      );
    }

    const isAnswer = text.includes('[ANSWER]');
    const content = (
      <>
        {isAnswer && role === 'model' ? (
           text.split(/\[ANSWER\]/g).map((segment, index) => {
              if (index === 0) return <span key={`seg-${index}`}>{segment}</span>;
              if (!segment.trim()) return null;
              return (
                <div key={`seg-${index}`} className="mt-3 mb-2 animate-fade-in">
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-500 dark:from-blue-600 dark:to-indigo-600 rounded-xl p-4 shadow-lg border border-blue-400/30">
                    <div className="flex items-center gap-2 text-blue-50 dark:text-blue-100 text-xs font-bold uppercase tracking-wider mb-2">
                      <span className="w-2 h-2 rounded-full bg-white animate-pulse"/>
                      AI Answer
                    </div>
                    {/* Explicit bold styling for answers */}
                    <p className="text-white font-extrabold text-lg leading-relaxed drop-shadow-sm">
                      {segment.trim()}
                    </p>
                  </div>
                </div>
              );
           })
        ) : (
          <div className="whitespace-pre-wrap">{text}</div>
        )}
      </>
    );

    return (
       <div className="relative group/msg">
          {content}
          {type !== 'chat' && (
              <div className="absolute -top-2 -right-2 opacity-0 group-hover/msg:opacity-100 transition-opacity">
                 <button 
                   onClick={() => startEdit(id, text)}
                   className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 p-1.5 rounded-full shadow-lg border border-slate-300 dark:border-slate-600"
                   title="Edit"
                 >
                    <EditIcon />
                 </button>
              </div>
          )}
       </div>
    );
  };

  const EmbeddedChat = ({ contextText, contextImage, mimeType }: { contextText: string, contextImage?: string, mimeType?: string }) => {
     const scrollRef = useRef<HTMLDivElement>(null);
     
     useEffect(() => {
        if(scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
     }, [contextMessages]);

     return (
        <div className="flex flex-col h-[400px] border-t border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-900/30 mt-6 rounded-t-2xl">
            <div className="p-3 bg-white dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700/50 text-center">
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Ask AI about this content</span>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {contextMessages.length === 0 && (
                    <div className="text-center text-slate-500 dark:text-slate-600 text-xs mt-4">Ask a question to start...</div>
                )}
                {contextMessages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-xl p-3 text-sm ${
                          msg.role === 'user' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-transparent shadow-sm'
                        }`}>
                            {msg.text}
                        </div>
                    </div>
                ))}
                {isContextLoading && (
                   <div className="flex justify-start">
                      <div className="bg-white dark:bg-slate-800 rounded-xl p-3 flex gap-1 shadow-sm">
                         <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"/>
                         <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-75"/>
                         <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-150"/>
                      </div>
                   </div>
                )}
            </div>
            <div className="p-3 flex gap-2 border-t border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-800/30">
                <input 
                  className="flex-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full px-4 py-2 text-sm text-slate-800 dark:text-slate-200 outline-none focus:border-blue-500"
                  placeholder="Ask a follow-up question..."
                  value={contextInput}
                  onChange={(e) => setContextInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleContextSendMessage(contextText, contextImage, mimeType)}
                />
                <button 
                  onClick={() => handleContextSendMessage(contextText, contextImage, mimeType)}
                  disabled={isContextLoading || !contextInput.trim()}
                  className="p-2 bg-blue-600 rounded-full text-white disabled:opacity-50 hover:bg-blue-500 transition-colors"
                >
                    <SendIcon />
                </button>
            </div>
        </div>
     );
  };

  return (
    <div className="h-screen w-full flex flex-col bg-slate-50 dark:bg-[#0b1121] text-slate-900 dark:text-slate-100 font-sans selection:bg-blue-500/30 transition-colors duration-300">
      
      {/* --- Top Header --- */}
      <header className="px-6 pt-6 pb-2 flex justify-between items-center z-10 shrink-0">
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            <span className="text-slate-800 dark:text-white">MRCUTE</span> <span className="text-blue-600 dark:text-blue-500">AI</span>
          </h1>
          <p className="text-slate-500 text-sm font-medium mt-0.5">Hello, biruk</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 overflow-hidden ring-2 ring-slate-200 dark:ring-slate-800 ring-offset-2 ring-offset-slate-50 dark:ring-offset-[#0b1121]">
          <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=biruk" alt="User" className="w-full h-full" />
        </div>
      </header>

      {/* --- Main Content Area --- */}
      <main className="flex-1 flex flex-col relative px-4 pb-24 overflow-hidden">
        
        {error && (
            <div className="mb-4 mx-1 p-3 bg-red-100 dark:bg-red-500/10 border border-red-200 dark:border-red-500/50 rounded-lg flex items-center gap-3 text-red-600 dark:text-red-200 text-sm animate-fade-in shrink-0">
                <AlertIcon />
                <span>{error}</span>
            </div>
        )}

        {/* --- HOME TAB (Live) --- */}
        {activeTab === 'home' && (
          <>
            <div className="flex-1 bg-white/80 dark:bg-[#161e32]/80 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-700/50 shadow-xl dark:shadow-2xl overflow-hidden flex flex-col mt-4 mb-2 relative transition-colors duration-300">
              <div className="h-14 px-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-[#1e293b]/50 shrink-0">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-red-500 animate-pulse' : 'bg-slate-400 dark:bg-slate-500'}`}></div>
                    <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Live Transcript</span>
                  </div>
                  <div className="relative group">
                     <select 
                       value={targetLanguage} 
                       onChange={(e) => setTargetLanguage(e.target.value)}
                       disabled={isConnected}
                       className="appearance-none bg-white dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 px-3 py-1 rounded-md border border-slate-200 dark:border-slate-600 focus:outline-none focus:border-blue-500 disabled:opacity-50 shadow-sm"
                     >
                        <option value="English">English</option>
                        <option value="Spanish">Spanish</option>
                        <option value="French">French</option>
                        <option value="German">German</option>
                        <option value="Japanese">Japanese</option>
                        <option value="Chinese">Chinese</option>
                     </select>
                  </div>
                </div>
                <div className="w-32 h-8 flex items-center justify-end">
                   <Visualizer volume={volume} isActive={isConnected} />
                </div>
              </div>

              <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
                {(!isConnected && transcripts.length === 0) ? (
                   <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 opacity-60">
                      <p className="text-sm font-medium">Tap the microphone to start class</p>
                      {targetLanguage !== 'English' && <p className="text-xs mt-1 text-blue-500 dark:text-blue-400">Translation: {targetLanguage}</p>}
                      <p className="text-[10px] mt-4 text-slate-300 dark:text-slate-600">Tip: Say "Start Recording" or "Stop Recording"</p>
                   </div>
                ) : (
                  transcripts.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'model' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                      <div className={`max-w-[85%] rounded-2xl p-3.5 leading-relaxed ${settings.textSize} shadow-sm ${
                        msg.role === 'model' 
                          ? 'bg-slate-100 dark:bg-[#1e293b] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700' 
                          : 'bg-white dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-transparent'
                      }`}>
                         {renderFormattedContent(msg.text, msg.role, msg.id, 'transcript')}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="shrink-0 flex flex-col items-center justify-center py-2 relative z-20">
              <div className="flex flex-col items-center gap-3">
                 <div className="relative group">
                    {isConnected && (
                      <>
                        <div className="absolute inset-0 bg-blue-500 rounded-full animate-ripple opacity-30"></div>
                        <div className="absolute inset-0 bg-blue-400 rounded-full animate-ripple delay-150 opacity-20"></div>
                      </>
                    )}
                    <button
                      onClick={isConnected ? handleDisconnect : handleConnect}
                      className={`relative w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 transform active:scale-95 border-4 border-slate-50 dark:border-[#0b1121] ${
                        isConnected 
                        ? 'bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-red-500/30' 
                        : 'bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-blue-500/40'
                      }`}
                    >
                      {isConnected ? (
                        <div className="w-8 h-8 bg-white rounded-md" />
                      ) : (
                         <MicIcon className="w-8 h-8 text-white" />
                      )}
                    </button>
                 </div>
                 <p className="text-slate-500 dark:text-slate-400 text-xs font-medium tracking-wide">
                   {isConnected ? 'Recording in progress...' : 'Tap to start recording'}
                 </p>
              </div>
            </div>
          </>
        )}

        {/* --- AI CHAT TAB --- */}
        {activeTab === 'aichat' && (
          <div className="flex-1 flex flex-col h-full mt-4 bg-white/80 dark:bg-[#161e32]/80 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-700/50 shadow-xl dark:shadow-2xl overflow-hidden relative mb-2 transition-colors duration-300">
            
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/50 dark:bg-[#1e293b]/50 flex justify-between items-center shrink-0">
                <div>
                  <h2 className="text-lg font-semibold text-slate-800 dark:text-blue-100">AI Assistant</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Ask questions, upload diagrams, or chat</p>
                </div>
                {chatMessages.length > 0 && (
                  <div className="flex gap-2">
                    <button onClick={handleSaveChat} className="text-xs bg-blue-50 dark:bg-blue-600/20 text-blue-600 dark:text-blue-300 px-3 py-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-600/30 transition-colors border border-blue-200 dark:border-blue-500/20">
                      Save to History
                    </button>
                  </div>
                )}
            </div>

            <div ref={chatScrollRef} className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4 pb-20">
                {chatMessages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 opacity-60">
                      <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
                         <ChatIcon active={true} />
                      </div>
                      <p className="text-sm font-medium">Hello! How can I help you today?</p>
                      <p className="text-xs mt-1">Ask me to solve a quiz or explain notes!</p>
                  </div>
                )}
                
                {chatMessages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                     <div className={`max-w-[85%] rounded-2xl p-3.5 leading-relaxed shadow-sm ${settings.textSize} ${
                        msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-sm'
                        : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-sm border border-slate-200 dark:border-transparent'
                     }`}>
                        {renderFormattedContent(msg.text, msg.role, msg.id, 'chat')}
                     </div>
                  </div>
                ))}
                
                {isChatLoading && (
                   <div className="flex justify-start animate-fade-in">
                      <div className="bg-white dark:bg-slate-700 rounded-2xl rounded-bl-sm p-3.5 flex gap-1 items-center border border-slate-200 dark:border-transparent shadow-sm">
                         <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                         <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                         <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                      </div>
                   </div>
                )}
            </div>

            {/* Chat Input Area */}
            <div className="absolute bottom-0 left-0 right-0 p-4 bg-slate-50 dark:bg-[#161e32] border-t border-slate-200 dark:border-slate-800 shrink-0">
               
               {/* Attachment Preview */}
               {chatAttachment && (
                  <div className="mb-2 flex items-center gap-2 bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700 w-fit shadow-sm">
                     {chatAttachment.mimeType.startsWith('image/') ? (
                        <img src={`data:${chatAttachment.mimeType};base64,${chatAttachment.data}`} className="w-10 h-10 object-cover rounded" alt="preview" />
                     ) : (
                        <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 flex items-center justify-center rounded text-xs text-slate-500">PDF</div>
                     )}
                     <div className="flex flex-col">
                        <span className="text-xs text-slate-700 dark:text-slate-200 truncate max-w-[150px]">{chatAttachment.name}</span>
                        <span className="text-[10px] text-slate-400">Ready to send</span>
                     </div>
                     <button onClick={() => setChatAttachment(null)} className="p-1 hover:text-red-400 ml-2 text-slate-400"><CloseIcon /></button>
                  </div>
               )}

               <div className="flex items-center gap-2 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-full px-2 py-1 focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/50 transition-all shadow-sm">
                  
                  {/* Upload Button */}
                  <input 
                     type="file" 
                     ref={fileInputRef} 
                     onChange={handleFileSelect} 
                     accept="image/*,application/pdf" 
                     className="hidden" 
                  />
                  <button 
                     onClick={() => fileInputRef.current?.click()} 
                     className="p-2 text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-full transition-colors"
                  >
                     <PaperclipIcon />
                  </button>

                  {/* Mic Button */}
                  <button
                    onClick={startDictation}
                    className={`p-2 rounded-full transition-colors ${isDictating ? 'text-red-500 animate-pulse' : 'text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-700/50'}`}
                  >
                     <MicIcon className="w-5 h-5" />
                  </button>

                  <input 
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !isChatLoading && handleSendMessage()}
                    placeholder={isDictating ? "Listening..." : "Message AI..."}
                    className="flex-1 bg-transparent border-none outline-none text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 h-10"
                    disabled={isChatLoading}
                  />
                  <button 
                    onClick={handleSendMessage}
                    disabled={(!chatInput.trim() && !chatAttachment) || isChatLoading}
                    className="p-2 m-1 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-full transition-colors shadow-md"
                  >
                     <SendIcon />
                  </button>
               </div>
            </div>
          </div>
        )}

        {/* --- HISTORY TAB --- */}
        {activeTab === 'history' && (
           <div className="flex-1 mt-4 bg-white/80 dark:bg-[#161e32]/80 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-700/50 shadow-xl dark:shadow-2xl overflow-hidden flex flex-col mb-2 transition-colors duration-300">
              {!showHistoryDetail ? (
                <>
                  <div className="p-6 border-b border-slate-100 dark:border-slate-800/50 shrink-0">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">History</h2>
                    <div className="flex gap-2 mt-4">
                       {['All', 'Voice', 'Chat', 'Upload'].map(filter => (
                          <button key={filter} className="text-xs font-medium px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-colors">
                             {filter}
                          </button>
                       ))}
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
                     {history.length === 0 ? (
                        <div className="text-center text-slate-400 dark:text-slate-500 mt-20">
                           <HistoryIcon active={false} />
                           <p className="mt-2 text-sm">No history yet.</p>
                        </div>
                     ) : (
                        history.map(item => (
                           <div 
                             key={item.id} 
                             onClick={() => {
                                 setShowHistoryDetail(item);
                                 setContextMessages([]); // Reset context chat
                                 contextSessionRef.current = null;
                             }}
                             className="group bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-slate-200 dark:border-slate-700/50 rounded-xl p-4 transition-all cursor-pointer hover:border-blue-400/50 hover:shadow-md"
                           >
                              <div className="flex justify-between items-start mb-2">
                                 <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-lg ${
                                       item.type === 'voice' ? 'bg-red-100 dark:bg-red-500/10 text-red-500 dark:text-red-400' :
                                       item.type === 'chat' ? 'bg-blue-100 dark:bg-blue-500/10 text-blue-500 dark:text-blue-400' :
                                       'bg-purple-100 dark:bg-purple-500/10 text-purple-500 dark:text-purple-400'
                                    }`}>
                                       {item.type === 'voice' ? <MicIcon className="w-4 h-4"/> : 
                                        item.type === 'chat' ? <ChatIcon active={true} /> : 
                                        <UploadIcon active={true}/>}
                                    </div>
                                    <div>
                                       <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors">{item.title}</h3>
                                       <p className="text-[10px] text-slate-500">{new Date(item.date).toLocaleString()}</p>
                                    </div>
                                 </div>
                                 <ChevronRight />
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 pl-11">
                                 {item.preview}
                              </p>
                           </div>
                        ))
                     )}
                  </div>
                </>
              ) : (
                <div className="flex flex-col h-full">
                   {/* Detail Header */}
                   <div className="p-4 border-b border-slate-100 dark:border-slate-800/50 flex items-center gap-3 shrink-0">
                      <button onClick={() => setShowHistoryDetail(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                         <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                      </button>
                      <div className="flex-1">
                         <h2 className="text-sm font-bold text-slate-800 dark:text-white truncate max-w-[200px]">{showHistoryDetail.title}</h2>
                         <p className="text-[10px] text-slate-500">{new Date(showHistoryDetail.date).toLocaleString()}</p>
                      </div>
                      <button 
                        onClick={() => {
                           setHistory(prev => prev.filter(h => h.id !== showHistoryDetail.id));
                           setShowHistoryDetail(null);
                        }}
                        className="p-2 text-slate-500 hover:text-red-500 dark:hover:text-red-400"
                      >
                         <TrashIcon />
                      </button>
                   </div>
                   
                   {/* Detail Content */}
                   <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50 dark:bg-slate-900/20">
                      <div className="p-6">
                        {/* Show Image or Icon if available */}
                        {/* @ts-ignore */}
                        {showHistoryDetail.image && (
                            <div className="mb-6 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700/50 shadow-lg flex justify-center bg-white dark:bg-slate-900/50 p-4">
                                {/* @ts-ignore */}
                                {(showHistoryDetail.mimeType && showHistoryDetail.mimeType.startsWith('image/')) ? (
                                    /* @ts-ignore */
                                    <img src={showHistoryDetail.image.startsWith('data:') ? showHistoryDetail.image : `data:${showHistoryDetail.mimeType};base64,${showHistoryDetail.image}`} alt="History attachment" className="w-full object-contain max-h-[300px]" />
                                /* @ts-ignore */
                                ) : (showHistoryDetail.mimeType === 'application/pdf') ? (
                                    <div className="flex flex-col items-center p-8"><PdfIcon className="w-24 h-24 text-red-500 opacity-80"/><span className="mt-2 text-sm text-slate-400">PDF Document</span></div>
                                ) : (
                                    <div className="flex flex-col items-center p-8"><AudioFileIcon className="w-24 h-24 text-purple-500 opacity-80"/><span className="mt-2 text-sm text-slate-400">Audio Recording</span></div>
                                )}
                            </div>
                        )}
                        
                        <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-mono bg-white dark:bg-slate-800/20 p-4 rounded-lg border border-slate-200 dark:border-slate-700/30 shadow-sm">
                           {typeof showHistoryDetail.content === 'string' 
                              ? showHistoryDetail.content 
                              : Array.isArray(showHistoryDetail.content) 
                                 ? showHistoryDetail.content.map((c: any) => c.text).join('\n\n')
                                 : JSON.stringify(showHistoryDetail.content)}
                        </div>
                        
                        {/* Embedded Context Chat */}
                        <EmbeddedChat 
                            contextText={
                                typeof showHistoryDetail.content === 'string' 
                                    ? showHistoryDetail.content 
                                    : Array.isArray(showHistoryDetail.content) 
                                        ? showHistoryDetail.content.map((c: any) => c.text).join('\n')
                                        : JSON.stringify(showHistoryDetail.content)
                            } 
                            // @ts-ignore
                            contextImage={showHistoryDetail.image}
                            // @ts-ignore
                            mimeType={showHistoryDetail.mimeType}
                        />
                      </div>
                   </div>
                </div>
              )}
           </div>
        )}

        {/* --- UPLOAD TAB --- */}
        {activeTab === 'upload' && (
           <div className="flex-1 mt-4 bg-white/80 dark:bg-[#161e32]/80 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-700/50 shadow-xl dark:shadow-2xl overflow-hidden flex flex-col mb-2 transition-colors duration-300">
              
              {uploadStatus === 'idle' || uploadStatus === 'uploading' || uploadStatus === 'analyzing' || uploadStatus === 'error' ? (
                  <div className="flex-1 p-6 flex flex-col">
                      <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2 shrink-0">Upload & Analyze</h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 shrink-0">Upload lecture slides, PDFs, Audio notes, or quizzes.</p>
                      
                      <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl bg-slate-50 dark:bg-slate-800/20 hover:bg-slate-100 dark:hover:bg-slate-800/40 transition-colors relative group">
                        <input 
                          type="file" 
                          accept=".jpg,.jpeg,.png,.webp,application/pdf,audio/*,text/plain"
                          onChange={handleFileUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          disabled={uploadStatus === 'uploading' || uploadStatus === 'analyzing'}
                        />
                        
                        {uploadStatus === 'idle' && (
                            <>
                              <div className="p-4 bg-blue-100 dark:bg-blue-600/10 rounded-full mb-4 group-hover:scale-110 transition-transform duration-300">
                                  <FileIcon />
                              </div>
                              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Tap to upload file</p>
                              <p className="text-xs text-slate-500 mt-1">PDF, Audio, Images, Text</p>
                            </>
                        )}

                        {uploadStatus === 'uploading' && <p className="text-sm text-blue-500 dark:text-blue-400 animate-pulse">Uploading...</p>}
                        {uploadStatus === 'analyzing' && <p className="text-sm text-purple-500 dark:text-purple-400 animate-pulse">AI Checking for Quiz & Summarizing...</p>}
                        {uploadStatus === 'error' && <p className="text-sm text-red-500 dark:text-red-400">Upload Failed. Try again.</p>}
                      </div>
                  </div>
              ) : (
                  // Full Page Result View
                  <div className="flex flex-col h-full">
                      <div className="p-4 border-b border-slate-100 dark:border-slate-800/50 flex items-center justify-between bg-slate-50/50 dark:bg-[#1e293b]/50 shrink-0">
                          <h2 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
                             <span className="w-2 h-2 rounded-full bg-green-400"></span> Analysis Result
                          </h2>
                          <button 
                             onClick={() => {
                                 setUploadStatus('idle');
                                 setUploadResult(null);
                                 setUploadImagePreview(null);
                                 setUploadFileType(null);
                             }} 
                             className="text-xs bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white px-3 py-1.5 rounded-lg transition-colors"
                          >
                             Upload New
                          </button>
                      </div>

                      <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/50 dark:bg-slate-900/20">
                         <div className="p-6">
                            {/* Uploaded Content Preview */}
                            {uploadImagePreview && (
                                <div className="mb-6 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700/50 shadow-lg flex justify-center bg-white dark:bg-slate-900/50 p-4">
                                    {uploadFileType?.startsWith('image/') ? (
                                        <img src={uploadImagePreview} alt="Uploaded content" className="w-full object-contain max-h-[300px]" />
                                    ) : uploadFileType === 'application/pdf' ? (
                                        <div className="flex flex-col items-center p-8"><PdfIcon className="w-24 h-24 text-red-500 opacity-80"/><span className="mt-2 text-sm text-slate-400">PDF Document</span></div>
                                    ) : uploadFileType?.startsWith('audio/') ? (
                                        <div className="flex flex-col items-center p-8"><AudioFileIcon className="w-24 h-24 text-purple-500 opacity-80"/><span className="mt-2 text-sm text-slate-400">Audio Recording</span></div>
                                    ) : null}
                                </div>
                            )}

                            {/* Analysis Text */}
                            <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-mono bg-white dark:bg-slate-800/20 p-4 rounded-lg border border-slate-200 dark:border-slate-700/30 shadow-sm">
                                {uploadResult}
                            </div>
                         </div>
                      </div>
                  </div>
              )}
           </div>
        )}

        {/* --- SETTINGS TAB --- */}
        {activeTab === 'settings' && (
           <div className="flex-1 mt-4 bg-white/80 dark:bg-[#161e32]/80 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-slate-700/50 shadow-xl dark:shadow-2xl overflow-hidden p-6 mb-2 transition-colors duration-300">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6">Settings</h2>
              
              <div className="space-y-8">
                 {/* Theme Toggle */}
                 <div>
                    <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Appearance</h3>
                    <div className="flex gap-2 bg-slate-100 dark:bg-slate-900/50 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                       <button
                         onClick={() => setSettings({...settings, theme: 'light'})}
                         className={`flex-1 py-2 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-2 ${
                            settings.theme === 'light'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                         }`}
                       >
                          <SunIcon /> Light
                       </button>
                       <button
                         onClick={() => setSettings({...settings, theme: 'dark'})}
                         className={`flex-1 py-2 rounded-md text-xs font-medium transition-all flex items-center justify-center gap-2 ${
                            settings.theme === 'dark'
                            ? 'bg-slate-700 text-white shadow-sm'
                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                         }`}
                       >
                          <MoonIcon /> Dark
                       </button>
                    </div>
                 </div>

                 {/* Voice Section */}
                 <div>
                    <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">AI Voice</h3>
                    <div className="grid grid-cols-2 gap-3">
                       {['Kore', 'Puck', 'Fenrir', 'Charon', 'Aoede'].map(voice => (
                          <button
                            key={voice}
                            onClick={() => setSettings({...settings, voice})}
                            className={`p-3 rounded-xl border text-sm font-medium transition-all ${
                               settings.voice === voice 
                               ? 'bg-blue-50 dark:bg-blue-600/20 border-blue-500 text-blue-600 dark:text-blue-300 shadow-md dark:shadow-blue-500/10' 
                               : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                          >
                             {voice}
                          </button>
                       ))}
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">Selected voice will be used in the next live session.</p>
                 </div>

                 {/* Display Section */}
                 <div>
                    <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Text Size</h3>
                    <div className="flex gap-2 bg-slate-100 dark:bg-slate-900/50 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                       {[
                         { label: 'Small', val: 'text-xs' }, 
                         { label: 'Normal', val: 'text-sm' }, 
                         { label: 'Large', val: 'text-base' }
                        ].map((opt) => (
                         <button
                           key={opt.val}
                           onClick={() => setSettings({...settings, textSize: opt.val})}
                           className={`flex-1 py-2 rounded-md text-xs font-medium transition-all ${
                              settings.textSize === opt.val
                              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                           }`}
                         >
                            {opt.label}
                         </button>
                       ))}
                    </div>
                 </div>
                 
                 {/* Data Section */}
                 <div>
                    <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Data & Privacy</h3>
                    <button 
                      onClick={() => {
                        if(confirm("This will clear all settings and chat history. Continue?")) {
                          localStorage.clear();
                          window.location.reload();
                        }
                      }}
                      className="w-full py-3 border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-300 rounded-xl text-sm font-medium hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"
                    >
                       <TrashIcon /> Reset App Data
                    </button>
                 </div>
              </div>
           </div>
        )}

      </main>

      {/* --- Bottom Navigation Bar --- */}
      <nav className="h-20 bg-white/90 dark:bg-[#0f172a]/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800/50 flex items-center justify-between px-6 pb-2 z-30 fixed bottom-0 left-0 right-0 transition-colors duration-300">
        
        <NavButton 
          active={activeTab === 'home'} 
          onClick={() => setActiveTab('home')} 
          icon={<HomeIcon active={activeTab === 'home'} />} 
          label="Home" 
        />
        <NavButton 
          active={activeTab === 'history'} 
          onClick={() => setActiveTab('history')} 
          icon={<HistoryIcon active={activeTab === 'history'} />} 
          label="History" 
        />
        
        {/* Main AI Chat Button (Center) */}
        <button 
          onClick={() => setActiveTab('aichat')}
          className={`flex flex-col items-center justify-center -mt-6 transition-transform duration-200 active:scale-95 group`}
        >
           <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${
              activeTab === 'aichat' 
              ? 'bg-blue-600 text-white shadow-blue-500/40 ring-4 ring-blue-50 dark:ring-[#0f172a]' 
              : 'bg-white dark:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-blue-500 dark:hover:text-blue-400 border border-slate-200 dark:border-slate-700'
           }`}>
               <ChatIcon active={true} />
           </div>
           <span className={`text-[10px] font-medium tracking-wide mt-1 transition-colors ${activeTab === 'aichat' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`}>AI Chat</span>
        </button>

        <NavButton 
          active={activeTab === 'upload'} 
          onClick={() => setActiveTab('upload')} 
          icon={<UploadIcon active={activeTab === 'upload'} />} 
          label="Upload" 
        />
        <NavButton 
          active={activeTab === 'settings'} 
          onClick={() => setActiveTab('settings')} 
          icon={<SettingsIcon active={activeTab === 'settings'} />} 
          label="Settings" 
        />
      </nav>
      
    </div>
  );
};

const NavButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
  <button 
    onClick={onClick}
    className={`flex flex-col items-center justify-center w-12 h-full transition-colors duration-200 ${
      active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
    }`}
  >
    <div className={`mb-1 transition-transform duration-200 ${active ? '-translate-y-1' : ''}`}>{icon}</div>
    <span className={`text-[10px] font-medium tracking-wide transition-opacity ${active ? 'opacity-100' : 'opacity-70'}`}>{label}</span>
  </button>
);

export default App;