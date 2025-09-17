// Generate a robust user fingerprint that's hard to bypass
export const generateFingerprint = (): string => {
  try {
    const components = [];

    // Screen properties
    components.push(screen.width);
    components.push(screen.height);
    components.push(screen.colorDepth);
    components.push(screen.pixelDepth);

    // Timezone
    components.push(Intl.DateTimeFormat().resolvedOptions().timeZone);

    // Language
    components.push(navigator.language);
    components.push(navigator.languages?.join(',') || '');

    // Platform
    components.push(navigator.platform);
    components.push(navigator.userAgent);

    // Hardware concurrency
    components.push(navigator.hardwareConcurrency || 0);

    // Memory (if available)
    components.push((navigator as any).deviceMemory || 0);

    // Canvas fingerprint
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Fingerprint test 🎨', 2, 2);
      components.push(canvas.toDataURL());
    }

    // WebGL fingerprint
    try {
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          components.push(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL));
          components.push(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
        }
      }
    } catch (e) {
      // WebGL not available
    }

    // Audio context fingerprint
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const analyser = audioCtx.createAnalyser();
      const gain = audioCtx.createGain();
      
      oscillator.connect(analyser);
      analyser.connect(gain);
      gain.connect(audioCtx.destination);
      
      oscillator.frequency.value = 1000;
      gain.gain.value = 0;
      
      const buffer = new Float32Array(analyser.frequencyBinCount);
      analyser.getFloatFrequencyData(buffer);
      
      components.push(buffer.slice(0, 10).join(','));
      audioCtx.close();
    } catch (e) {
      // Audio context not available
    }

    // Create fingerprint string
    const fingerprint = components.join('|');
    
    // Create a more robust hash
    let hash = 0;
    if (fingerprint.length === 0) return '0';
    
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return Math.abs(hash).toString(36);
  } catch (error) {
    // Fallback fingerprint
    console.warn('Fingerprinting failed, using fallback');
    return Math.random().toString(36).substring(2, 15);
  }
};

// Get a persistent device ID (combines fingerprint with localStorage)
export const getDeviceId = (): string => {
  const storageKey = 'device_id_v2';
  let deviceId = localStorage.getItem(storageKey);
  
  if (!deviceId) {
    const fingerprint = generateFingerprint();
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    deviceId = `${fingerprint}_${timestamp}_${random}`;
    
    try {
      localStorage.setItem(storageKey, deviceId);
    } catch (e) {
      // localStorage not available
    }
  }
  
  return deviceId;
};