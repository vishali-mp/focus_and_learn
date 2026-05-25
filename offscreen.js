//plays sound sound

// chrome.runtime.onMessage.addListener((msg) => {
//     if (msg.target === 'offscreen' && msg.type === 'PLAY_SOUND') {
//       const audio = new Audio(msg.file);
      
//       // FIX: Lower the volume slightly or set playback properties if needed, 
//       // but the real key is forcing Chrome to recognize it via user-agnostic stream types
//       audio.volume = 1.0; 
      
//       audio.play()
//         .then(() => console.log("Audio playing successfully"))
//         .catch(err => {
//           console.error("Audio playback failed:", err);
          
//           // Fallback: If Chrome still blocks it, we can play it by interacting with a 
//           // temporary audio context or logging a cleaner debugging trail.
//         });
//     }
//   });

// works but plays just one sound for work and break

// chrome.runtime.onMessage.addListener((msg) => {
//     if (msg.target === 'offscreen' && msg.type === 'PLAY_SOUND') {
//       try {
//         const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
//         // Create a clean synth chime using two oscillators
//         const osc = audioCtx.createOscillator();
//         const gainNode = audioCtx.createGain();
        
//         osc.type = 'sine';
//         // 880Hz is a crisp, clean high "A" note notification chime
//         osc.frequency.setValueAtTime(880, audioCtx.currentTime); 
        
//         // Exponentially decay the sound over 0.4 seconds so it sounds like a real bell/chime
//         gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
//         gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        
//         osc.connect(gainNode);
//         gainNode.connect(audioCtx.destination);
        
//         osc.start();
//         osc.stop(audioCtx.currentTime + 0.4);
        
//         console.log("Synthesized notification chime played successfully!");
//       } catch (err) {
//         console.error("Synth playback failed:", err);
//       }
//     }
//   });


chrome.runtime.onMessage.addListener((msg) => {
    if (msg.target === 'offscreen' && msg.type === 'PLAY_SOUND') {
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        if (msg.phase === 'break') {
          // 🔔 RELAXING ambient double-chime for Break Time
          playChime(audioCtx, 880, 0.4); // Clean high A note
          setTimeout(() => {
            playChime(audioCtx, 1320, 0.6); // Perfect fifth harmonized overtone
          }, 120);
          
        } else if (msg.phase === 'work') {
          // ⏱️ GROUNDING rhythmic alert tone for Focus/Work Time
          playBeep(audioCtx, 440, 0.1);
          setTimeout(() => playBeep(audioCtx, 440, 0.1), 150);
          setTimeout(() => playBeep(audioCtx, 440, 0.2), 300);
        }
      } catch (err) {
        console.error("Synth playback failed:", err);
      }
    }
  });
  
  // Helper 1: Creates an elegant ringing bell sound with decaying volume
  function playChime(ctx, frequency, duration) {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    
    gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }
  
  // Helper 2: Creates a sharp focus beep
  function playBeep(ctx, frequency, duration) {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = 'triangle'; // Gives it a slightly sharper texture than a pure sine wave
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime + duration - 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }