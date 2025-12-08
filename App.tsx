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
  // --- API KEY Handling ---
  // Using the fallback key provided by user since environment variables are not propagating correctly
  const apiKey = process.env.API_KEY || "AIzaSyDklwpDl9ItDNugR44gkAGI29rVplbhJ_M";

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
    if (apiKey) connect(apiKey, settings.voice, targetLanguage);
  }, [connect, apiKey, settings.voice, targetLanguage]);

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
    if ((!chatInput.trim() && !chatAttachment) || !apiKey) return;
    
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
      const genAI = new GoogleGenAI({ apiKey: apiKey });
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
    if (!contextInput.trim() || !apiKey) return;

    const userText = contextInput;
    setContextInput('');
    setContextMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'user', text: userText }]);
    setIsContextLoading(true);

    try {
        const genAI = new GoogleGenAI({ apiKey: apiKey });
        
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
    if (!file || !apiKey) return;

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

        const genAI = new GoogleGenAI({ apiKey: apiKey });
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
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3">
               {contextMessages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                     <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                        msg.role === 'user' 
                        ? 'bg-blue-600 text-white rounded-br-sm' 
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-bl-sm border border-slate-200 dark:border-slate-700'
                     }`}>
                        {msg.text}
                     </div>
                  </div>
               ))}
               {isContextLoading && (
                 <div className="flex justify-start">
                    <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl rounded-bl-sm border border-slate-200 dark:border-slate-700">
                       <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                          <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                          <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                       </div>
                    </div>
                 </div>
               )}
            </div>
            <div className="p-3 bg-white dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700/50 flex gap-2">
                <input 
                  type="text"
                  value={contextInput}
                  onChange={(e) => setContextInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleContextSendMessage(contextText, contextImage, mimeType)}
                  placeholder="Ask a follow-up question..."
                  className="flex-1 bg-slate-100 dark:bg-slate-700/50 text-slate-800 dark:text-slate-100 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button 
                  onClick={() => handleContextSendMessage(contextText, contextImage, mimeType)}
                  className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl disabled:opacity-50"
                  disabled={!contextInput.trim() || isContextLoading}
                >
                  <SendIcon />
                </button>
            </div>
        </div>
     );
  };

  // --- Main Render ---
  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-[#0b1121] text-slate-900 dark:text-slate-100 transition-colors duration-300">
      
      {/* Top Bar */}
      <header className="px-6 py-5 flex justify-between items-center bg-white/80 dark:bg-[#0b1121]/80 backdrop-blur-md sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-blue-600 dark:text-blue-500">
            MRCUTE <span className="text-slate-800 dark:text-white">AI</span>
          </h1>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">Smart Assistant & Notes</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-400 p-[2px]">
           <div className="w-full h-full rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
             {/* Avatar placeholder */}
             <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" />
           </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative">
        
        {/* HOME TAB */}
        {activeTab === 'home' && (
          <div className="h-full flex flex-col p-4">
            {/* Transcript Card */}
            <div className="flex-1 bg-white dark:bg-[#161e32] rounded-3xl p-5 shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col relative overflow-hidden transition-colors duration-300">
              <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-3">
                   <div className={`p-2 rounded-xl ${isConnected ? 'bg-red-500/10 text-red-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                     <MicIcon className={`w-5 h-5 ${isConnected ? 'animate-pulse' : ''}`} />
                   </div>
                   <div>
                     <h2 className="font-bold text-slate-800 dark:text-white">Live Transcript</h2>
                     <p className="text-xs text-slate-500 dark:text-slate-400">
                       {isConnected ? 'Listening & Analyzing...' : 'Ready to record'}
                     </p>
                   </div>
                </div>
                <div className="flex items-center gap-3">
                   {/* Language Selector */}
                   <select 
                     value={targetLanguage}
                     onChange={(e) => setTargetLanguage(e.target.value)}
                     className="bg-slate-100 dark:bg-slate-800 text-xs font-medium px-3 py-1.5 rounded-lg outline-none border-none text-slate-700 dark:text-slate-300"
                     disabled={isConnected}
                   >
                     <option>English</option>
                     <option>Spanish</option>
                     <option>French</option>
                     <option>German</option>
                     <option>Chinese</option>
                     <option>Japanese</option>
                   </select>

                   {isConnected && <Visualizer volume={volume} isActive={isConnected} />}
                </div>
              </div>
              
              <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                {transcripts.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 opacity-50">
                    <MicIcon className="w-16 h-16 mb-4" />
                    <p>Tap the microphone to start</p>
                  </div>
                ) : (
                  transcripts.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                       <div className={`max-w-[85%] p-4 rounded-2xl ${
                         msg.role === 'user' 
                           ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-br-sm' 
                           : 'bg-blue-50 dark:bg-blue-900/20 text-slate-800 dark:text-slate-100 rounded-bl-sm border border-blue-100 dark:border-blue-800/30'
                       } shadow-sm`}>
                          {renderFormattedContent(msg.text, msg.role, msg.id, 'transcript')}
                       </div>
                    </div>
                  ))
                )}
              </div>

              {/* Error Banner */}
              {error && (
                <div className="absolute bottom-4 left-4 right-4 bg-red-500/90 text-white p-3 rounded-xl flex items-center gap-3 text-sm backdrop-blur-sm animate-fade-in">
                  <AlertIcon />
                  {error}
                </div>
              )}
            </div>

            {/* Mic Control */}
            <div className="h-32 flex items-center justify-center relative">
               {isConnected && (
                 <div className="absolute w-24 h-24 bg-blue-500/20 rounded-full animate-ripple"></div>
               )}
               <button 
                 onClick={isConnected ? handleDisconnect : handleConnect}
                 className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 transform hover:scale-105 ${
                   isConnected 
                   ? 'bg-red-500 hover:bg-red-600 text-white rotate-0' 
                   : 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white hover:shadow-blue-500/50'
                 }`}
               >
                 {isConnected ? (
                   <div className="w-8 h-8 bg-white rounded-md"></div>
                 ) : (
                   <MicIcon className="w-10 h-10" />
                 )}
               </button>
               <p className="absolute bottom-4 text-xs font-medium text-slate-400 dark:text-slate-500">
                 {isConnected ? 'Tap to stop' : 'Tap to start recording'}
               </p>
            </div>
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && (
           <div className="h-full flex flex-col p-4 bg-slate-50 dark:bg-[#0b1121]">
              {!showHistoryDetail ? (
                <>
                  <h2 className="text-2xl font-bold mb-6 px-2 text-slate-900 dark:text-white">History</h2>
                  <div className="flex-1 overflow-y-auto space-y-3 pb-20 custom-scrollbar px-2">
                    {history.length === 0 ? (
                       <div className="text-center text-slate-400 mt-20">No history yet.</div>
                    ) : (
                      history.map((item) => (
                        <div 
                          key={item.id} 
                          onClick={() => setShowHistoryDetail(item)}
                          className="bg-white dark:bg-[#161e32] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                        >
                          <div className="flex justify-between items-start mb-2">
                             <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${
                                  item.type === 'voice' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' : 
                                  item.type === 'chat' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                                  'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                                }`}>
                                   {item.type === 'voice' ? <MicIcon className="w-5 h-5"/> : item.type === 'chat' ? <ChatIcon active={true}/> : <UploadIcon active={true}/>}
                                </div>
                                <div>
                                  <h3 className="font-semibold text-slate-800 dark:text-slate-100 line-clamp-1">{item.title}</h3>
                                  <p className="text-xs text-slate-500">{new Date(item.date).toLocaleString()}</p>
                                </div>
                             </div>
                             <ChevronRight />
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2 pl-14">
                            {item.preview}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col">
                  <div className="flex items-center gap-2 mb-4">
                     <button onClick={() => setShowHistoryDetail(null)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full">
                       <ChevronRight /> {/* Rotated by css ideally, but simpler to just use generic back icon or text */}
                       <span className="sr-only">Back</span>
                     </button>
                     <h2 className="font-bold text-lg text-slate-900 dark:text-white">Detail View</h2>
                  </div>
                  <div className="flex-1 bg-white dark:bg-[#161e32] rounded-3xl p-5 shadow-inner overflow-y-auto custom-scrollbar">
                     {showHistoryDetail.image && (
                        <div className="mb-6 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
                          {showHistoryDetail.mimeType?.startsWith('image/') ? (
                             <img src={showHistoryDetail.image} alt="Upload" className="w-full h-auto object-cover" />
                          ) : (
                             <div className="p-8 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900">
                               {showHistoryDetail.mimeType === 'application/pdf' ? <PdfIcon /> : <AudioFileIcon />}
                               <span className="text-sm text-slate-500 mt-2">File Attachment</span>
                             </div>
                          )}
                        </div>
                     )}

                     <div className={`prose dark:prose-invert max-w-none ${settings.textSize}`}>
                       {Array.isArray(showHistoryDetail.content) ? (
                         showHistoryDetail.content.map((msg: any) => (
                           <div key={msg.id} className="mb-4">
                             <span className={`text-xs font-bold uppercase ${msg.role === 'user' ? 'text-blue-500' : 'text-purple-500'}`}>
                               {msg.role}
                             </span>
                             <div className="mt-1">{msg.text}</div>
                           </div>
                         ))
                       ) : (
                         <div className="whitespace-pre-wrap">{showHistoryDetail.content}</div>
                       )}
                     </div>

                     {/* Embedded Chat for History */}
                     <EmbeddedChat 
                        contextText={
                           Array.isArray(showHistoryDetail.content) 
                           ? showHistoryDetail.content.map((m:any) => m.text).join('\n') 
                           : showHistoryDetail.content
                        }
                        contextImage={showHistoryDetail.image}
                        mimeType={showHistoryDetail.mimeType}
                     />
                  </div>
                </div>
              )}
           </div>
        )}

        {/* AI CHAT TAB */}
        {activeTab === 'aichat' && (
          <div className="h-full flex flex-col p-4 bg-slate-50 dark:bg-[#0b1121]">
             <div className="flex justify-between items-center mb-4 px-2">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                   AI Chat <span className="text-xs font-normal px-2 py-1 bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300 rounded-full">Gemini 2.5</span>
                </h2>
                <div className="flex gap-2">
                   <button onClick={handleSaveChat} className="p-2 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400" title="Save Chat">
                      <SaveIcon />
                   </button>
                   <button onClick={() => setChatMessages([])} className="p-2 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400" title="Clear Chat">
                      <TrashIcon />
                   </button>
                </div>
             </div>

             <div ref={chatScrollRef} className="flex-1 bg-white dark:bg-[#161e32] rounded-3xl p-4 shadow-sm border border-slate-200 dark:border-slate-800 overflow-y-auto space-y-4 custom-scrollbar mb-4 relative">
                {chatMessages.length === 0 ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 opacity-60 pointer-events-none">
                     <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
                        <ChatIcon active={true}/>
                     </div>
                     <p>Ask anything about your notes!</p>
                  </div>
                ) : (
                  chatMessages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                       <div className={`max-w-[85%] p-3 rounded-2xl ${settings.textSize} ${
                         msg.role === 'user' 
                           ? 'bg-blue-600 text-white rounded-br-sm shadow-md shadow-blue-500/20' 
                           : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-sm border border-slate-200 dark:border-slate-600 shadow-sm'
                       }`}>
                          {renderFormattedContent(msg.text, msg.role, msg.id, 'chat')}
                       </div>
                    </div>
                  ))
                )}
                {isChatLoading && (
                  <div className="flex justify-start animate-fade-in">
                     <div className="bg-white dark:bg-slate-700 p-4 rounded-2xl rounded-bl-sm border border-slate-200 dark:border-slate-600 shadow-sm">
                        <div className="flex space-x-1.5">
                           <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                           <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                           <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                        </div>
                     </div>
                  </div>
                )}
             </div>

             {/* Chat Input Bar */}
             <div className="flex gap-2 items-end bg-white dark:bg-[#161e32] p-2 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800">
                <input 
                  type="file" 
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*,application/pdf"
                  onChange={handleFileSelect}
                />
                
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-3 rounded-xl transition-colors ${
                     chatAttachment ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500'
                  }`}
                  title="Attach Image/PDF"
                >
                  <PaperclipIcon />
                </button>

                <div className="flex-1 flex flex-col gap-2">
                   {chatAttachment && (
                      <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-2 rounded-lg text-xs">
                         <span className="font-semibold text-blue-600 dark:text-blue-400 truncate max-w-[150px]">{chatAttachment.name}</span>
                         <button onClick={() => setChatAttachment(null)} className="text-slate-500 hover:text-red-500"><CloseIcon /></button>
                      </div>
                   )}
                   <textarea
                     value={chatInput}
                     onChange={(e) => setChatInput(e.target.value)}
                     onKeyDown={(e) => {
                       if (e.key === 'Enter' && !e.shiftKey) {
                         e.preventDefault();
                         handleSendMessage();
                       }
                     }}
                     placeholder={isDictating ? "Listening..." : "Type or speak..."}
                     className={`w-full bg-transparent outline-none text-slate-800 dark:text-white max-h-32 resize-none py-2 px-2 text-sm ${isDictating ? 'placeholder-red-400 animate-pulse' : ''}`}
                     rows={1}
                   />
                </div>

                <button 
                   onClick={startDictation}
                   className={`p-3 rounded-xl transition-colors ${
                     isDictating ? 'bg-red-500 text-white animate-pulse' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500'
                   }`}
                >
                   <MicIcon className="w-5 h-5"/>
                </button>

                <button 
                  onClick={handleSendMessage}
                  disabled={(!chatInput.trim() && !chatAttachment) || isChatLoading}
                  className="p-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white rounded-xl shadow-md transition-all active:scale-95"
                >
                  <SendIcon />
                </button>
             </div>
          </div>
        )}

        {/* UPLOAD TAB */}
        {activeTab === 'upload' && (
          <div className="h-full flex flex-col p-6 bg-slate-50 dark:bg-[#0b1121]">
            {!uploadResult ? (
              <div className="h-full flex flex-col justify-center">
                 <h2 className="text-3xl font-bold mb-2 text-center text-slate-900 dark:text-white">Analyze Content</h2>
                 <p className="text-center text-slate-500 dark:text-slate-400 mb-8">Upload quizzes, notes, PDFs, or audio for instant AI analysis and answers.</p>
                 
                 <label className={`
                    flex-1 max-h-[400px] border-3 border-dashed rounded-3xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group
                    ${uploadStatus === 'uploading' || uploadStatus === 'analyzing' 
                      ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/10' 
                      : 'border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 hover:bg-white dark:hover:bg-slate-800'
                    }
                 `}>
                    <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*,application/pdf,audio/*,text/plain" />
                    
                    {uploadStatus === 'idle' && (
                       <>
                         <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <UploadIcon active={true}/>
                         </div>
                         <span className="text-lg font-semibold text-slate-700 dark:text-slate-200">Click to Upload</span>
                         <span className="text-sm text-slate-400 mt-2">PDF, Audio, Images, Text</span>
                         <div className="mt-6 px-4 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs font-bold uppercase tracking-wide">
                            Great for Quizzes & Notes
                         </div>
                       </>
                    )}

                    {(uploadStatus === 'uploading' || uploadStatus === 'analyzing') && (
                       <div className="text-center">
                          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4 mx-auto"></div>
                          <p className="text-blue-600 dark:text-blue-400 font-medium animate-pulse">
                             {uploadStatus === 'uploading' ? 'Uploading...' : 'Gemini is thinking...'}
                          </p>
                       </div>
                    )}
                 </label>
              </div>
            ) : (
              <div className="h-full flex flex-col">
                 <div className="flex justify-between items-center mb-4">
                    <button 
                      onClick={() => { setUploadResult(null); setUploadImagePreview(null); setUploadStatus('idle'); }}
                      className="text-sm text-slate-500 hover:text-blue-600 flex items-center gap-1"
                    >
                       ← Upload Another
                    </button>
                    <button onClick={() => {
                        addToHistory('upload', 'Saved Upload', uploadResult, uploadResult.substring(0, 50));
                        alert('Saved to History');
                    }} className="text-sm bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 px-3 py-1 rounded-full">
                       Save Result
                    </button>
                 </div>

                 <div className="flex-1 bg-white dark:bg-[#161e32] rounded-3xl overflow-hidden shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col">
                    {/* Image/File Preview Header */}
                    <div className="h-48 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-center relative overflow-hidden">
                       {uploadImagePreview && (
                          uploadFileType?.startsWith('image/') ? (
                             <img src={uploadImagePreview} alt="Uploaded" className="w-full h-full object-contain" />
                          ) : (
                             <div className="text-center">
                                {uploadFileType === 'application/pdf' ? <PdfIcon /> : <AudioFileIcon />}
                                <p className="text-slate-500 text-xs mt-2 font-mono">
                                   {uploadFileType === 'application/pdf' ? 'DOCUMENT' : 'AUDIO FILE'}
                                </p>
                             </div>
                          )
                       )}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                       <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-white border-l-4 border-blue-500 pl-3">Analysis Result</h3>
                       <div className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-300">
                          <div className="whitespace-pre-wrap">{uploadResult}</div>
                       </div>
                    </div>

                    {/* Context Chat removed for Upload view per request, kept in History Detail */}
                 </div>
              </div>
            )}
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div className="h-full p-6 bg-slate-50 dark:bg-[#0b1121]">
             <h2 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">Settings</h2>
             
             <div className="space-y-4">
                <div className="bg-white dark:bg-[#161e32] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                   <h3 className="font-semibold mb-3 text-slate-800 dark:text-slate-200">Appearance</h3>
                   <div className="flex items-center justify-between p-2">
                      <span className="text-sm text-slate-600 dark:text-slate-400">Theme</span>
                      <button 
                        onClick={() => setSettings(s => ({...s, theme: s.theme === 'dark' ? 'light' : 'dark'}))}
                        className={`px-4 py-2 rounded-xl flex items-center gap-2 transition-colors ${
                          settings.theme === 'dark' 
                          ? 'bg-slate-700 text-white' 
                          : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                         {settings.theme === 'dark' ? <MoonIcon /> : <SunIcon />}
                         {settings.theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                      </button>
                   </div>
                </div>

                <div className="bg-white dark:bg-[#161e32] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                   <h3 className="font-semibold mb-3 text-slate-800 dark:text-slate-200">AI Voice</h3>
                   <div className="grid grid-cols-2 gap-2">
                      {['Kore', 'Fenrir', 'Puck', 'Charon'].map(voice => (
                        <button
                          key={voice}
                          onClick={() => setSettings(s => ({...s, voice}))}
                          className={`p-3 rounded-xl border text-sm transition-all ${
                            settings.voice === voice 
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold' 
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                           {voice}
                        </button>
                      ))}
                   </div>
                </div>

                <div className="bg-white dark:bg-[#161e32] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                   <h3 className="font-semibold mb-3 text-slate-800 dark:text-slate-200">Text Size</h3>
                   <div className="flex gap-2">
                      {[
                        { label: 'Small', val: 'text-xs' },
                        { label: 'Normal', val: 'text-sm' },
                        { label: 'Large', val: 'text-base' },
                      ].map(opt => (
                        <button
                          key={opt.val}
                          onClick={() => setSettings(s => ({...s, textSize: opt.val}))}
                          className={`flex-1 p-2 rounded-xl text-sm transition-all ${
                            settings.textSize === opt.val
                            ? 'bg-slate-800 dark:bg-white text-white dark:text-slate-900 shadow-lg' 
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                           {opt.label}
                        </button>
                      ))}
                   </div>
                </div>
             </div>
          </div>
        )}

      </main>

      {/* Bottom Navigation */}
      <nav className="h-20 bg-white dark:bg-[#161e32] border-t border-slate-200 dark:border-slate-800 flex justify-around items-center px-2 pb-2 z-20">
        <button 
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-300 w-16 ${activeTab === 'home' ? 'text-blue-600 dark:text-blue-400 -translate-y-2 bg-blue-50 dark:bg-blue-900/20' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
        >
          <HomeIcon active={activeTab === 'home'} />
          <span className="text-[10px] font-medium">Home</span>
        </button>
        
        <button 
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-300 w-16 ${activeTab === 'history' ? 'text-blue-600 dark:text-blue-400 -translate-y-2 bg-blue-50 dark:bg-blue-900/20' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
        >
          <HistoryIcon active={activeTab === 'history'} />
          <span className="text-[10px] font-medium">History</span>
        </button>

        {/* Central AI Chat Button */}
        <button 
           onClick={() => setActiveTab('aichat')}
           className={`relative -top-6 w-14 h-14 rounded-full flex items-center justify-center shadow-xl shadow-blue-500/30 transition-transform hover:scale-110
             ${activeTab === 'aichat' 
               ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white ring-4 ring-white dark:ring-[#0b1121]' 
               : 'bg-slate-800 dark:bg-slate-700 text-slate-200'
             }
           `}
        >
           <ChatIcon active={true} />
        </button>

        <button 
          onClick={() => setActiveTab('upload')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-300 w-16 ${activeTab === 'upload' ? 'text-blue-600 dark:text-blue-400 -translate-y-2 bg-blue-50 dark:bg-blue-900/20' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
        >
          <UploadIcon active={activeTab === 'upload'} />
          <span className="text-[10px] font-medium">Upload</span>
        </button>
        
        <button 
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-300 w-16 ${activeTab === 'settings' ? 'text-blue-600 dark:text-blue-400 -translate-y-2 bg-blue-50 dark:bg-blue-900/20' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
        >
          <SettingsIcon active={activeTab === 'settings'} />
          <span className="text-[10px] font-medium">Settings</span>
        </button>
      </nav>
    </div>
  );
};

export default App;