import { useCallback, useEffect, useRef, useState } from "react";

export type UseAudioRecorderOptions = {
  mimeType?: string;
  maxDurationMs?: number;
  echoPlayback?: boolean;
  deviceId?: string; // preferred input device id
  onData?: (chunk: BlobPart) => void;
  onStop?: (blob: Blob) => Promise<void> | void;
};

export function useAudioRecorder(opts: UseAudioRecorderOptions = {}) {
  const { mimeType, maxDurationMs, echoPlayback = false, onData, onStop } = opts;
  const preferredDeviceId = (opts && (opts as any).deviceId) as string | undefined;

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const pendingStopResolveRef = useRef<((b: Blob | null) => void) | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [decodedDuration, setDecodedDuration] = useState<number | null>(null);
  const [signalLevelDb, setSignalLevelDb] = useState<number | null>(null);
  const [isSilent, setIsSilent] = useState<boolean>(false);
  const [inputDevices, setInputDevices] = useState<MediaDeviceInfo[] | null>(null);
  const [isRecordingEmpty, setIsRecordingEmpty] = useState<boolean>(false);

  const checkIfAudioIsSilent = async (blob: Blob) => {
    const arrayBuffer = await blob.arrayBuffer();
    const audioContext = new AudioContext();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    const rawData = audioBuffer.getChannelData(0); // first channel
    const rms = Math.sqrt(rawData.reduce((sum, sample) => sum + sample * sample, 0) / rawData.length);

    console.log("Average volume (RMS):", rms);

    if (rms < 0.01) {
      console.warn("⚠️ Recording contains only silence.");
      return true;
    } else {
      console.log("✅ Audio contains sound.");
      return false;
    }
  }

  const chooseMime = useCallback(() => {
    try {
      const isSupported = (MediaRecorder as any).isTypeSupported;
      if (mimeType && isSupported?.(mimeType)) return mimeType;
      // Add Safari-friendly fallbacks (mp4/m4a) after common browser types
      const candidates = ["audio/webm", "audio/ogg;codecs=opus", "audio/wav", "audio/mpeg", "audio/mp4", "audio/x-m4a"];
      return candidates.find((c) => isSupported?.(c)) || "";
    } catch (e) {
      return "";
    }
  }, [mimeType]);

  const start = useCallback(async () => {
    if (isRecording) return;
    setError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("getUserMedia not supported");
      // choose constraints, honoring preferredDeviceId when provided
      const constraints: any = preferredDeviceId ? { audio: { deviceId: { exact: preferredDeviceId } } } : { audio: true };
      console.log("Requesting getUserMedia with constraints:", constraints);
      const s = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = s;
      setMediaStream(s);

      // Log track info for diagnostics (helpful for Chrome vs Firefox differences)
      try {
        const t = s.getAudioTracks()[0];
        if (t) {
          console.log("Audio track ready:", { label: t.label, enabled: t.enabled, muted: t.muted });
          try { console.log("Track settings:", t.getSettings()); } catch (e) { /**/ }
          try { console.log("Track constraints:", t.getConstraints()); } catch (e) { /**/ }
          try { console.log("Track capabilities:", (t as any).getCapabilities ? (t as any).getCapabilities() : undefined); } catch (e) { /**/ }
        }
      } catch (e) {
        console.debug("Could not log audio track diagnostics:", e);
      }

      // refresh device list for consumer UI
      try {
        const list = await navigator.mediaDevices.enumerateDevices();
        const inputs = list.filter((d) => d.kind === 'audioinput');
        setInputDevices(inputs);
      } catch (e) {
        console.debug('Could not enumerate devices', e);
      }

      const chosen = chooseMime();
      const mrec = new MediaRecorder(s, chosen ? { mimeType: chosen } : undefined);

      mrec.ondataavailable = (ev: BlobEvent) => {
        if (ev.data && ev.data.size > 0) {
          chunksRef.current.push(ev.data);
          onData?.(ev.data);
        }
      };

      mrec.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: chosen || "audio/webm" });
        chunksRef.current = [];

        console.log(`🎙️ Recorded size: ${blob.size} bytes`);
        if (blob.size < 1000) {
          setIsRecordingEmpty(true);
          console.warn("⚠️ Recording is empty or too short.");
        } else {
          console.log("✅ Recording contains data.");
        }

        const url = URL.createObjectURL(blob);
        // expose URL for UI playback controls and diagnostics
        try { setBlobUrl(url); } catch (e) { /**/ }

        // diagnostics: log blob size and attempt to decode to measure actual audio duration
        try {
          console.log("Recorded audio blob:", blob);
          const now = typeof performance !== "undefined" ? performance.now() : Date.now();
          const durationMs = startTimeRef.current ? Math.max(0, now - startTimeRef.current) : undefined;
          if (typeof durationMs !== "undefined") console.log("Approx duration (ms):", durationMs);

          // try to decode with AudioContext to get accurate duration
          if (typeof window !== "undefined" && (window.AudioContext || (window as any).webkitAudioContext)) {
            try {
              const arrayBuffer = await blob.arrayBuffer();
              const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
              const audioCtx = new AudioCtx();
              const decoded = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
              console.log("Decoded audio duration (s):", decoded.duration);
              try { setDecodedDuration(decoded.duration); } catch (e) { /**/ }

              // compute RMS level from the first channel to detect silence
              try {
                if (decoded.numberOfChannels > 0) {
                  const ch = decoded.getChannelData(0);
                  let sumSq = 0;
                  for (let i = 0; i < ch.length; i++) {
                    const v = ch[i];
                    sumSq += v * v;
                  }
                  const rms = Math.sqrt(sumSq / ch.length) || 0;
                  const db = rms > 0 ? 20 * Math.log10(rms) : -Infinity;
                  console.log("Decoded audio RMS:", rms, "dB:", db);
                  try { setSignalLevelDb(Number.isFinite(db) ? db : null); } catch (e) { /**/ }
                  // consider recordings with RMS below -70 dB as silent (adjustable)
                  const silent = !Number.isFinite(db) || db < -70;
                  try { setIsSilent(silent); } catch (e) { /**/ }
                  if (silent) console.warn("Recording appears silent (low RMS) — this may be a microphone/config issue, especially on Chrome.");
                }
              } catch (rmsErr) {
                console.debug("Could not compute RMS from decoded buffer:", rmsErr);
              }

              try { audioCtx.close && audioCtx.close(); } catch (e) { /**/ }
              if ((durationMs && durationMs < 100) || decoded.duration < 0.05) {
                console.warn("Recorded audio looks too short — this often means start/stop were too close together or microphone permissions prevented capture.");
              }
            } catch (decodeErr) {
              console.debug("Could not decode audio blob for diagnostics:", decodeErr);
            }
          }
        } catch (diagErr) {
          console.debug("Error during recording diagnostics:", diagErr);
        }

        // cleanup media resources (stop tracks and clear refs)
        try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch (e) { /**/ }
        streamRef.current = null;
        try { setMediaStream(null); } catch (e) { /**/ }
        recorderRef.current = null;

        try { await onStop?.(blob); } catch (e) { console.error(e); }

        // resolve any pending stop() promise
        try {
          if (pendingStopResolveRef.current) {
            pendingStopResolveRef.current(blob);
            pendingStopResolveRef.current = null;
          }
        } catch (e) { /**/ }

        setIsRecording(false);
      };

      recorderRef.current = mrec;
      mrec.start();

      let silenceStart: number | null = null;
      let silenceThreshold: number = 0.01; // Adjust this threshold as needed
      let silenceDuration: number = 2000;  // ms of continuous silence before triggering
      let isSilent: boolean = false;
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(s);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 2048;
      source.connect(analyser);


      function detectSilence() {
        const dataArray = new Float32Array(analyser.fftSize);
        const check = () => {
          analyser.getFloatTimeDomainData(dataArray);
          const rms = Math.sqrt(dataArray.reduce((sum, v) => sum + v * v, 0) / dataArray.length);

          if (rms < silenceThreshold) {
            if (!silenceStart) silenceStart = performance.now();
            else if (performance.now() - silenceStart > silenceDuration && !isSilent) {
              isSilent = true;
              if (mrec.state === "recording") {
                mrec.pause();
                console.log("⏸️ Paused due to silence");
              }
            }
          } else {
            silenceStart = null;
            if (isSilent) {
              isSilent = false;
              if (mrec.state === "paused") {
                mrec.resume();
                console.log("▶️ Speech detected — resumed recording");
              }
            }
          }

          requestAnimationFrame(check);
        };
        requestAnimationFrame(check);
      }

      detectSilence();
      try { startTimeRef.current = typeof performance !== 'undefined' ? performance.now() : Date.now(); } catch (e) { startTimeRef.current = Date.now(); }
      setIsRecording(true);

      if (maxDurationMs) {
        timeoutRef.current = window.setTimeout(() => {
          try { recorderRef.current?.stop(); } catch (e) { /**/ }
        }, maxDurationMs) as unknown as number;
      }
    } catch (err: any) {
      setError(err);
      setIsRecording(false);
      throw err;
    }
  }, [chooseMime, echoPlayback, maxDurationMs, onData, onStop, isRecording]);

  const refreshInputDevices = useCallback(async () => {
    try {
      let list = await navigator.mediaDevices.enumerateDevices();
      let inputs = list.filter((d) => d.kind === 'audioinput');

      // If labels are empty (permissions not yet granted) or no devices found,
      // prompt getUserMedia to ask permission and then re-enumerate.
      const needPrompt = inputs.length === 0 || inputs.every((d) => !d.label);
      if (needPrompt) {
        try {
          const s = await navigator.mediaDevices.getUserMedia({ audio: true });
          // stop tracks immediately; we only requested to get device labels
          try { s.getTracks().forEach((t) => t.stop()); } catch (e) { /**/ }
          // re-enumerate
          list = await navigator.mediaDevices.enumerateDevices();
          inputs = list.filter((d) => d.kind === 'audioinput');
        } catch (permErr) {
          console.debug('Permission prompt for microphones failed or was denied', permErr);
        }
      }

      setInputDevices(inputs);
      return inputs;
    } catch (e) {
      console.debug('Could not enumerate devices', e);
      return null;
    }
  }, []);

  const stop = useCallback(async (): Promise<Blob | null> => {
    const r = recorderRef.current;
    if (!r) return null;
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    return new Promise<Blob | null>((resolve) => {
      // store resolver so the start/onstop handler can resolve it
      pendingStopResolveRef.current = resolve;
      try {
        r.stop();
      } catch (e) {
        // if stop failed, clear resolver and resolve null
        pendingStopResolveRef.current = null;
        resolve(null);
      }
    });
  }, [onStop]);

  const toggle = useCallback(async () => (isRecording ? stop() : start()), [isRecording, start, stop]);

  useEffect(() => {
    return () => {
      try { if (recorderRef.current?.state === "recording") recorderRef.current?.stop(); } catch (e) {/**/ }
      try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch (e) {/**/ }
      if (blobUrl) { try { URL.revokeObjectURL(blobUrl); } catch (e) {/**/ } }
    };
  }, [blobUrl]);

  const reset = useCallback(() => { chunksRef.current = []; setBlobUrl(null); setError(null); }, []);

  return { checkIfAudioIsSilent, start, stop, toggle, isRecording, error, mediaStream, blobUrl, decodedDuration, signalLevelDb, isSilent, inputDevices, refreshInputDevices, reset } as const;
}

export default useAudioRecorder;
