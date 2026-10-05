import React, { useState, useEffect, useRef } from 'react';
import { Note } from '../types';
import AudioVisualizer from '../components/AudioVisualizer';
import { generateNoteFromTranscript, generateTitle, transcribeAudio, blobToBase64 } from '../services/aiService';

interface RecorderViewProps {
    onSaveSession: (note: Note) => void;
    onCancel: () => void;
    autoGenerateTitles: boolean;
    micDeviceId?: string;
}

const RecorderView: React.FC<RecorderViewProps> = ({ onSaveSession, onCancel, autoGenerateTitles }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingStage, setProcessingStage] = useState<'transcribing' | 'synthesizing'>('transcribing');
    const [duration, setDuration] = useState(0);
    const [pinnedItems, setPinnedItems] = useState<{ time: string }[]>([]);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Audio refs
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const recorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    useEffect(() => {
        let interval: any;
        if (isRecording) {
            interval = setInterval(() => setDuration(d => d + 1), 1000);
        }
        return () => clearInterval(interval);
    }, [isRecording]);

    // Cleanup on unmount
    useEffect(() => {
        return () => cleanupAudio();
    }, []);

    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const cleanupAudio = () => {
        try {
            if (recorderRef.current && recorderRef.current.state !== 'inactive') {
                recorderRef.current.stop();
            }
        } catch { /* ignore */ }
        if (sourceRef.current) { sourceRef.current.disconnect(); sourceRef.current = null; }
        if (audioContextRef.current) { audioContextRef.current.close().catch(() => {}); audioContextRef.current = null; }
        if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
        analyserRef.current = null;
    };

    const startRecording = async () => {
        setErrorMessage(null);
        setDuration(0);
        setPinnedItems([]);
        chunksRef.current = [];

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true }
            });
            streamRef.current = stream;

            // Visualizer wiring
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
            const analyser = audioContextRef.current.createAnalyser();
            analyser.fftSize = 512;
            analyser.smoothingTimeConstant = 0.8;
            sourceRef.current.connect(analyser);
            analyserRef.current = analyser;

            // Pick a supported mime type
            const mimeCandidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg'];
            const mimeType = mimeCandidates.find(m => (window as any).MediaRecorder?.isTypeSupported?.(m)) || '';

            const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
            recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data); };
            recorder.onstop = () => handleTranscription(recorder.mimeType || mimeType || 'audio/webm');
            recorder.start(1000); // collect chunks every second
            recorderRef.current = recorder;

            setIsRecording(true);
        } catch (err: any) {
            console.error('Failed to start recording:', err);
            setErrorMessage(err?.name === 'NotAllowedError'
                ? 'Microphone access denied. Please allow microphone permissions and try again.'
                : (err.message || 'Could not start recording.'));
            cleanupAudio();
        }
    };

    const stopRecording = () => {
        setIsRecording(false);
        // Stops the recorder, which fires onstop -> handleTranscription
        if (recorderRef.current && recorderRef.current.state !== 'inactive') {
            recorderRef.current.stop();
        }
        // Tear down the live audio graph (but keep duration/pins for the note)
        if (sourceRef.current) { sourceRef.current.disconnect(); sourceRef.current = null; }
        if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    };

    const handleTranscription = async (mimeType: string) => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        if (audioContextRef.current) { audioContextRef.current.close().catch(() => {}); audioContextRef.current = null; }
        analyserRef.current = null;

        if (blob.size < 1000) {
            setErrorMessage('No audio was captured. Please try recording again.');
            return;
        }

        setIsProcessing(true);
        setProcessingStage('transcribing');

        try {
            const base64 = await blobToBase64(blob);
            const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm';
            const transcript = await transcribeAudio(base64, mimeType, `recording.${ext}`);

            if (!transcript || !transcript.trim()) {
                setIsProcessing(false);
                setErrorMessage('Could not detect any speech in the recording.');
                return;
            }

            setProcessingStage('synthesizing');

            let title = `Live Session ${new Date().toLocaleDateString()}`;
            if (autoGenerateTitles && transcript.length > 20) {
                title = await generateTitle(transcript);
            }

            // Append pinned timestamps to the source before structuring
            let finalSource = transcript;
            if (pinnedItems.length > 0) {
                finalSource += '\n\nPinned moments at: ' + pinnedItems.map(p => p.time).join(', ');
            }

            const generatedContent = await generateNoteFromTranscript(finalSource, title);

            const newNote: Note = {
                id: Date.now().toString(),
                title,
                date: new Date().toLocaleString(),
                duration: formatTime(duration),
                content: generatedContent,
                transcript,
                type: 'AUDIO',
                tags: ['Live Recording'],
                sourceData: { mimeType, data: base64 },
            };

            setIsProcessing(false);
            onSaveSession(newNote);
        } catch (err: any) {
            console.error('Transcription/synthesis failed:', err);
            setIsProcessing(false);
            setErrorMessage(err.message || 'Failed to process the recording. Please try again.');
        }
    };

    const handlePin = () => {
        setPinnedItems(prev => [...prev, { time: formatTime(duration) }]);
    };

    if (isProcessing) {
        return (
            <main className="flex-1 flex flex-col min-w-0 relative bg-white dark:bg-[#050505]">
                <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white animate-in fade-in duration-200">
                    <div className="w-12 h-12 border-4 border-[var(--theme-color)] border-t-transparent rounded-full animate-spin mb-4"></div>
                    <h2 className="text-xl font-bold font-display">
                        {processingStage === 'transcribing' ? 'Transcribing Audio...' : 'Synthesizing Notes...'}
                    </h2>
                    <p className="text-neutral-400">
                        {processingStage === 'transcribing'
                            ? 'Converting your speech to text with Whisper.'
                            : 'Structuring your session into a study guide.'}
                    </p>
                </div>
            </main>
        );
    }

    return (
        <main className="flex-1 flex flex-col min-w-0 relative bg-white dark:bg-[#050505]">
            <header className="shrink-0 h-16 md:h-20 border-b border-black/5 dark:border-white/10 flex items-center justify-between px-3 md:px-8 bg-white/80 dark:bg-[#050505]/80 backdrop-blur-md z-10 sticky top-0 gap-2">
                <div className="flex flex-col gap-0.5 hidden sm:flex">
                    <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-black/5 dark:bg-white/10 text-slate-600 dark:text-white/60 uppercase tracking-wider border border-black/5 dark:border-white/5">Workspace</span>
                        <span className="w-1 h-1 rounded-full bg-neutral-400 dark:bg-neutral-600"></span>
                        <span className="text-xs text-[var(--theme-color)] uppercase font-bold tracking-wider">Active Record</span>
                    </div>
                    <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white font-display">Live Session</h1>
                </div>

                <div className="flex items-center justify-center flex-1 sm:flex-none sm:absolute sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2">
                    <div className="flex items-center gap-2 bg-neutral-100 dark:bg-[#111] px-4 md:px-5 py-1.5 md:py-2.5 rounded-full border border-black/5 dark:border-white/10 shadow-xl">
                        <div className={`w-2 h-2 rounded-full bg-[var(--theme-color)] ${isRecording ? 'animate-pulse shadow-[0_0_8px_var(--theme-color)]' : ''}`}></div>
                        <span className="font-mono text-sm md:text-lg font-medium tracking-widest text-slate-900 dark:text-white">{formatTime(duration)}</span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {!isRecording ? (
                        <button onClick={startRecording} className="h-9 px-4 rounded-full bg-[var(--theme-color)] hover:brightness-110 text-black text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-[0_0_15px_-3px_rgba(var(--theme-rgb),0.3)] hover:shadow-[0_0_20px_-3px_rgba(var(--theme-rgb),0.5)]">
                            <span className="material-symbols-outlined text-[18px]">mic</span>
                            <span className="hidden md:inline">Start</span>
                        </button>
                    ) : (
                        <button onClick={stopRecording} className="h-9 px-4 rounded-full bg-black/5 dark:bg-white/5 hover:bg-green-500/10 hover:text-green-600 dark:hover:text-green-400 hover:border-green-500/20 border border-black/10 dark:border-white/10 text-neutral-500 dark:text-neutral-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all">
                            <span className="material-symbols-outlined text-[18px]">stop_circle</span>
                            <span className="hidden md:inline">Finish</span>
                        </button>
                    )}
                    <button onClick={onCancel} className="h-9 w-9 rounded-full bg-black/5 dark:bg-white/5 hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 border border-black/10 dark:border-white/10 flex items-center justify-center text-neutral-500 dark:text-neutral-400 transition-colors">
                        <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                </div>
            </header>

            {errorMessage && (
                <div className="bg-red-500/20 border-b border-red-500/20 p-2 text-center text-red-600 dark:text-red-200 text-sm font-bold flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-lg">error</span>
                    {errorMessage}
                </div>
            )}

            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                {/* Center: Recording stage */}
                <div className="flex-1 flex flex-col min-w-0 border-b lg:border-b-0 lg:border-r border-black/5 dark:border-white/5 relative">
                    <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12 bg-white dark:bg-[#050505] relative custom-scrollbar flex flex-col items-center justify-center">
                        <div className="flex flex-col items-center justify-center text-center text-slate-900 dark:text-white max-w-md">
                            <div className={`w-28 h-28 rounded-full flex items-center justify-center mb-6 transition-all ${isRecording ? 'bg-[var(--theme-color)]/15 shadow-[0_0_40px_-5px_var(--theme-color)]' : 'bg-black/5 dark:bg-white/5'}`}>
                                <span className={`material-symbols-outlined text-6xl ${isRecording ? 'text-[var(--theme-color)] animate-pulse' : 'opacity-40'}`}>
                                    {isRecording ? 'graphic_eq' : 'mic_none'}
                                </span>
                            </div>
                            {isRecording ? (
                                <>
                                    <p className="text-xl font-display font-bold">Recording in progress</p>
                                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
                                        Speak naturally. Your audio is transcribed with Whisper and structured into notes when you finish.
                                    </p>
                                    <div className="mt-6 flex items-center gap-2 text-[var(--theme-color)]">
                                        <span className="material-symbols-outlined">hearing</span>
                                        <span className="text-sm font-bold">Capturing audio…</span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <p className="text-xl font-display font-bold">Ready to record</p>
                                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
                                        Press <b>Start</b> to capture a lecture, meeting, or voice memo. We'll transcribe it and generate a structured study guide automatically.
                                    </p>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="h-32 bg-white dark:bg-[#050505] border-t border-black/5 dark:border-white/5 flex items-center px-4 md:px-8 relative z-20">
                        <AudioVisualizer isActive={isRecording} analyser={analyserRef.current} />
                    </div>
                </div>

                {/* Right: Pinned moments */}
                <div className="w-full lg:w-80 bg-neutral-50 dark:bg-[#0a0a0a] border-l border-black/5 dark:border-white/5 flex-col hidden lg:flex">
                    <div className="h-12 flex items-center px-4 border-b border-black/5 dark:border-white/5 bg-neutral-100 dark:bg-[#111]">
                        <span className="material-symbols-outlined text-neutral-500 text-sm mr-2">push_pin</span>
                        <span className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Pinned Moments</span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                        {pinnedItems.length === 0 ? (
                            <div className="text-center mt-10 opacity-30">
                                <p className="text-xs text-slate-900 dark:text-white">Tap "Pin Moment" to mark key timestamps.</p>
                            </div>
                        ) : (
                            pinnedItems.map((item, idx) => (
                                <div key={idx} className="bg-white dark:bg-[#1a1a1a] border border-black/5 dark:border-white/5 p-3 rounded-lg text-sm flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-300 shadow-sm dark:shadow-none">
                                    <span className="material-symbols-outlined text-[var(--theme-color)] text-base">bookmark</span>
                                    <span className="text-[var(--theme-color)] text-xs font-mono">{item.time}</span>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-4 border-t border-black/5 dark:border-white/5 bg-neutral-100 dark:bg-[#111]">
                        <button
                            onClick={handlePin}
                            disabled={!isRecording}
                            className="w-full h-10 bg-white dark:bg-white/5 hover:bg-[var(--theme-color)] hover:text-black text-slate-900 dark:text-white border border-black/10 dark:border-white/10 rounded-lg flex items-center justify-center gap-2 font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-[0_0_15px_-3px_rgba(var(--theme-rgb),0.3)]"
                        >
                            <span className="material-symbols-outlined text-lg">push_pin</span>
                            Pin Moment
                        </button>
                    </div>
                </div>
            </div>
        </main>
    );
};

export default RecorderView;
