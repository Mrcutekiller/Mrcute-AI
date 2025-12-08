import { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { TranscriptionMessage } from '../types';
import { createPcmBlob, base64ToUint8Array, decodeAudioData } from '../utils/audio-utils';

export const useLiveSession = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [transcripts, setTranscripts] = useState<TranscriptionMessage[]>([]);
  const [volume, setVolume] = useState(0); 
  const [isMuted, setIsMuted] = useState(true); 
  const [error, setError] = useState<string | null>(null);

  const sessionRef = useRef<Promise<any> | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  
  const currentInputTransRef = useRef('');
  const currentOutputTransRef = useRef('');

  const updateTranscript = useCallback((id: string, newText: string) => {
    setTranscripts(prev => prev.map(t => t.id === id ? { ...t, text: newText } : t));
  }, []);

  // Define disconnect first so it can be called from connect's callbacks if needed
  const disconnect = useCallback(() => {
    if (sessionRef.current) {
       sessionRef.current.then((session: any) => {
          session.close();
       });
       sessionRef.current = null;
    }
    
    if (inputSourceRef.current) inputSourceRef.current.disconnect();
    if (processorRef.current) processorRef.current.disconnect();
    
    if (inputContextRef.current && inputContextRef.current.state !== 'closed') {
      inputContextRef.current.close();
    }
    if (outputContextRef.current && outputContextRef.current.state !== 'closed') {
      outputContextRef.current.close();
    }
    
    setIsConnected(false);
    setVolume(0);
  }, []);

  const connect = useCallback(async (voiceName: string = 'Kore', language: string = 'English') => {
    setError(null);
    try {
      const apiKey = process.env.API_KEY;
      if (!apiKey) throw new Error("API Key not found in environment");

      const ai = new GoogleGenAI({ apiKey });
      
      // Setup Audio Contexts
      const InputContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const inputCtx = new InputContextClass({ sampleRate: 16000 });
      
      const OutputContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const outputCtx = new OutputContextClass({ sampleRate: 24000 });
      
      // Ensure contexts are running (browser autoplay policy)
      if (inputCtx.state === 'suspended') await inputCtx.resume();
      if (outputCtx.state === 'suspended') await outputCtx.resume();

      inputContextRef.current = inputCtx;
      outputContextRef.current = outputCtx;

      // Request Mic Permission explicitly
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err: any) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
           throw new Error("Microphone permission denied. Please allow access in your browser settings.");
        }
        throw err;
      }
      
      const config = {
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO], 
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } },
          },
          systemInstruction: `You are an automated note-taker and translator for a classroom. 
          Language Setting: ${language}.
          1. LISTEN: Your primary job is to listen to the user (the teacher). 
          2. NOTE-TAKE: When the user speaks, summarize their points concisely in ${language}. 
          3. ANSWER: If the user asks a question (e.g., "Does anyone know the date of this event?", "What is 5 times 5?"), you MUST provide the answer immediately in ${language} and label it as [ANSWER].
          4. TRANSLATE: If the Language Setting is not English, ensure all your spoken and text responses are in ${language}.
          5. SILENCE: If the user is just talking, keep your responses brief and focused on note-taking summaries. Do not generate long conversational filler.`,
          inputAudioTranscription: { model: "gemini-2.5-flash-native-audio-preview-09-2025" },
          outputAudioTranscription: { model: "gemini-2.5-flash-native-audio-preview-09-2025" },
        },
      };

      const sessionPromise = ai.live.connect({
        ...config,
        callbacks: {
          onopen: () => {
            console.log("Connected to Gemini Live");
            setIsConnected(true);

            const source = inputCtx.createMediaStreamSource(stream);
            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
            
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              
              let sum = 0;
              for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
              setVolume(Math.sqrt(sum / inputData.length));

              const pcmBlob = createPcmBlob(inputData);
              sessionPromise.then((session: any) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(processor);
            processor.connect(inputCtx.destination);
            
            inputSourceRef.current = source;
            processorRef.current = processor;
          },
          onmessage: async (msg: LiveServerMessage) => {
             const serverContent = msg.serverContent;

             if (serverContent?.inputTranscription) {
                const text = serverContent.inputTranscription.text;
                if (text) {
                    currentInputTransRef.current += text;
                    // Check for Voice Command: "Stop Recording"
                    const lowerText = currentInputTransRef.current.toLowerCase();
                    if (lowerText.includes('stop recording') || lowerText.includes('stop session')) {
                        disconnect();
                        return;
                    }
                }
             }

             if (serverContent?.outputTranscription) {
                const text = serverContent.outputTranscription.text;
                if (text) currentOutputTransRef.current += text;
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

             const audioData = serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
             if (audioData) {
                const ctx = outputContextRef.current;
                if (!ctx || ctx.state === 'closed') return;

                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                
                try {
                  const audioBuffer = await decodeAudioData(
                    base64ToUint8Array(audioData),
                    ctx,
                    24000,
                    1
                  );
                  
                  const gainNode = ctx.createGain();
                  // Adjust volume/mute here if needed. 
                  // Note: Context suspend/resume is used for main mute toggle.
                  
                  const source = ctx.createBufferSource();
                  source.buffer = audioBuffer;
                  source.connect(gainNode);
                  gainNode.connect(ctx.destination);
                  
                  source.start(nextStartTimeRef.current);
                  nextStartTimeRef.current += audioBuffer.duration;
                } catch (e) {
                  console.error("Error decoding audio", e);
                }
             }
          },
          onclose: () => {
            console.log("Session closed");
            setIsConnected(false);
          },
          onerror: (err) => {
            console.error("Session error", err);
            setIsConnected(false);
            setError("Connection error: " + (err.message || "Unknown error"));
          }
        }
      });
      
      sessionRef.current = sessionPromise;

    } catch (error: any) {
      console.error("Connection failed", error);
      setIsConnected(false);
      setError(error.message || "Failed to connect to microphone or API.");
    }
  }, [disconnect]); // Add disconnect dependency

  useEffect(() => {
    const ctx = outputContextRef.current;
    if (ctx && ctx.state !== 'closed') {
      if (isMuted) {
         // Check state before suspending
         if(ctx.state === 'running') ctx.suspend();
      } else {
         // Check state before resuming
         if(ctx.state === 'suspended') ctx.resume();
      }
    }
  }, [isMuted, isConnected]);

  return {
    connect,
    disconnect,
    isConnected,
    transcripts,
    setTranscripts,
    updateTranscript,
    volume,
    isMuted,
    toggleMute: () => setIsMuted(prev => !prev),
    error
  };
};