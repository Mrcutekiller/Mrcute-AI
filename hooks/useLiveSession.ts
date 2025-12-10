import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { TranscriptionMessage } from '../types';
import { createPcmBlob, decodeAudioData, base64ToUint8Array } from '../utils/audio-utils';

export const useLiveSession = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [transcripts, setTranscripts] = useState<TranscriptionMessage[]>([]);
  const [volume, setVolume] = useState(0); 
  const [error, setError] = useState<string | null>(null);

  const sessionRef = useRef<Promise<any> | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null); 
  const userDisconnectingRef = useRef(false);
  
  const currentInputTransRef = useRef('');
  const currentOutputTransRef = useRef('');
  
  // Audio Playback Queue
  const audioQueueRef = useRef<AudioBuffer[]>([]);
  const isProcessingQueueRef = useRef(false);
  const nextStartTimeRef = useRef(0);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const processingTimeoutRef = useRef<any>(null);

  const updateTranscript = useCallback((id: string, newText: string) => {
    setTranscripts(prev => prev.map(t => t.id === id ? { ...t, text: newText } : t));
  }, []);

  // Async cleanup to ensure contexts are fully closed before reopening
  const cleanupAudioContexts = useCallback(async () => {
     if (processingTimeoutRef.current) {
       clearTimeout(processingTimeoutRef.current);
       processingTimeoutRef.current = null;
     }

     // Stop active playback sources
     activeSourcesRef.current.forEach(source => {
         try { source.stop(); } catch(e) {}
     });
     activeSourcesRef.current = [];

     // Stop stream tracks first to release microphone hardware lock
     if (streamRef.current) {
         try {
             streamRef.current.getTracks().forEach(track => {
                 try { track.stop(); } catch(e) { console.warn("Error stopping track", e); }
             });
         } catch(e) { console.warn("Error getting tracks", e); }
         streamRef.current = null;
     }

     if (inputSourceRef.current) {
         try { inputSourceRef.current.disconnect(); } catch(e) {}
         inputSourceRef.current = null;
     }
     if (processorRef.current) {
         try { processorRef.current.disconnect(); } catch(e) {}
         processorRef.current = null;
     }
      
      if (inputContextRef.current) {
        try {
            const ctx = inputContextRef.current;
            if (ctx.state !== 'closed') {
                await ctx.close();
            }
        } catch(e) { console.warn("Error closing input context", e); }
        inputContextRef.current = null;
      }
      
      if (outputContextRef.current) {
        try {
            const ctx = outputContextRef.current;
            if (ctx.state !== 'closed') {
                await ctx.close();
            }
        } catch(e) { console.warn("Error closing output context", e); }
        outputContextRef.current = null;
      }
      
      audioQueueRef.current = [];
      isProcessingQueueRef.current = false;
      nextStartTimeRef.current = 0;
      setIsAiSpeaking(false);
  }, []);

  const disconnect = useCallback(async () => {
    userDisconnectingRef.current = true;
    if (sessionRef.current) {
       const currentSession = sessionRef.current;
       sessionRef.current = null; // Clear immediately
       try {
           const session = await currentSession;
           session.close();
       } catch(e) { console.warn("Failed to close session", e); }
    }
    
    // FLUSH PARTIAL TRANSCRIPTS
    // This ensures we save what was said even if 'turnComplete' didn't fire before hangup
    if (currentInputTransRef.current.trim()) {
        const text = currentInputTransRef.current.trim();
        setTranscripts(prev => [...prev, {
            id: crypto.randomUUID(),
            role: 'user',
            text: text,
            timestamp: new Date(),
            isComplete: true
        }]);
        currentInputTransRef.current = '';
    }
    if (currentOutputTransRef.current.trim()) {
        const text = currentOutputTransRef.current.trim();
        setTranscripts(prev => [...prev, {
            id: crypto.randomUUID(),
            role: 'model',
            text: text,
            timestamp: new Date(),
            isComplete: true
        }]);
        currentOutputTransRef.current = '';
    }

    await cleanupAudioContexts();
    
    setIsConnected(false);
    setIsConnecting(false);
    setVolume(0);
  }, [cleanupAudioContexts]);

  const processAudioQueue = useCallback(async (ctx: AudioContext) => {
      if (audioQueueRef.current.length === 0) {
          isProcessingQueueRef.current = false;
          setIsAiSpeaking(false);
          return;
      }
      
      isProcessingQueueRef.current = true;
      setIsAiSpeaking(true);

      // Ensure context is running (fixes "Listening..." hang)
      if (ctx.state === 'suspended') {
        try { await ctx.resume(); } catch(e) { console.warn("Failed to resume output context", e); }
      }

      // Add a small buffer to ensure smooth playback
      const currentTime = ctx.currentTime;
      if (nextStartTimeRef.current < currentTime) {
          nextStartTimeRef.current = currentTime + 0.05;
      }

      const buffer = audioQueueRef.current.shift()!;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      
      source.onended = () => {
          activeSourcesRef.current = activeSourcesRef.current.filter(s => s !== source);
          if (audioQueueRef.current.length === 0 && activeSourcesRef.current.length === 0) {
              setIsAiSpeaking(false);
          }
      };
      
      activeSourcesRef.current = [...activeSourcesRef.current, source];
      source.start(nextStartTimeRef.current);
      
      nextStartTimeRef.current += buffer.duration;
      
      // Use setTimeout instead of requestAnimationFrame for better background performance
      processingTimeoutRef.current = setTimeout(() => processAudioQueue(ctx), 50);
  }, []);

  const connect = useCallback(async (
      apiKey: string, 
      voiceName: string = 'Kore', 
      language: string = 'English',
      systemInstruction?: string,
      enableAudioOutput: boolean = false
  ) => {
    if (isConnecting) return;
    setIsConnecting(true);
    userDisconnectingRef.current = false;
    setError(null);
    setTranscripts([]); 
    
    // Reset Partial Refs
    currentInputTransRef.current = '';
    currentOutputTransRef.current = '';
    
    try {
      if (!apiKey) throw new Error("API Key is required");

      // Ensure any previous session is dead
      if (sessionRef.current) {
         try { (await sessionRef.current).close(); } catch(e) {}
         sessionRef.current = null;
      }
      await cleanupAudioContexts();
      await new Promise(resolve => setTimeout(resolve, 300)); // OS release buffer

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Audio recording is not supported in this browser.");
      }

      let stream: MediaStream | null = null;
      try {
        // Use simpler constraints to avoid "OverconstrainedError" on some devices
        // Let the browser choose the native sample rate to avoid audio glitches
        stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                channelCount: 1
            }
        });
      } catch (err: any) {
        console.warn("Standard audio constraints failed, trying fallback", err);
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (finalErr: any) {
            if (finalErr.name === 'NotAllowedError' || finalErr.name === 'PermissionDeniedError') {
               throw new Error("Microphone permission denied. Please allow access in your browser settings.");
            }
            throw new Error(`Could not access microphone: ${finalErr.message}`);
        }
      }

      if (!stream) throw new Error("Failed to acquire microphone stream");
      streamRef.current = stream;

      const ai = new GoogleGenAI({ apiKey });
      
      // Input Context (Mic)
      // DO NOT force sampleRate here; let it be native to avoid input errors.
      const InputContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const inputCtx = new InputContextClass(); 
      if (inputCtx.state === 'suspended') await inputCtx.resume();
      inputContextRef.current = inputCtx;

      // Output Context (Speaker) - Only if enabled (e.g. Voice Chat)
      // Gemini output is typically 24000
      let outputCtx: AudioContext | null = null;
      if (enableAudioOutput) {
          const OutputContextClass = window.AudioContext || (window as any).webkitAudioContext;
          outputCtx = new OutputContextClass({ sampleRate: 24000 });
          if (outputCtx.state === 'suspended') await outputCtx.resume();
          outputContextRef.current = outputCtx;
      }

      const defaultInstruction = `You are an automated note-taker for a classroom.
          Language: ${language}.
          1. Listen to the teacher.
          2. Summarize points concisely in ${language}.
          3. If a question is asked, answer it and label with [ANSWER].
          4. Keep responses brief. Do not act like a chatbot unless asked.`;

      const config = {
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO], 
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } },
          },
          systemInstruction: systemInstruction || defaultInstruction,
          // IMPORTANT: Empty object enables transcription with default model. 
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
      };

      const sessionPromise = ai.live.connect({
        ...config,
        callbacks: {
          onopen: () => {
            console.log("Connected to Gemini Live");
            setIsConnected(true);
            setIsConnecting(false); 

            if (!stream || !inputCtx) return; 

            // Explicitly resume contexts again on connection to ensure no autoplay blocks
            if (inputCtx.state === 'suspended') inputCtx.resume();
            if (outputCtx && outputCtx.state === 'suspended') outputCtx.resume();

            try {
                const source = inputCtx.createMediaStreamSource(stream);
                const processor = inputCtx.createScriptProcessor(4096, 1, 1);
                
                processor.onaudioprocess = (e) => {
                  const inputData = e.inputBuffer.getChannelData(0);
                  // Volume calc
                  let sum = 0;
                  for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
                  setVolume(Math.sqrt(sum / inputData.length));

                  const pcmBlob = createPcmBlob(inputData);
                  sessionPromise.then((session: any) => {
                    // Send with the actual sample rate of the context
                    // This is CRITICAL for the model to understand the audio if native rate is 48000
                    session.sendRealtimeInput({ 
                        media: {
                            mimeType: `audio/pcm;rate=${inputCtx.sampleRate}`,
                            data: pcmBlob.data
                        }
                    });
                  });
                };

                source.connect(processor);
                processor.connect(inputCtx.destination);
                
                inputSourceRef.current = source;
                processorRef.current = processor;
            } catch (setupError) {
                console.error("Audio node setup failed", setupError);
                disconnect();
            }
          },
          onmessage: async (msg: LiveServerMessage) => {
             const serverContent = msg.serverContent;

             // Handle Interruption
             if (serverContent?.interrupted) {
                 console.log("Model interrupted");
                 // Clear Audio Queue
                 audioQueueRef.current = [];
                 activeSourcesRef.current.forEach(s => { try { s.stop(); } catch(e){} });
                 activeSourcesRef.current = [];
                 isProcessingQueueRef.current = false;
                 nextStartTimeRef.current = 0;
                 setIsAiSpeaking(false);
             }

             if (serverContent?.inputTranscription?.text) {
                currentInputTransRef.current += serverContent.inputTranscription.text;
             }
             if (serverContent?.outputTranscription?.text) {
                currentOutputTransRef.current += serverContent.outputTranscription.text;
             }

             if (serverContent?.turnComplete) {
                if (currentInputTransRef.current.trim()) {
                  setTranscripts(prev => [...prev, {
                    id: crypto.randomUUID(),
                    role: 'user',
                    text: currentInputTransRef.current.trim(),
                    timestamp: new Date(),
                    isComplete: true
                  }]);
                  currentInputTransRef.current = '';
                }

                if (currentOutputTransRef.current.trim()) {
                  setTranscripts(prev => [...prev, {
                    id: crypto.randomUUID(),
                    role: 'model',
                    text: currentOutputTransRef.current.trim(),
                    timestamp: new Date(),
                    isComplete: true
                  }]);
                  currentOutputTransRef.current = '';
                }
             }
             
             // Handle Audio Output
             if (enableAudioOutput && outputCtx && msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data) {
                const base64Data = msg.serverContent.modelTurn.parts[0].inlineData.data;
                try {
                    const audioData = base64ToUint8Array(base64Data);
                    const audioBuffer = await decodeAudioData(audioData, outputCtx, 24000, 1);
                    audioQueueRef.current.push(audioBuffer);
                    
                    if (!isProcessingQueueRef.current) {
                        processAudioQueue(outputCtx);
                    }
                } catch (audioErr) {
                    console.error("Audio decoding error", audioErr);
                }
             }
          },
          onclose: () => {
            console.log("Session closed");
            // Only disconnect UI if it wasn't a manual disconnect
            if (!userDisconnectingRef.current) {
                setIsConnected(false);
                setIsConnecting(false);
                setIsAiSpeaking(false);
            }
          },
          onerror: (err) => {
            console.error("Session error", err);
            setIsConnected(false);
            setIsConnecting(false);
            setIsAiSpeaking(false);
            setError("Connection error. Please try again.");
          }
        }
      });
      
      sessionRef.current = sessionPromise;

    } catch (error: any) {
      console.error("Connection failed", error);
      setIsConnected(false);
      setIsConnecting(false);
      setError(error.message || "Failed to connect.");
      await cleanupAudioContexts();
    }
  }, [disconnect, cleanupAudioContexts, isConnecting, processAudioQueue]);

  return {
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
  };
};