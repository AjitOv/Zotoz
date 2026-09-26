import React, { useState, useRef, useEffect } from 'react';
import {
  Video,
  Mic,
  Upload,
  FileText,
  Sparkles,
  CheckCircle2,
  Clock,
  AlertCircle,
  Play,
  Square,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  HelpCircle,
  FileUp,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { createTrainingDraft, processTrainingMedia } from '../services/api';
import { NavigationTab } from '../components/layout/Sidebar';

interface CreateTrainingProps {
  onNavigate: (tab: NavigationTab) => void;
  onTrainingCreated: (trainingId: string) => void;
}

type CaptureMode = 'manual' | 'record_video' | 'record_voice' | 'upload_file';

const SAMPLE_APEX_DISPATCH_TRANSCRIPT = `1. Check the printed picking slip against the item SKU code, quantity, and customer name on the order portal.
2. Select the correct heavy-duty 5-ply corrugated carton box matching the volume of ordered office & business supplies.
3. Wrap all fragile products (toner cartridges, glass dispensers, desk organizers) with two layers of 10mm bubble wrap and tape edges.
4. Fill all remaining carton void space with recyclable kraft paper cushion to prevent movement during transit.
5. Seal the top and bottom center seams and box edges with Apex Supplies branded tamper-evident reinforced security tape in an 'H' pattern.
6. Affix the printed GST Tax Invoice and barcode shipping label on the flat top surface without covering the barcodes with tape.
7. Weigh the packed parcel on the digital platform scale, log the weight in the dispatch register, and move the parcel to the Delhivery/BlueDart carrier dispatch pallet.`;

const SAMPLE_UPI_RECONCILIATION_TRANSCRIPT = `1. At 10 PM, lock the main cash drawer to secure physical contents.
2. Open the Pine Labs POS terminal and print the daily UPI settlement report slip.
3. Compare the total settlement amount on the slip with the POS screen.
4. Count physical cash in bundles of 500, 200, 100, 50, and 20 rupee notes and log in register.
5. If there is a discrepancy over 50 rupees, immediately call Vikram on WhatsApp.
6. Deposit cash into the drop safe and send a photo of the settlement slip to the manager WhatsApp group.`;

export const CreateTraining: React.FC<CreateTrainingProps> = ({
  onNavigate,
  onTrainingCreated,
}) => {
  const { showNotification, geminiConfigured, geminiModel } = useApp();

  // Wizard steps
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [captureMode, setCaptureMode] = useState<CaptureMode>('manual');

  // Input states
  const [manualTranscript, setManualTranscript] = useState(SAMPLE_APEX_DISPATCH_TRANSCRIPT);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);

  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerIntervalRef = useRef<any>(null);

  // Metadata form
  const [title, setTitle] = useState('Outward Goods Packaging & Dispatch Procedure');
  const [department, setDepartment] = useState('Warehouse & Logistics');
  const [targetRole, setTargetRole] = useState('Packaging & Dispatch Associate');
  const [language, setLanguage] = useState('English');
  const [difficulty, setDifficulty] = useState('Beginner');
  const [additionalContext, setAdditionalContext] = useState(
    'Apex Supplies warehouse standards: Always double-tape boxes weighing over 5kg. Fragile ink toners must be kept upright.'
  );

  // Stage progress during AI processing
  const [processingStage, setProcessingStage] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [createdTrainingId, setCreatedTrainingId] = useState<string | null>(null);
  const [processingError, setProcessingError] = useState<string | null>(null);

  const processingStages = [
    'Reading input evidence & recording audio/video...',
    'Understanding operational flow & safety rules...',
    'Identifying sequential numbered steps & outcomes...',
    'Synthesizing SOP with owner verification flags...',
    'Generating 5-question knowledge check quiz...',
    'Preparing multilingual training package...',
  ];

  // Clean up media on unmount
  useEffect(() => {
    return () => {
      if (mediaStream) {
        mediaStream.getTracks().forEach((t) => t.stop());
      }
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [mediaStream]);

  // Video preview attachment
  useEffect(() => {
    if (videoPreviewRef.current && mediaStream) {
      videoPreviewRef.current.srcObject = mediaStream;
    }
  }, [mediaStream]);

  // Media recording handlers
  const startRecording = async (video: boolean) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: video,
        audio: true,
      });
      setMediaStream(stream);
      setIsRecording(true);
      setRecordingDuration(0);
      setRecordedBlob(null);
      setRecordedVideoUrl(null);

      const chunks: BlobPart[] = [];
      const mimeType = video ? 'video/webm' : 'audio/webm';
      const recorder = new MediaRecorder(stream);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setRecordedVideoUrl(url);
        stream.getTracks().forEach((t) => t.stop());
        setMediaStream(null);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;

      timerIntervalRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Recording error:', err);
      showNotification(`Camera/Mic permission needed: ${err.message}`, 'error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      showNotification('Recording finished! Preview ready.', 'success');
    }
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        showNotification('File size exceeds 50MB limit.', 'error');
        return;
      }
      setUploadedFile(file);
      showNotification(`Selected ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`, 'success');
    }
  };

  // Launch AI Pipeline
  const handleStartAIProcessing = async () => {
    setCurrentStep(3);
    setIsProcessing(true);
    setProcessingError(null);
    setProcessingStage(0);

    try {
      // 1. Create Training Draft Record
      const draft = await createTrainingDraft({
        title,
        department,
        target_role: targetRole,
        source_language: language,
      });
      setCreatedTrainingId(draft.id);

      // Advance animation stages sequentially to match real backend processing
      const interval = setInterval(() => {
        setProcessingStage((prev) => {
          if (prev < processingStages.length - 2) return prev + 1;
          return prev;
        });
      }, 900);

      // 2. Prepare Form Data
      const formData = new FormData();
      formData.append('title', title);
      formData.append('department', department);
      formData.append('targetRole', targetRole);
      formData.append('language', language);
      formData.append('additionalContext', additionalContext);

      if (manualTranscript) {
        formData.append('transcript', manualTranscript);
      }

      if (recordedBlob) {
        const fileExt = captureMode === 'record_video' ? 'webm' : 'weba';
        formData.append('mediaFile', recordedBlob, `recording.${fileExt}`);
      } else if (uploadedFile) {
        formData.append('mediaFile', uploadedFile);
      }

      // 3. Process with Backend & Gemini
      const result = await processTrainingMedia(draft.id, formData);
      clearInterval(interval);
      setProcessingStage(processingStages.length - 1);

      showNotification('SOP and knowledge check quiz generated successfully!', 'success');
      setTimeout(() => {
        setIsProcessing(false);
        onTrainingCreated(draft.id);
        onNavigate('library');
      }, 1200);
    } catch (err: any) {
      console.error('Processing error:', err);
      setIsProcessing(false);
      setProcessingError(err.message || 'Error occurred while generating SOP.');
      showNotification(err.message || 'Processing failed', 'error');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Wizard Step Indicator */}
      <div className="p-4 rounded-xl bg-[#182337] border border-[#2A3C5B] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
              currentStep === 1
                ? 'bg-[#B8F34A] text-[#0B1220]'
                : currentStep > 1
                ? 'bg-emerald-500 text-white'
                : 'bg-[#0B1220] text-[#9CAFC8]'
            }`}
          >
            {currentStep > 1 ? <CheckCircle2 className="w-4 h-4" /> : '1'}
          </div>
          <span className={`text-xs font-semibold ${currentStep === 1 ? 'text-white' : 'text-[#9CAFC8]'}`}>
            Capture Process
          </span>
        </div>

        <div className="w-12 h-0.5 bg-[#2A3C5B]" />

        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
              currentStep === 2
                ? 'bg-[#B8F34A] text-[#0B1220]'
                : currentStep > 2
                ? 'bg-emerald-500 text-white'
                : 'bg-[#0B1220] text-[#9CAFC8]'
            }`}
          >
            {currentStep > 2 ? <CheckCircle2 className="w-4 h-4" /> : '2'}
          </div>
          <span className={`text-xs font-semibold ${currentStep === 2 ? 'text-white' : 'text-[#9CAFC8]'}`}>
            Training Details
          </span>
        </div>

        <div className="w-12 h-0.5 bg-[#2A3C5B]" />

        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
              currentStep === 3
                ? 'bg-[#B8F34A] text-[#0B1220]'
                : 'bg-[#0B1220] text-[#9CAFC8]'
            }`}
          >
            3
          </div>
          <span className={`text-xs font-semibold ${currentStep === 3 ? 'text-white' : 'text-[#9CAFC8]'}`}>
            AI SOP Generation
          </span>
        </div>
      </div>

      {/* STEP 1: CAPTURE EVIDENCE */}
      {currentStep === 1 && (
        <div className="space-y-5">
          <div className="p-6 rounded-2xl bg-[#182337] border border-[#2A3C5B] space-y-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#B8F34A]" />
                Select Knowledge Capture Method
              </h2>
              <p className="text-xs text-[#9CAFC8]">
                Record a quick video on your phone/laptop, speak instructions, or paste existing notes.
              </p>
            </div>

            {/* Mode selection tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setCaptureMode('manual');
                  if (mediaStream) stopRecording();
                }}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  captureMode === 'manual'
                    ? 'bg-[#0B1220] border-[#B8F34A] text-white'
                    : 'bg-[#10192A] border-[#2A3C5B] text-[#9CAFC8] hover:border-[#3D557F]'
                }`}
              >
                <FileText
                  className={`w-5 h-5 mb-2 ${
                    captureMode === 'manual' ? 'text-[#B8F34A]' : 'text-[#9CAFC8]'
                  }`}
                />
                <div>
                  <div className="font-bold text-xs">Text & Transcript</div>
                  <div className="text-[10px] text-[#9CAFC8]">Type or paste notes</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCaptureMode('record_video');
                  if (mediaStream) stopRecording();
                }}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  captureMode === 'record_video'
                    ? 'bg-[#0B1220] border-[#B8F34A] text-white'
                    : 'bg-[#10192A] border-[#2A3C5B] text-[#9CAFC8] hover:border-[#3D557F]'
                }`}
              >
                <Video
                  className={`w-5 h-5 mb-2 ${
                    captureMode === 'record_video' ? 'text-[#B8F34A]' : 'text-[#9CAFC8]'
                  }`}
                />
                <div>
                  <div className="font-bold text-xs">Record Video</div>
                  <div className="text-[10px] text-[#9CAFC8]">Browser camera</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCaptureMode('record_voice');
                  if (mediaStream) stopRecording();
                }}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  captureMode === 'record_voice'
                    ? 'bg-[#0B1220] border-[#B8F34A] text-white'
                    : 'bg-[#10192A] border-[#2A3C5B] text-[#9CAFC8] hover:border-[#3D557F]'
                }`}
              >
                <Mic
                  className={`w-5 h-5 mb-2 ${
                    captureMode === 'record_voice' ? 'text-[#B8F34A]' : 'text-[#9CAFC8]'
                  }`}
                />
                <div>
                  <div className="font-bold text-xs">Voice Memo</div>
                  <div className="text-[10px] text-[#9CAFC8]">Speak instructions</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCaptureMode('upload_file');
                  if (mediaStream) stopRecording();
                }}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                  captureMode === 'upload_file'
                    ? 'bg-[#0B1220] border-[#B8F34A] text-white'
                    : 'bg-[#10192A] border-[#2A3C5B] text-[#9CAFC8] hover:border-[#3D557F]'
                }`}
              >
                <Upload
                  className={`w-5 h-5 mb-2 ${
                    captureMode === 'upload_file' ? 'text-[#B8F34A]' : 'text-[#9CAFC8]'
                  }`}
                />
                <div>
                  <div className="font-bold text-xs">Upload File</div>
                  <div className="text-[10px] text-[#9CAFC8]">MP4, WebM, MP3</div>
                </div>
              </button>
            </div>

            {/* Mode 1: Manual / Paste Transcript */}
            {captureMode === 'manual' && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#9CAFC8]">
                    Enter or paste process instructions:
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setManualTranscript(SAMPLE_APEX_DISPATCH_TRANSCRIPT);
                        setTitle('Outward Goods Packaging & Dispatch Procedure');
                        setDepartment('Warehouse & Logistics');
                        setTargetRole('Packaging & Dispatch Associate');
                        showNotification('Apex Supplies dispatch procedure loaded!', 'info');
                      }}
                      className="text-xs text-[#B8F34A] hover:underline flex items-center gap-1 font-medium"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Apex Dispatch Template</span>
                    </button>
                    <span className="text-[#2A3C5B]">|</span>
                    <button
                      type="button"
                      onClick={() => {
                        setManualTranscript(SAMPLE_UPI_RECONCILIATION_TRANSCRIPT);
                        setTitle('Daily UPI & Cash Register Reconciliation');
                        setDepartment('Billing & Accounts');
                        setTargetRole('Cashier / Front Desk');
                        showNotification('UPI & Cash register procedure loaded!', 'info');
                      }}
                      className="text-xs text-[#9CAFC8] hover:text-white hover:underline flex items-center gap-1 font-medium"
                    >
                      <span>UPI Reconciliation</span>
                    </button>
                  </div>
                </div>
                <textarea
                  rows={8}
                  value={manualTranscript}
                  onChange={(e) => setManualTranscript(e.target.value)}
                  placeholder="Paste instructions, transcripts, or numbered steps here..."
                  className="w-full p-3.5 rounded-xl bg-[#0B1220] border border-[#2A3C5B] text-white font-mono text-xs focus:border-[#B8F34A] focus:outline-none"
                />
              </div>
            )}

            {/* Mode 2: Record Video */}
            {captureMode === 'record_video' && (
              <div className="space-y-4 pt-2">
                <div className="relative aspect-video rounded-xl bg-[#0B1220] border border-[#2A3C5B] overflow-hidden flex items-center justify-center">
                  {isRecording && (
                    <video
                      ref={videoPreviewRef}
                      autoPlay
                      muted
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  )}

                  {!isRecording && recordedVideoUrl && (
                    <video
                      src={recordedVideoUrl}
                      controls
                      className="w-full h-full object-contain"
                    />
                  )}

                  {!isRecording && !recordedVideoUrl && (
                    <div className="text-center p-6 space-y-2">
                      <Video className="w-12 h-12 text-[#9CAFC8] mx-auto opacity-50" />
                      <p className="text-xs text-[#9CAFC8]">
                        Click Start Recording to demonstrate the procedure in front of your camera.
                      </p>
                    </div>
                  )}

                  {isRecording && (
                    <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-500/80 backdrop-blur-sm text-white text-xs font-bold animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-white" />
                      <span>REC {formatSeconds(recordingDuration)}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-center gap-3">
                  {!isRecording ? (
                    <button
                      type="button"
                      onClick={() => startRecording(true)}
                      className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg transition-all"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      <span>Start Camera Recording</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#0B1220] font-bold text-xs flex items-center gap-2 shadow-lg transition-all"
                    >
                      <Square className="w-4 h-4 fill-current" />
                      <span>Stop & Save Recording</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Mode 3: Record Voice */}
            {captureMode === 'record_voice' && (
              <div className="p-8 rounded-xl bg-[#0B1220] border border-[#2A3C5B] text-center space-y-4">
                <div
                  className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center transition-all ${
                    isRecording
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500 animate-recording-pulse'
                      : 'bg-[#182337] text-[#B8F34A] border border-[#2A3C5B]'
                  }`}
                >
                  <Mic className="w-8 h-8" />
                </div>

                <div>
                  <h3 className="font-bold text-white text-sm">
                    {isRecording ? `Recording Voice (${formatSeconds(recordingDuration)})` : 'Voice-First Knowledge Capture'}
                  </h3>
                  <p className="text-xs text-[#9CAFC8] max-w-sm mx-auto mt-1">
                    Speak naturally in English, Hindi, Marathi, etc. Explain each step clearly as if training a new staff member.
                  </p>
                </div>

                <div className="pt-2">
                  {!isRecording ? (
                    <button
                      type="button"
                      onClick={() => startRecording(false)}
                      className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-2 mx-auto shadow-lg"
                    >
                      <Mic className="w-4 h-4" />
                      <span>Start Microphone Recording</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#0B1220] font-bold text-xs flex items-center gap-2 mx-auto shadow-lg"
                    >
                      <Square className="w-4 h-4 fill-current" />
                      <span>Stop Recording</span>
                    </button>
                  )}
                </div>

                {recordedBlob && !isRecording && (
                  <div className="p-3 rounded-lg bg-[#182337] border border-[#2A3C5B] text-xs text-emerald-400 flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Voice audio captured ({formatSeconds(recordingDuration)}). Ready for AI.</span>
                  </div>
                )}
              </div>
            )}

            {/* Mode 4: Upload File */}
            {captureMode === 'upload_file' && (
              <div className="p-8 rounded-xl bg-[#0B1220] border-2 border-dashed border-[#2A3C5B] hover:border-[#B8F34A] transition-colors text-center space-y-4">
                <FileUp className="w-12 h-12 text-[#9CAFC8] mx-auto opacity-70" />
                <div>
                  <label
                    htmlFor="file-upload"
                    className="cursor-pointer text-sm font-bold text-[#B8F34A] hover:underline"
                  >
                    Click to upload media file
                  </label>
                  <p className="text-xs text-[#9CAFC8] mt-1">
                    Supports MP4, WebM video or MP3, M4A, WAV audio (Max 50MB)
                  </p>
                </div>
                <input
                  id="file-upload"
                  type="file"
                  accept="video/*,audio/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                {uploadedFile && (
                  <div className="p-3 rounded-lg bg-[#182337] border border-[#2A3C5B] text-xs text-emerald-400 flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      Selected: <strong>{uploadedFile.name}</strong> ({(uploadedFile.size / 1024 / 1024).toFixed(1)}MB)
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom navigation */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                if (
                  captureMode === 'manual' &&
                  (!manualTranscript || !manualTranscript.trim())
                ) {
                  showNotification('Please enter or paste instructions first.', 'error');
                  return;
                }
                setCurrentStep(2);
              }}
              className="px-6 py-3 rounded-xl bg-[#B8F34A] hover:bg-[#A4DC3D] text-[#0B1220] font-bold text-xs flex items-center gap-2 shadow-glow-lime transition-all"
            >
              <span>Next: Add Training Details</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: METADATA & CONTEXT */}
      {currentStep === 2 && (
        <div className="space-y-5">
          <div className="p-6 rounded-2xl bg-[#182337] border border-[#2A3C5B] space-y-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#B8F34A]" />
                Training Details & Frontline Context
              </h2>
              <p className="text-xs text-[#9CAFC8]">
                Provide metadata so Gemini structures the SOP specifically for this operational role.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#9CAFC8] mb-1">
                  Training Module Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#0B1220] border border-[#2A3C5B] text-white focus:border-[#B8F34A] focus:outline-none text-xs"
                  placeholder="e.g. Cappuccino Preparation Procedure"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#9CAFC8] mb-1">
                  Department *
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#0B1220] border border-[#2A3C5B] text-white focus:border-[#B8F34A] focus:outline-none text-xs"
                >
                  <option>Beverage & Barista</option>
                  <option>Kitchen & Food Prep</option>
                  <option>Cash Counter & Billing</option>
                  <option>Guest Service & Tables</option>
                  <option>Sanitization & Hygiene</option>
                  <option>Opening & Closing Routine</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#9CAFC8] mb-1">
                  Target Employee Role *
                </label>
                <input
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#0B1220] border border-[#2A3C5B] text-white focus:border-[#B8F34A] focus:outline-none text-xs"
                  placeholder="e.g. Frontline Barista"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#9CAFC8] mb-1">
                  Source Training Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#0B1220] border border-[#2A3C5B] text-white focus:border-[#B8F34A] focus:outline-none text-xs"
                >
                  <option>English</option>
                  <option>Hindi</option>
                  <option>Marathi</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#9CAFC8] mb-1">
                  Difficulty Level
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#0B1220] border border-[#2A3C5B] text-white focus:border-[#B8F34A] focus:outline-none text-xs"
                >
                  <option>Beginner (Induction)</option>
                  <option>Intermediate (Regular shift)</option>
                  <option>Advanced (Specialist / Lead)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#9CAFC8] mb-1">
                  Owner Notes / Critical Safety Rules / Equipment Warnings
                </label>
                <textarea
                  rows={3}
                  value={additionalContext}
                  onChange={(e) => setAdditionalContext(e.target.value)}
                  placeholder="e.g. Machine group heads are hot (93°C). Never heat milk above 70°C. Steam wand burns skin immediately."
                  className="w-full p-3 rounded-lg bg-[#0B1220] border border-[#2A3C5B] text-white focus:border-[#B8F34A] focus:outline-none text-xs"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-[#9CAFC8] hover:text-white"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleStartAIProcessing}
              className="px-6 py-3 rounded-xl bg-[#B8F34A] hover:bg-[#A4DC3D] text-[#0B1220] font-bold text-xs flex items-center gap-2 shadow-glow-lime transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate AI SOP & Quiz</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: SEQUENTIAL REAL-TIME AI PIPELINE */}
      {currentStep === 3 && (
        <div className="p-8 rounded-2xl bg-[#182337] border border-[#2A3C5B] space-y-6 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-[#182337] to-[#253757] border border-[#B8F34A]/50 flex items-center justify-center shadow-glow-lime">
            <Sparkles className="w-8 h-8 text-[#B8F34A] animate-spin" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-white">
              Gemini AI is Structuring Your SOP
            </h2>
            <p className="text-xs text-[#9CAFC8] mt-1">
              Converting raw voice & demonstration into a compliant, quiz-ready standard operating procedure.
            </p>
          </div>

          {/* Sequential Stages Progress */}
          <div className="max-w-md mx-auto space-y-2 text-left pt-2">
            {processingStages.map((stageText, idx) => {
              const isPast = processingStage > idx;
              const isCurrent = processingStage === idx;

              return (
                <div
                  key={idx}
                  className={`p-3 rounded-lg flex items-center justify-between text-xs transition-all ${
                    isPast
                      ? 'bg-[#0B1220] border border-emerald-500/30 text-emerald-400'
                      : isCurrent
                      ? 'bg-[#1E2D47] border border-[#B8F34A] text-white shadow-sm'
                      : 'bg-[#0B1220]/40 border border-transparent text-[#8496B0]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {isPast ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : isCurrent ? (
                      <RefreshCw className="w-4 h-4 text-[#B8F34A] animate-spin shrink-0" />
                    ) : (
                      <span className="w-4 h-4 rounded-full border border-[#2A3C5B] flex items-center justify-center text-[10px]">
                        {idx + 1}
                      </span>
                    )}
                    <span>{stageText}</span>
                  </div>

                  {isPast && <span className="text-[10px] font-bold uppercase">Done</span>}
                  {isCurrent && <span className="text-[10px] font-bold text-[#B8F34A]">Active</span>}
                </div>
              );
            })}
          </div>

          {processingError && (
            <div className="p-4 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs text-left">
              <p className="font-bold flex items-center gap-1.5 mb-1">
                <AlertCircle className="w-4 h-4" />
                Processing Notice:
              </p>
              <p>{processingError}</p>
              <button
                type="button"
                onClick={handleStartAIProcessing}
                className="mt-3 px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
              >
                Retry Processing
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
