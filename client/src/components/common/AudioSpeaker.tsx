import React, { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';

interface AudioSpeakerProps {
  text: string;
  language?: string;
  className?: string;
}

export const AudioSpeaker: React.FC<AudioSpeakerProps> = ({
  text,
  language = 'English',
  className = '',
}) => {
  const [isPlaying, setIsPlaying] = useState(false);

  const getLangCode = (lang: string): string => {
    switch (lang.toLowerCase()) {
      case 'marathi':
        return 'mr-IN';
      case 'hindi':
        return 'hi-IN';
      case 'tamil':
        return 'ta-IN';
      case 'telugu':
        return 'te-IN';
      case 'gujarati':
        return 'gu-IN';
      case 'kannada':
        return 'kn-IN';
      case 'bengali':
        return 'bn-IN';
      case 'punjabi':
        return 'pa-IN';
      default:
        return 'en-IN';
    }
  };

  const speak = () => {
    if (!('speechSynthesis' in window)) {
      alert('Speech synthesis is not supported in this browser.');
      return;
    }

    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = getLangCode(language);
    utterance.rate = 0.95;

    // Try finding a matching voice
    const voices = window.speechSynthesis.getVoices();
    const matchingVoice = voices.find((v) => v.lang.startsWith(getLangCode(language).slice(0, 2)));
    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    utterance.onstart = () => setIsPlaying(true);
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);

    window.speechSynthesis.speak(utterance);
  };

  return (
    <button
      onClick={speak}
      type="button"
      title={isPlaying ? 'Stop listening' : `Listen in ${language}`}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full transition-all ${
        isPlaying
          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
          : 'bg-[#182337] hover:bg-[#253757] text-[#9CAFC8] hover:text-[#B8F34A] border border-[#2A3C5B]'
      } ${className}`}
    >
      {isPlaying ? (
        <>
          <VolumeX className="w-3.5 h-3.5" />
          <span>Stop</span>
        </>
      ) : (
        <>
          <Volume2 className="w-3.5 h-3.5" />
          <span>Listen ({language})</span>
        </>
      )}
    </button>
  );
};
