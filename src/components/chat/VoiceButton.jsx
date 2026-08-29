"use client";

import { useEffect, useRef, useState } from "react";

export default function VoiceButton({
  language = "en-IN",
  onTranscript,
  textToSpeak = "",
}) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [supported, setSupported] = useState(true);

  const recognitionRef = useRef(null);
  const isListeningRef = useRef(false);

  // --------------------------------------------------
  // SPEECH RECOGNITION SETUP
  // --------------------------------------------------

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

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
      isListeningRef.current = true;
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const transcript =
        event.results?.[0]?.[0]?.transcript || "";

      if (transcript.trim() && onTranscript) {
        onTranscript(transcript.trim());
      }
    };

    recognition.onerror = (event) => {
      // User didn't speak in time.
      // This is normal and should not show an error.
      if (event.error !== "no-speech") {
        console.error(
          "Speech recognition error:",
          event.error
        );
      }

      isListeningRef.current = false;
      setIsListening(false);
    };

    recognition.onend = () => {
      isListeningRef.current = false;
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.abort();
      } catch (error) {
        // Ignore cleanup errors
      }

      recognitionRef.current = null;
      isListeningRef.current = false;
    };
  }, [language, onTranscript]);

  // --------------------------------------------------
  // START / STOP SPEECH RECOGNITION
  // --------------------------------------------------

  const toggleListening = () => {
    if (!supported) {
      alert(
        "Speech recognition is not supported in this browser."
      );
      return;
    }

    const recognition = recognitionRef.current;

    if (!recognition) {
      return;
    }

    // Stop listening
    if (isListeningRef.current) {
      try {
        recognition.stop();
      } catch (error) {
        // Ignore stop errors
      }

      return;
    }

    recognition.lang = language;

    try {
      recognition.start();
    } catch (error) {
      // Prevent "recognition has already started"
      if (error.name !== "InvalidStateError") {
        console.error(
          "Speech recognition start error:",
          error
        );
      }
    }
  };

  // --------------------------------------------------
  // TEXT-TO-SPEECH
  // --------------------------------------------------

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

    // Stop current speech
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
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

  // --------------------------------------------------
  // CLEAN UP TTS
  // --------------------------------------------------

  useEffect(() => {
    return () => {
      if (
        typeof window !== "undefined" &&
        "speechSynthesis" in window
      ) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // --------------------------------------------------
  // MICROPHONE ICON
  // --------------------------------------------------

  const MicrophoneIcon = () => (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect
        x="9"
        y="3"
        width="6"
        height="11"
        rx="3"
        stroke="currentColor"
        strokeWidth="2"
      />

      <path
        d="M5 11C5 14.866 8.134 18 12 18C15.866 18 19 14.866 19 11"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />

      <path
        d="M12 18V21"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />

      <path
        d="M9 21H15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );

  // --------------------------------------------------
  // STOP ICON
  // --------------------------------------------------

  const StopIcon = () => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect
        x="6"
        y="6"
        width="12"
        height="12"
        rx="2"
      />
    </svg>
  );

  // --------------------------------------------------
  // SPEAKER ICON
  // --------------------------------------------------

  const SpeakerIcon = () => (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M4 10V14H8L13 18V6L8 10H4Z"
        fill="currentColor"
      />

      <path
        d="M16 9C17.3333 10.3333 17.3333 13.6667 16 15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />

      <path
        d="M18.5 6.5C21.5 9.5 21.5 14.5 18.5 17.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );

  // --------------------------------------------------
  // BROWSER NOT SUPPORTED
  // --------------------------------------------------

  if (!supported) {
    return (
      <button
        type="button"
        disabled
        className="flex items-center justify-center rounded-xl bg-gray-200 p-3 text-gray-500"
        title="Speech recognition is not supported"
      >
        <MicrophoneIcon />
      </button>
    );
  }

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div className="flex items-center gap-2">

      {/* Speech-to-Text */}
      <button
        type="button"
        onClick={toggleListening}
        className={`flex items-center justify-center rounded-xl p-3 text-white transition ${
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
        {isListening ? (
          <StopIcon />
        ) : (
          <MicrophoneIcon />
        )}
      </button>

      {/* Text-to-Speech */}
      {textToSpeak && (
        <button
          type="button"
          onClick={speakResponse}
          className="flex items-center justify-center rounded-xl bg-green-600 p-3 text-white transition hover:bg-green-700"
          title={
            isSpeaking
              ? "Stop speaking"
              : "Listen to assistant response"
          }
        >
          <SpeakerIcon />
        </button>
      )}
    </div>
  );
}