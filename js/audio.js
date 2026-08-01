let audioCtx = null;
let masterGain = null;
let muted = false;

function getAudioCtx(){
  if(!audioCtx) {
    // window.webkitAudioContext is for older safari
    const AC = window.AudioContext || window.webkitAudioContext;
    if(!AC) return null;
    audioCtx = new AC();

    // vol control node
    masterGain = audioCtx.createGain();
    masterGain.gain.value = muted ? 0 : 1;
    masterGain.connect(audioCtx.destination);
  }

  // handle browsers that auto-suspend audio contexts by resuming it
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function unlockAudio(){ getAudioCtx(); }

// mute button
function toggleMute(){
  // not muted by default
  muted = !muted;

  if(masterGain) masterGain.gain.value = muted ? 0 : 1;
  return muted;
}

// footstep sound
function playFootstep(){
  const ctx = getAudioCtx();
  if(!ctx) return;

  // create an audio buffer 0.09s long
  const dur = 0.09;
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate*dur), ctx.sampleRate);

  const data = buffer.getChannelData(0);
  for(let i=0;i<data.length;i++) {
    // fills the buffer with random values between -1 and 1 (raw white noise)
    data[i] = (Math.random()*2-1) * Math.pow(1 - i/data.length, 2.2);
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  // create a lowpass filter that only lets frequencies below 180-250HZ through
  // strip out all the high freq which makes it sound like a footstep
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass'; 

  // Math.random()*70 helps to randomise the cutoff so the footsteps slightly differ
  filter.frequency.value = 180 + Math.random()*70; 

  const gain = ctx.createGain();
  gain.gain.value = 0.9; // vol

  // chain the nodes
  noise.connect(filter).connect(gain).connect(masterGain);
  noise.start();
}

// lamp switch sound
function playClick(on){
  const ctx = getAudioCtx();
  if(!ctx) return;

  // create an audio buffer that is 0.025s long
  const dur = 0.025;
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate*dur), ctx.sampleRate);

  const data = buffer.getChannelData(0);
  for(let i=0;i<data.length;i++){
    data[i] = (Math.random()*2-1) * Math.pow(1 - i/data.length, 4);
  }

  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  // create a bandpass filter to let only freq at 2600 or 1700HZ through
  // produces a 'tick' sound
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = on ? 2600 : 1700; // higher pitch for on and lower pitch for off
  filter.Q.value = 1.1; // higher Q = more resonant

  const gain = ctx.createGain();
  gain.gain.value = 0.9;

  noise.connect(filter).connect(gain).connect(masterGain);
  noise.start();
}