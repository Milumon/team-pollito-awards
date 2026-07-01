// lib/audioConverter.ts

interface LamejsEncoder {
  encodeBuffer(left: Int16Array, right?: Int16Array | null): Int8Array;
  flush(): Int8Array;
}

interface Lamejs {
  Mp3Encoder: new (channels: number, sampleRate: number, kbps: number) => LamejsEncoder;
}

declare global {
  interface Window {
    lamejs?: Lamejs;
    webkitAudioContext?: typeof AudioContext;
  }
}

function loadLamejsScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Audio conversion is only supported in the browser.'));
      return;
    }

    if (window.lamejs) {
      resolve();
      return;
    }

    const existing = document.querySelector('script[src*="lame.min.js"]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', (e) => reject(e));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/lamejs/1.2.1/lame.min.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = (err) => reject(err);
    document.body.appendChild(script);
  });
}

function float32ToInt16(buffer: Float32Array): Int16Array {
  const l = buffer.length;
  const buf = new Int16Array(l);
  for (let i = 0; i < l; i++) {
    const s = Math.max(-1, Math.min(1, buffer[i]));
    buf[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return buf;
}

export async function convertAudioToMp3(
  file: File,
  trimStart?: number,
  trimEnd?: number
): Promise<File> {
  // 1. Asegurar que lamejs está cargado
  await loadLamejsScript();

  if (!window.lamejs) {
    throw new Error('No se pudo cargar la librería del codificador MP3 (lamejs).');
  }

  // 2. Decodificar el audio
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const audioContext = new AudioContextClass();
  const arrayBuffer = await file.arrayBuffer();
  
  let audioBuffer: AudioBuffer;
  try {
    audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  } catch (err) {
    console.error('Error decodificando audio:', err);
    throw new Error('El archivo de audio no pudo ser decodificado por el navegador. Asegurate de que no esté corrupto.');
  } finally {
    void audioContext.close();
  }

  // 3. Calcular límites de tiempo y duración recortada
  const startSec = trimStart !== undefined ? Math.max(0, trimStart) : 0;
  const endSec = trimEnd !== undefined ? Math.min(audioBuffer.duration, trimEnd) : audioBuffer.duration;
  const trimmedDuration = endSec - startSec;

  // Validar duración del recorte (máximo 30 segundos)
  if (trimmedDuration > 30) {
    throw new Error(`El recorte seleccionado es demasiado largo (${Math.ceil(trimmedDuration)}s). La duración máxima permitida es de 30 segundos.`);
  }

  const sampleRate = audioBuffer.sampleRate;
  const numChannels = Math.min(audioBuffer.numberOfChannels, 2); // Soportar mono o estéreo (máx 2)
  
  // 4. Instanciar codificador
  const mp3Encoder = new window.lamejs.Mp3Encoder(numChannels, sampleRate, 128); // 128 kbps
  
  const leftChannel = audioBuffer.getChannelData(0);
  const rightChannel = numChannels > 1 ? audioBuffer.getChannelData(1) : null;
  
  // Obtener los índices de muestras correspondientes al rango de tiempo
  const startSample = Math.floor(startSec * sampleRate);
  const endSample = Math.floor(endSec * sampleRate);

  // Recortar los canales
  const slicedLeft = leftChannel.subarray(startSample, endSample);
  const slicedRight = rightChannel ? rightChannel.subarray(startSample, endSample) : null;
  
  // Convertir float32 a int16 PCM
  const leftPCM = float32ToInt16(slicedLeft);
  const rightPCM = slicedRight ? float32ToInt16(slicedRight) : null;
  
  const mp3Chunks: Int8Array[] = [];
  const sampleBlockSize = 1152; // Tamaño estándar de bloque de LAME
  
  if (numChannels === 1) {
    for (let i = 0; i < leftPCM.length; i += sampleBlockSize) {
      const chunk = leftPCM.subarray(i, i + sampleBlockSize);
      const mp3buf = mp3Encoder.encodeBuffer(chunk);
      if (mp3buf.length > 0) {
        mp3Chunks.push(new Int8Array(mp3buf));
      }
    }
  } else if (numChannels === 2 && rightPCM) {
    for (let i = 0; i < leftPCM.length; i += sampleBlockSize) {
      const chunkLeft = leftPCM.subarray(i, i + sampleBlockSize);
      const chunkRight = rightPCM.subarray(i, i + sampleBlockSize);
      const mp3buf = mp3Encoder.encodeBuffer(chunkLeft, chunkRight);
      if (mp3buf.length > 0) {
        mp3Chunks.push(new Int8Array(mp3buf));
      }
    }
  }
  
  const mp3buf = mp3Encoder.flush();
  if (mp3buf.length > 0) {
    mp3Chunks.push(new Int8Array(mp3buf));
  }
  
  // 5. Crear el archivo resultante
  const blob = new Blob(mp3Chunks as unknown as BlobPart[], { type: 'audio/mp3' });
  const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
  return new File([blob], `${baseName}.mp3`, { type: 'audio/mp3' });
}
