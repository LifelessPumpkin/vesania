'use client';

// utils/audioPlayer.js
import { Howl } from 'howler';

export const playSound = (src: string) => {
  const sound = new Howl({
    src: [src],
    volume: 0.25,
    format: ['wav'],
    html5: true // Use HTML5 Audio to prevent potential CORS issues
  });

  sound.play();
};


// import { useEffect, useRef } from 'react';
// import { Howl } from 'howler';

// type ButtonAudioProps = {
//   src: string;
//   volume?: number;
// };

// export default function ButtonAudio({ src, volume = 0.25 }: ButtonAudioProps) {
//   const soundRef = useRef<Howl | null>(null);

//   useEffect(() => {
//     // Create a new Howl instance for the button click sound
//     const sound = new Howl({
//       src: [src],
//       format: ['wav'],
//       preload: true,
//       volume,
//       html5: true,
//       onloaderror: (_id, error) => {
//         console.error(`Button audio failed to load: ${src}`, error);
//       },
//     });

//     soundRef.current = sound;

//     return () => {
//       // Clean up the Howl instance when the component unmounts
//       if (soundRef.current) {
//         soundRef.current.unload();
//         soundRef.current = null;
//       }
//     };
//   }, [src, volume]);

//   const playSound = () => {
//     if (soundRef.current) {
//       soundRef.current.play();
//     }
//   };

//   return playSound;
// }
