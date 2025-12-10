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
const PhoneIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"/></svg>
);
const PhoneOffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"/><line x1="23" x2="1" y1="1" y2="23"/></svg>
);
const SparklesIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M9 3v4"/><path d="M3 5h4"/><path d="M3 9h4"/></svg>
);

const AVATAR_SEEDS = ['Felix', 'Aneka', 'Zoe', 'Marc', 'Buster', 'Tigger', 'Coco', 'Jack'];

const App: React.FC = () => {
  // --- API KEY Handling ---
  const [customApiKey, setCustomApiKey] = useState(() => localStorage.getItem('mrcute_api_key') || '');
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const effectiveApiKey = customApiKey || process.env.API_KEY || "AIzaSyDklwpDl9ItDNugR44gkAGI29rVplbhJ_M"; 

  const saveCustomApiKey = (key: string) => {
    setCustomApiKey(key);
    localStorage.setItem('mrcute_api_key', key);
    setShowApiKeyModal(false);
    window.location.reload();
  };

  const checkApiError = (err: any) => {
    if (err && (err.message?.includes('leaked') || err.message?.includes('revoked') || err.status === 403 || err.status === 401)) {
       setShowApiKeyModal(true);
    }
  };

  const [activeTab, setActiveTab] = useState('home');
  const [targetLanguage, setTargetLanguage] = useState('English');
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [isVoiceChatMode, setIsVoiceChatMode] = useState(false);

  const { 
    connect, 
    disconnect, 
    isConnected, 
    isConnecting,
    isAiSpeaking,
    transcripts,
    setTranscripts,
    updateTranscript,
    volume,
    error
  } = useLiveSession();
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showHistoryDetail, setShowHistoryDetail] = useState<HistoryItem | null>(null);

  // --- Settings State (Persisted) ---
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('mrcute_settings');
    return saved ? JSON.parse(saved) : { theme: 'dark', userName: 'Guest', avatarSeed: 'Felix', customAvatar: null };
  });

  useEffect(() => {
    localStorage.setItem('mrcute_settings', JSON.stringify(settings));
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings]);

  // --- Avatar Gen State ---
  const [avatarPrompt, setAvatarPrompt] = useState('Cool stylized cartoon character, vibrant digital art');
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const [generatedAvatar, setGeneratedAvatar] = useState<string | null>(null);

  const handleGenerateAvatar = async () => {
    if (!effectiveApiKey) {
      setShowApiKeyModal(true);
      return;
    }
    setIsGeneratingAvatar(true);
    setGeneratedAvatar(null);
    try {
      const genAI = new GoogleGenAI({ apiKey: effectiveApiKey });
      const response = await genAI.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [{ text: `Generate an avatar image: ${avatarPrompt}. Style: Vector art, flat illustration, clean lines, colorful, 1:1 aspect ratio.` }],
        },
      });
      
      let imageUrl = null;
      if (response.candidates?.[0]?.content?.parts) {
         for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
               imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
               break;
            }
         }
      }

      if (imageUrl) {
        setGeneratedAvatar(imageUrl);
      } else {
        alert("Could not generate image. Try a different prompt.");
      }
    } catch (e: any) {
      console.error(e);
      checkApiError(e);
      alert("Error generating avatar: " + e.message);
    } finally {
      setIsGeneratingAvatar(false);
    }
  };

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
    // Only auto-save if NOT in voice chat mode (to prevent overwriting class notes logic with chat)
    if (isVoiceChatMode) return;
    
    const saved = localStorage.getItem('mrcute_transcript_autosave');
    if (saved && transcripts.length === 0) {
       try {
         const parsed = JSON.parse(saved);
         const restored = parsed.map((p: any) => ({...p, timestamp: new Date(p.timestamp)}));
         setTranscripts(restored);
       } catch (e) { console.error("Failed to load transcript autosave", e); }
    }
  }, []);

  useEffect(() => {
    if (!isVoiceChatMode && transcripts.length > 0) {
        const interval = setInterval(() => {
           localStorage.setItem('mrcute_transcript_autosave', JSON.stringify(transcripts));
        }, 60000);
        return () => clearInterval(interval);
    }
  }, [transcripts, isVoiceChatMode]);

  // --- Main Chat State (Persisted) ---
  const [chatMessages, setChatMessages] = useState<{id: string, role: 'user' | 'model', text: string}[]>(() => {
    const saved = localStorage.getItem('mrcute_chat_current');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isDictating, setIsDictating] = useState(false);
  const [chatAttachments, setChatAttachments] = useState<{name: string, mimeType: string, data: string}[]>([]);
  
  const contextSessionRef = useRef<any>(null);
  const [contextMessages, setContextMessages] = useState<{id: string, role: 'user' | 'model', text: string}[]>([]);
  const [contextInput, setContextInput] = useState('');
  const [isContextLoading, setIsContextLoading] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'analyzing' | 'done' | 'error'>('idle');
  const [uploadResult, setUploadResult] = useState<string | null>(null);
  const [uploadImagePreview, setUploadImagePreview] = useState<string | null>(null);
  const [uploadFileType, setUploadFileType] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem('mrcute_chat_current', JSON.stringify(chatMessages));
  }, [chatMessages]);

  // Redundant safety interval for chat saving every 60s as requested
  useEffect(() => {
      const interval = setInterval(() => {
          if (chatMessages.length > 0) {
              localStorage.setItem('mrcute_chat_current', JSON.stringify(chatMessages));
          }
      }, 60000);
      return () => clearInterval(interval);
  }, [chatMessages]);

  useEffect(() => {
    if (scrollRef.current && !editingId) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcripts, editingId]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages, isChatLoading, chatAttachments]);

  const handleConnect = useCallback(async () => {
    if (effectiveApiKey) {
        try {
            // Note Taker Mode: NO AUDIO OUTPUT (silent)
            await connect(effectiveApiKey, 'Kore', targetLanguage, undefined, false);
        } catch(e: any) {
            checkApiError(e);
        }
    } else {
        setShowApiKeyModal(true);
    }
  }, [connect, effectiveApiKey, targetLanguage]);

  const handleVoiceChatStart = useCallback(async () => {
    if (effectiveApiKey) {
        try {
            setIsVoiceChatMode(true);
            // Voice Chat Mode: AUDIO OUTPUT ENABLED
            await connect(
                effectiveApiKey, 
                'Kore', 
                targetLanguage,
                `You are "MrCute", a helpful, friendly, and intelligent AI assistant. 
                 IMPORTANT: As soon as the connection starts, you MUST speak first. 
                 Say exactly this phrase: "Hi, I'm MrCute. How can I help you?". 
                 Then wait for the user to respond. 
                 Engage in a natural, two-way verbal conversation in ${targetLanguage}. Keep responses concise.`,
                true 
            );
        } catch(e: any) {
            checkApiError(e);
            setIsVoiceChatMode(false);
        }
    } else {
        setShowApiKeyModal(true);
    }
  }, [connect, effectiveApiKey, targetLanguage]);

  const handleVoiceChatEnd = useCallback(async () => {
      // 1. Disconnect current session
      // Wait for disconnect to ensure all transcripts (incl. flushed partials) are in state
      await disconnect();
      
      // The useEffect below will detect the mode change and sync transcripts to chat history
      setIsVoiceChatMode(false);
  }, [disconnect]);

  // Sync transcripts to chat when voice mode ends
  useEffect(() => {
      if (!isVoiceChatMode && transcripts.length > 0) {
          // We just ended voice chat. Append transcripts to chat history.
          // Check for duplicates to be safe, though disconnect flushes unique IDs
          const newMessages = transcripts.map(t => ({
              id: t.id,
              role: t.role,
              text: t.text
          }));
          
          setChatMessages(prev => {
              // Simple de-dupe based on ID just in case
              const existingIds = new Set(prev.map(m => m.id));
              const uniqueNew = newMessages.filter(m => !existingIds.has(m.id));
              return [...prev, ...uniqueNew];
          });
          setTranscripts([]); // Clear transcripts after syncing
      }
  }, [isVoiceChatMode, transcripts]); 

  useEffect(() => {
     if(error) {
         if (error.includes('403') || error.includes('PermissionDenied') || error.includes('leaked')) {
             setShowApiKeyModal(true);
         }
     }
  }, [error]);

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

  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); 
    if (window.confirm("Are you sure you want to delete this item?")) {
      setHistory(prev => prev.filter(item => item.id !== id));
      if (showHistoryDetail?.id === id) setShowHistoryDetail(null);
    }
  };

  const handleDisconnect = () => {
    // Standard Home tab disconnect
    if (transcripts.length > 0) {
      const preview = transcripts.map(t => t.text).join(' ').substring(0, 100) + '...';
      addToHistory('voice', `Voice Session (${targetLanguage}) ${new Date().toLocaleTimeString()}`, transcripts, preview);
      localStorage.removeItem('mrcute_transcript_autosave');
    }
    disconnect();
  };

  const handleSaveChat = () => {
    if (chatMessages.length === 0) return;
    const preview = chatMessages[chatMessages.length - 1].text.substring(0, 80) + '...';
    addToHistory('chat', `AI Chat (${targetLanguage}) ${new Date().toLocaleTimeString()}`, chatMessages, preview);
    setChatMessages([]);
    localStorage.removeItem('mrcute_chat_current');
    alert("Chat saved to History!");
  };

  const handleSendMessage = async () => {
    if ((!chatInput.trim() && chatAttachments.length === 0) || !effectiveApiKey) {
        if (!effectiveApiKey) setShowApiKeyModal(true);
        return;
    }
    
    const userMsgText = chatInput.trim();
    const currentAttachments = [...chatAttachments];
    
    setChatInput('');
    setChatAttachments([]);
    
    const newMessageId = crypto.randomUUID();
    const attachmentText = currentAttachments.length > 0 ? ` [${currentAttachments.length} Attachment(s)]` : '';
    
    setChatMessages(prev => [...prev, { 
      id: newMessageId, 
      role: 'user', 
      text: userMsgText + attachmentText
    }]);
    
    setIsChatLoading(true);

    try {
      const genAI = new GoogleGenAI({ apiKey: effectiveApiKey });
      
      const history = chatMessages.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
      }));

      // Only include context if we are NOT in voice chat mode mixed history
      const context = activeTab === 'aichat' && !isVoiceChatMode ? transcripts.map(t => t.text).join('\n') : "";
      const finalPrompt = `${userMsgText}\n\n[SYSTEM INJECTION - CURRENT LECTURE NOTES CONTEXT]:\n${context || "(No lecture notes available yet)"}`;
      
      const newParts: any[] = [];
      // Handle multiple attachments
      currentAttachments.forEach(att => {
         newParts.push({ inlineData: { mimeType: att.mimeType, data: att.data } });
      });
      newParts.push({ text: finalPrompt });

      const response = await genAI.models.generateContent({
        model: "gemini-2.5-flash",
        config: {
          systemInstruction: `You are "MrCute", an intelligent and helpful AI teaching assistant. 
            Your goal is to answer questions, explain concepts, and analyze uploaded materials. 
            If the user uploads a quiz or test, solve the questions and provide brief explanations. 
            If there are lecture notes provided in context, refer to them. 
            ALWAYS RESPOND IN ${targetLanguage}, regardless of the user's input language. Translate if necessary.
            Be conversational, concise, and friendly.`
        },
        contents: [
          ...history,
          { role: 'user', parts: newParts }
        ]
      });

      const responseText = response.text || "No response text.";
      setChatMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'model', text: responseText }]);

    } catch (err: any) {
      console.error("Chat Error", err);
      checkApiError(err);
      let errorMessage = "Sorry, I encountered an error.";
      if (err.message) errorMessage += ` (${err.message})`;
      setChatMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'model', text: errorMessage }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleContextSendMessage = async (contextText: string, contextImage?: string, mimeType?: string) => {
    if (!contextInput.trim() || !effectiveApiKey) return;

    const userText = contextInput;
    setContextInput('');
    setContextMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'user', text: userText }]);
    setIsContextLoading(true);

    try {
        const genAI = new GoogleGenAI({ apiKey: effectiveApiKey });
        
        const history = contextMessages.map(msg => ({
            role: msg.role,
            parts: [{ text: msg.text }]
        }));

        let promptWithContext = userText;
        if (contextMessages.length === 0) {
            promptWithContext = `[CONTEXT CONTENT]:\n${contextText}\n\n[USER QUESTION]: ${userText}`;
        }

        const currentParts: any[] = [];
        if (contextImage && contextMessages.length === 0) {
             const mime = mimeType || 'image/jpeg';
             const data = contextImage.includes('base64,') ? contextImage.split('base64,')[1] : contextImage;
             currentParts.push({ inlineData: { mimeType: mime, data: data } });
        }
        currentParts.push({ text: promptWithContext });

        const response = await genAI.models.generateContent({
            model: "gemini-2.5-flash",
            config: {
                 systemInstruction: "You are MrCute, a helpful assistant analyzing a specific document or history record for the user."
            },
            contents: [
                ...history,
                { role: 'user', parts: currentParts }
            ]
        });

        setContextMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'model', text: response.text || "No text." }]);
    } catch (e) {
        console.error("Context Chat Error", e);
        checkApiError(e);
        setContextMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'model', text: "Error getting response." }]);
    } finally {
        setIsContextLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: File) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
           const base64 = (ev.target?.result as string).split(',')[1];
           setChatAttachments(prev => [...prev, {
              name: file.name,
              mimeType: file.type,
              data: base64
           }]);
        };
        reader.readAsDataURL(file);
    });
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
      setChatAttachments(prev => prev.filter((_, i) => i !== index));
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
    if (!file || !effectiveApiKey) {
        if(!effectiveApiKey) setShowApiKeyModal(true);
        return;
    }

    setUploadStatus('uploading');
    setContextMessages([]); 
    contextSessionRef.current = null;
    setUploadFileType(file.type);
    
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = e.target?.result as string;
        const cleanBase64 = base64Data.split(',')[1];
        
        if (file.type.startsWith('image/')) {
            setUploadImagePreview(base64Data);
        } else {
            setUploadImagePreview(base64Data); 
        }
        
        setUploadStatus('analyzing');

        const genAI = new GoogleGenAI({ apiKey: effectiveApiKey });
        let parts: any[] = [];
        let prompt = "";

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
            const text = atob(cleanBase64);
            prompt = "Analyze this text. 1. QUIZ DETECTION: Check for questions. 2. SUMMARY: Summarize content.";
            parts = [{ text: prompt + "\n\n" + text.substring(0, 30000) }];
        }

        const response = await genAI.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts }
        });
        
        const responseText = response.text || "No result generated.";
        setUploadResult(responseText);
        setUploadStatus('done');

        addToHistory('upload', `Upload: ${file.name}`, responseText, responseText.substring(0, 100) + '...', base64Data, file.type);
      };

      reader.readAsDataURL(file);

    } catch (e: any) {
      console.error(e);
      checkApiError(e);
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
                      MrCute Answer
                    </div>
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
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Ask MrCute about this content</span>
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

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-[#0b1121] text-slate-900 dark:text-slate-100 transition-colors duration-300">
      
      {showApiKeyModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-700">
               <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-4 mx-auto">
                  <AlertIcon />
               </div>
               <h2 className="text-xl font-bold text-center mb-2 dark:text-white">API Key Required</h2>
               <p className="text-center text-slate-600 dark:text-slate-400 text-sm mb-6">
                 Your previous API key was revoked by Google. Please enter a <strong>new API Key</strong> below.
               </p>
               <input 
                 type="text" 
                 placeholder="Enter new Gemini API Key" 
                 className="w-full p-3 bg-slate-100 dark:bg-slate-700/50 rounded-xl border border-slate-300 dark:border-slate-600 outline-none focus:ring-2 focus:ring-blue-500 dark:text-white mb-4"
                 onKeyDown={(e) => {
                    if (e.key === 'Enter') saveCustomApiKey((e.target as HTMLInputElement).value);
                 }}
               />
               <button 
                 onClick={() => {
                    const input = document.querySelector('input[placeholder="Enter new Gemini API Key"]') as HTMLInputElement;
                    if(input?.value) saveCustomApiKey(input.value);
                 }}
                 className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors"
               >
                 Update API Key
               </button>
               <p className="text-xs text-center mt-4 text-slate-500">
                  <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="underline hover:text-blue-500">
                    Get a new key here
                  </a>
               </p>
            </div>
         </div>
      )}

      {/* Avatar Selection Modal */}
      {showAvatarModal && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto" onClick={() => setShowAvatarModal(false)}>
              <div className="bg-white dark:bg-[#161e32] p-6 rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-700 transform transition-all scale-100 animate-fade-in my-8" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">Choose Your Avatar</h3>
                      <button onClick={() => setShowAvatarModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><CloseIcon/></button>
                  </div>
                  
                  {/* Standard Presets */}
                  <div className="mb-6">
                     <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wider">Presets</h4>
                     <div className="grid grid-cols-4 gap-4">
                        {AVATAR_SEEDS.map(seed => (
                           <button 
                             key={seed}
                             onClick={() => {
                                 setSettings(s => ({...s, avatarSeed: seed, customAvatar: null}));
                                 setShowAvatarModal(false);
                             }}
                             className={`p-2 rounded-2xl border transition-all duration-200 transform hover:scale-105 ${
                                settings.avatarSeed === seed && !settings.customAvatar
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 ring-2 ring-blue-500/30' 
                                : 'border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600'
                             }`}
                           >
                              <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`} alt={seed} className="w-full h-auto" />
                           </button>
                        ))}
                     </div>
                  </div>

                  {/* AI Generator Section */}
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2 mb-3">
                         <div className="p-1.5 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-lg">
                           <SparklesIcon />
                         </div>
                         <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">AI Avatar Generator</h4>
                      </div>
                      
                      <div className="flex gap-2 mb-3">
                         <input 
                           type="text" 
                           value={avatarPrompt}
                           onChange={(e) => setAvatarPrompt(e.target.value)}
                           className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-500 dark:text-white"
                           placeholder="Describe your avatar (e.g., Cyberpunk ninja)"
                         />
                         <button 
                           onClick={handleGenerateAvatar}
                           disabled={isGeneratingAvatar || !avatarPrompt.trim()}
                           className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-xl text-sm font-medium disabled:opacity-50 transition-colors"
                         >
                           {isGeneratingAvatar ? '...' : 'Generate'}
                         </button>
                      </div>

                      {generatedAvatar && (
                         <div className="flex flex-col items-center animate-fade-in">
                            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-purple-500 shadow-lg mb-3">
                               <img src={generatedAvatar} alt="Generated" className="w-full h-full object-cover" />
                            </div>
                            <button 
                               onClick={() => {
                                  setSettings(s => ({...s, customAvatar: generatedAvatar}));
                                  setShowAvatarModal(false);
                               }}
                               className="w-full py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl hover:opacity-90 transition-opacity"
                            >
                               Use this Avatar
                            </button>
                         </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* Top Bar */}
      <header className="px-6 py-5 flex justify-between items-center bg-white/80 dark:bg-[#0b1121]/80 backdrop-blur-md sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-blue-600 dark:text-blue-500">
            MRCUTE <span className="text-slate-800 dark:text-white">AI</span>
          </h1>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">Welcome, {settings.userName}</p>
        </div>
        <button 
           onClick={() => setShowAvatarModal(true)}
           className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-cyan-400 p-[2px] cursor-pointer hover:scale-110 transition-transform active:scale-95 shadow-md"
        >
           <div className="w-full h-full rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
             {settings.customAvatar ? (
               <img src={settings.customAvatar} alt="User" className="w-full h-full object-cover" />
             ) : (
               <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${settings.avatarSeed}`} alt="User" />
             )}
           </div>
        </button>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative">
        
        {/* VOICE CHAT OVERLAY */}
        {isVoiceChatMode && (
            <div className="absolute inset-0 z-50 bg-[#0b1121] flex flex-col items-center justify-center p-6 animate-fade-in">
                <div className="mb-10 text-center">
                    <h2 className="text-3xl font-bold text-white mb-2">Voice Chat</h2>
                    <p className="text-slate-400 text-sm">Conversation with MrCute</p>
                </div>
                
                <div className="relative w-48 h-48 flex items-center justify-center mb-12">
                     {/* Ripples */}
                     <div className={`absolute inset-0 bg-blue-500/20 rounded-full ${isConnected ? 'animate-ripple' : ''}`} style={{animationDelay: '0s'}}></div>
                     <div className={`absolute inset-0 bg-blue-500/20 rounded-full ${isConnected ? 'animate-ripple' : ''}`} style={{animationDelay: '1s'}}></div>
                     
                     {/* Main Circle */}
                     <div className={`relative z-10 w-32 h-32 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(37,99,235,0.5)] transition-all duration-300 ${isAiSpeaking ? 'bg-gradient-to-br from-green-400 to-emerald-600 scale-110 shadow-emerald-500/50' : 'bg-gradient-to-br from-blue-600 to-purple-600'}`}>
                         <div className="w-24 h-24 bg-[#0b1121] rounded-full flex items-center justify-center overflow-hidden">
                              {/* Visualizer inside */}
                              {isConnected && <Visualizer volume={volume} isActive={isConnected} />}
                              {!isConnected && isConnecting && <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                         </div>
                     </div>
                </div>

                <div className="w-full max-w-md h-32 overflow-y-auto mb-10 text-center px-4 custom-scrollbar">
                     <p className={`text-lg font-medium transition-colors duration-300 ${isAiSpeaking ? 'text-green-400' : 'text-slate-200'}`}>
                         {isAiSpeaking 
                            ? "MrCute is Speaking..." 
                            : transcripts.length > 0 && !isConnecting
                               ? (transcripts[transcripts.length - 1].role === 'user' ? "Listening..." : "Thinking...")
                               : (isConnecting ? "Connecting..." : "Listening...")}
                     </p>
                </div>

                <button 
                  onClick={handleVoiceChatEnd}
                  className="bg-red-500 hover:bg-red-600 text-white px-8 py-4 rounded-full font-bold shadow-lg transition-transform hover:scale-105 flex items-center gap-3"
                >
                   <PhoneOffIcon />
                   End Call
                </button>
            </div>
        )}

        {/* HOME TAB */}
        {activeTab === 'home' && !isVoiceChatMode && (
          <div className="h-full flex flex-col p-4">
            <div className="flex-1 bg-white dark:bg-[#161e32] rounded-3xl p-5 shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col relative overflow-hidden transition-colors duration-300">
              <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-3">
                   <div className={`p-2 rounded-xl ${isConnected ? 'bg-red-500/10 text-red-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                     <MicIcon className={`w-5 h-5 ${isConnected ? 'animate-pulse' : ''}`} />
                   </div>
                   <div>
                     <h2 className="font-bold text-slate-800 dark:text-white">Live Transcript</h2>
                     <p className="text-xs text-slate-500 dark:text-slate-400">
                       {isConnected ? 'Listening & Analyzing...' : isConnecting ? 'Connecting...' : 'Ready to record'}
                     </p>
                   </div>
                </div>
                <div className="flex items-center gap-3">
                   <select 
                     value={targetLanguage}
                     onChange={(e) => setTargetLanguage(e.target.value)}
                     className="bg-slate-100 dark:bg-slate-800 text-xs font-medium px-3 py-1.5 rounded-lg outline-none border-none text-slate-700 dark:text-slate-300"
                     disabled={isConnected || isConnecting}
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

              {error && (
                <div className="absolute bottom-4 left-4 right-4 bg-red-500/90 text-white p-3 rounded-xl flex items-center gap-3 text-sm backdrop-blur-sm animate-fade-in">
                  <AlertIcon />
                  {error}
                </div>
              )}
            </div>

            <div className="h-32 flex items-center justify-center relative">
               {isConnected && (
                 <div className="absolute w-24 h-24 bg-blue-500/20 rounded-full animate-ripple"></div>
               )}
               <button 
                 onClick={isConnected ? handleDisconnect : handleConnect}
                 disabled={isConnecting}
                 className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 transform hover:scale-105 ${
                   isConnected 
                   ? 'bg-red-500 hover:bg-red-600 text-white rotate-0' 
                   : isConnecting 
                     ? 'bg-slate-400 cursor-not-allowed'
                     : 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white hover:shadow-blue-500/50'
                 }`}
               >
                 {isConnected ? (
                   <div className="w-8 h-8 bg-white rounded-md"></div>
                 ) : isConnecting ? (
                   <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                 ) : (
                   <MicIcon className="w-10 h-10" />
                 )}
               </button>
               <p className="absolute bottom-4 text-xs font-medium text-slate-400 dark:text-slate-500">
                 {isConnected ? 'Tap to stop' : isConnecting ? 'Connecting...' : 'Tap to start recording'}
               </p>
            </div>
          </div>
        )}

        {/* HISTORY TAB */}
        {activeTab === 'history' && !isVoiceChatMode && (
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
                          className="bg-white dark:bg-[#161e32] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all cursor-pointer group relative"
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
                             <div className="flex gap-2">
                                <button onClick={(e) => deleteHistoryItem(item.id, e)} className="p-2 text-slate-400 hover:text-red-500 z-10 relative"><TrashIcon /></button>
                                <ChevronRight />
                             </div>
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
                       <ChevronRight /> 
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

                     <div className="prose dark:prose-invert max-w-none text-sm">
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
        {activeTab === 'aichat' && !isVoiceChatMode && (
          <div className="h-full flex flex-col p-4 bg-slate-50 dark:bg-[#0b1121]">
             <div className="flex justify-between items-center mb-4 px-2">
                <div className="flex flex-col">
                   <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      AI Chat <span className="text-xs font-normal px-2 py-1 bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300 rounded-full">MrCute</span>
                   </h2>
                </div>
                <div className="flex items-center gap-2">
                   <select 
                     value={targetLanguage}
                     onChange={(e) => setTargetLanguage(e.target.value)}
                     className="bg-slate-200 dark:bg-slate-800 text-xs font-medium px-2 py-1.5 rounded-lg outline-none border-none text-slate-700 dark:text-slate-300 mr-1"
                   >
                     <option>English</option>
                     <option>Spanish</option>
                     <option>French</option>
                     <option>German</option>
                     <option>Chinese</option>
                     <option>Japanese</option>
                   </select>
                   <button onClick={handleSaveChat} className="p-2 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400" title="Save Chat">
                      <SaveIcon />
                   </button>
                   <button onClick={() => setChatMessages([])} className="p-2 text-slate-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400" title="Clear Chat">
                      <TrashIcon />
                   </button>
                </div>
             </div>

             <div ref={chatScrollRef} className="flex-1 bg-white dark:bg-[#161e32] rounded-3xl p-4 shadow-sm border border-slate-200 dark:border-slate-800 overflow-y-auto space-y-6 custom-scrollbar mb-4 relative">
                {chatMessages.length === 0 ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 opacity-60">
                     <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
                        <ChatIcon active={true}/>
                     </div>
                     <p>Ask anything about your notes!</p>
                     
                     <div className="mt-8">
                       <button 
                         onClick={handleVoiceChatStart}
                         className="flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-full shadow-lg transition-transform hover:scale-105 pointer-events-auto"
                       >
                         <PhoneIcon className="w-5 h-5"/>
                         Start Voice Chat
                       </button>
                     </div>
                  </div>
                ) : (
                  chatMessages.map((msg) => (
                    <div key={msg.id} className={`flex w-full animate-fade-in ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                       <div className={`max-w-[85%] p-5 rounded-3xl text-base leading-relaxed shadow-sm ${
                         msg.role === 'user' 
                           ? 'bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 text-slate-800 dark:text-slate-100 rounded-br-none ml-auto' 
                           : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-bl-none mr-auto'
                       }`}>
                          {renderFormattedContent(msg.text, msg.role, msg.id, 'chat')}
                       </div>
                    </div>
                  ))
                )}
                {isChatLoading && (
                  <div className="flex justify-start animate-fade-in">
                     <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl rounded-bl-none border border-slate-200 dark:border-slate-700 shadow-sm">
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
             <div className="flex flex-col gap-2 bg-white dark:bg-[#161e32] p-2 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800">
                
                {/* Attachment Preview Area */}
                {chatAttachments.length > 0 && (
                  <div className="flex gap-3 overflow-x-auto p-2 pb-3 mb-1 border-b border-slate-100 dark:border-slate-700 custom-scrollbar">
                    {chatAttachments.map((att, idx) => (
                       <div key={idx} className="relative flex-shrink-0 group">
                          {att.mimeType.startsWith('image/') ? (
                             <img src={`data:${att.mimeType};base64,${att.data}`} alt="preview" className="h-20 w-20 object-cover rounded-lg border border-slate-200 dark:border-slate-600" />
                          ) : (
                             <div className="h-20 w-20 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                                <span className="text-xs font-bold text-slate-500">PDF</span>
                             </div>
                          )}
                          <button 
                            onClick={() => removeAttachment(idx)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                          >
                             <CloseIcon />
                          </button>
                          <span className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] truncate px-1 rounded-b-lg">
                             {att.name}
                          </span>
                       </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 items-end">
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*,application/pdf"
                    multiple // Allow multiple
                    onChange={handleFileSelect}
                  />
                  
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className={`p-3 rounded-xl transition-colors ${
                       chatAttachments.length > 0 ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500'
                    }`}
                    title="Attach Images/PDFs"
                  >
                    <PaperclipIcon />
                  </button>

                  <div className="flex-1 flex flex-col gap-2">
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

                  {/* Voice Chat Trigger Button */}
                  <button 
                     onClick={handleVoiceChatStart}
                     className="p-3 bg-red-500 hover:bg-red-600 text-white rounded-xl shadow-md transition-all active:scale-95"
                     title="Start Voice Chat with AI"
                  >
                     <PhoneIcon className="w-5 h-5"/>
                  </button>

                  <button 
                    onClick={handleSendMessage}
                    disabled={(!chatInput.trim() && chatAttachments.length === 0) || isChatLoading}
                    className="p-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white rounded-xl shadow-md transition-all active:scale-95"
                  >
                    <SendIcon />
                  </button>
                </div>
             </div>
          </div>
        )}

        {/* UPLOAD TAB */}
        {activeTab === 'upload' && !isVoiceChatMode && (
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
                    
                    <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                       <h3 className="text-xl font-bold mb-4 text-slate-900 dark:text-white border-l-4 border-blue-500 pl-3">Analysis Result</h3>
                       <div className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-300">
                          <div className="whitespace-pre-wrap">{uploadResult}</div>
                       </div>
                    </div>
                 </div>
              </div>
            )}
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && !isVoiceChatMode && (
          <div className="h-full p-6 bg-slate-50 dark:bg-[#0b1121]">
             <h2 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">Settings</h2>
             
             <div className="space-y-4">
                <div className="bg-white dark:bg-[#161e32] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                   <h3 className="font-semibold mb-3 text-slate-800 dark:text-slate-200">Profile</h3>
                   <div className="mb-4">
                      <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Your Name</label>
                      <input 
                         type="text" 
                         value={settings.userName} 
                         onChange={(e) => setSettings(s => ({...s, userName: e.target.value}))}
                         className="w-full p-2 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 outline-none text-slate-800 dark:text-slate-100 text-sm"
                      />
                   </div>
                   <p className="text-xs text-slate-500 dark:text-slate-400">
                      Tap your avatar in the top right corner to change it.
                   </p>
                </div>

                <div className="bg-white dark:bg-[#161e32] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                   <h3 className="font-semibold mb-3 text-slate-800 dark:text-slate-200">API Key</h3>
                   <div className="flex flex-col gap-2">
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                        {customApiKey 
                          ? `Using custom key ending in ...${customApiKey.slice(-4)}` 
                          : 'Using default configuration'
                        }
                      </p>
                      <button 
                         onClick={() => setShowApiKeyModal(true)}
                         className="py-2 px-4 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-xl text-sm font-medium transition-colors"
                      >
                         Change API Key
                      </button>
                   </div>
                </div>

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
             </div>
          </div>
        )}

      </main>

      {/* Bottom Navigation */}
      <nav className="h-20 bg-white dark:bg-[#161e32] border-t border-slate-200 dark:border-slate-800 flex justify-around items-center px-2 pb-2 z-20">
        <button 
          onClick={() => setActiveTab('home')}
          disabled={isVoiceChatMode}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-300 w-16 ${activeTab === 'home' ? 'text-blue-600 dark:text-blue-400 -translate-y-2 bg-blue-50 dark:bg-blue-900/20' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
        >
          <HomeIcon active={activeTab === 'home'} />
          <span className="text-[10px] font-medium">Home</span>
        </button>
        
        <button 
          onClick={() => setActiveTab('history')}
          disabled={isVoiceChatMode}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-300 w-16 ${activeTab === 'history' ? 'text-blue-600 dark:text-blue-400 -translate-y-2 bg-blue-50 dark:bg-blue-900/20' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
        >
          <HistoryIcon active={activeTab === 'history'} />
          <span className="text-[10px] font-medium">History</span>
        </button>

        <button 
           onClick={() => setActiveTab('aichat')}
           disabled={isVoiceChatMode}
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
          disabled={isVoiceChatMode}
          className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all duration-300 w-16 ${activeTab === 'upload' ? 'text-blue-600 dark:text-blue-400 -translate-y-2 bg-blue-50 dark:bg-blue-900/20' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
        >
          <UploadIcon active={activeTab === 'upload'} />
          <span className="text-[10px] font-medium">Upload</span>
        </button>
        
        <button 
          onClick={() => setActiveTab('settings')}
          disabled={isVoiceChatMode}
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