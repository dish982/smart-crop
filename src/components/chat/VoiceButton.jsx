"use client";

import { useEffect, useRef, useState } from "react";
//import { useEffect, useRef, useState } from "react";

export default function VoiceButton({
  language = "en-IN",
  onTranscript,
  textToSpeak = "",
}) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [supported, setSupported] = useState(true);

  const recognitionRef = useRef(null);
  const previousResponseRef = useRef("");

  useEffect(() => {
  if (!textToSpeak) return;

  if (textToSpeak === previousResponseRef.current) {
    return;
  }

  previousResponseRef.current = textToSpeak;

  if (
    typeof window === "undefined" ||
    !("speechSynthesis" in window)
  ) {
    return;
  }

  window.speechSynthesis.cancel();

  const utterance =
    new SpeechSynthesisUtterance(textToSpeak);

  utterance.lang = language;
  utterance.rate = 0.9;
  utterance.pitch = 1;

  utterance.onstart = () => {
    setIsSpeaking(true);
  };

  utterance.onend = () => {
    setIsSpeaking(false);
  };

  utterance.onerror = () => {
    setIsSpeaking(false);
  };

  window.speechSynthesis.speak(utterance);
}, [textToSpeak, language]);

  // Check browser support
  useEffect(() => {
    if (typeof window === "undefined") return;

    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = language;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const transcript =
        event.results[0][0].transcript;

      if (onTranscript) {
        onTranscript(transcript);
      }
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, [language, onTranscript]);

  // Start / stop listening
  const toggleListening = () => {
    if (!supported) {
      alert(
        "Speech recognition is not supported in this browser."
      );
      return;
    }

    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.lang = language;
      recognitionRef.current.start();
    }
  };

  // Text-to-Speech
  const speakResponse = () => {
    if (
      typeof window === "undefined" ||
      !textToSpeak
    ) {
      return;
    }

    if (!("speechSynthesis" in window)) {
      alert(
        "Text-to-Speech is not supported in this browser."
      );
      return;
    }

    window.speechSynthesis.cancel();

    const utterance =
      new SpeechSynthesisUtterance(textToSpeak);

    utterance.lang = language;
    utterance.rate = 0.9;
    utterance.pitch = 1;

    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  if (!supported) {
    return (
      <button
        type="button"
        disabled
        className="rounded-xl bg-gray-200 px-4 py-3 text-gray-500"
        title="Speech recognition is not supported"
      >
        🎤
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {/* Microphone */}
      <button
        type="button"
        onClick={toggleListening}
        className={`rounded-xl px-4 py-3 text-lg font-semibold text-white transition ${
          isListening
            ? "bg-red-500 hover:bg-red-600"
            : "bg-blue-600 hover:bg-blue-700"
        }`}
        title={
          isListening
            ? "Stop listening"
            : "Start voice input"
        }
      >
        {isListening ? "⏹️" : "🎤"}
      </button>

      {/* Speaking button */}
      {textToSpeak && (
        <button
          type="button"
          onClick={speakResponse}
          className="rounded-xl bg-green-600 px-4 py-3 text-lg text-white transition hover:bg-green-700"
          title="Listen to assistant response"
        >
          {isSpeaking ? "🔊" : "🔈"}
        </button>
      )}
    </div>
  );
}