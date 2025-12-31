const fs = require('fs');
const path = require('path');

const sampleRate = 44100;
const duration = 0.05; // 50ms
const frequency = 1000; // 1000Hz click
const volume = 0.5;

const numSamples = Math.floor(sampleRate * duration);
const bytesPerSample = 2; // 16-bit
const numChannels = 1;
const blockAlign = numChannels * bytesPerSample;
const byteRate = sampleRate * blockAlign;
const dataSize = numSamples * blockAlign;
const fileSize = 36 + dataSize;

const buffer = Buffer.alloc(44 + dataSize);

// RIFF chunk
buffer.write('RIFF', 0);
buffer.writeUInt32LE(fileSize, 4);
buffer.write('WAVE', 8);

// fmt subchunk
buffer.write('fmt ', 12);
buffer.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
buffer.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
buffer.writeUInt16LE(numChannels, 22);
buffer.writeUInt32LE(sampleRate, 24);
buffer.writeUInt32LE(byteRate, 28);
buffer.writeUInt16LE(blockAlign, 32);
buffer.writeUInt16LE(16, 34); // BitsPerSample

// data subchunk
buffer.write('data', 36);
buffer.writeUInt32LE(dataSize, 40);

// Data
for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Simple sine wave with a decay envelope to make it sound like a "tick"
    const envelope = Math.max(0, 1 - (i / numSamples));
    const sample = Math.sin(2 * Math.PI * frequency * t) * volume * envelope;

    // Convert to 16-bit PCM
    let val = Math.floor(sample * 32767);
    if (val > 32767) val = 32767;
    if (val < -32768) val = -32768;

    buffer.writeInt16LE(val, 44 + i * 2);
}

const dest = path.join(__dirname, 'assets', 'click.wav');
fs.writeFileSync(dest, buffer);
console.log('Generated ' + dest);
