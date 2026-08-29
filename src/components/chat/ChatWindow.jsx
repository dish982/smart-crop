"use client";

import { useCallback, useState } from "react";
import MessageBubble from "./MessageBubble";
import VoiceButton from "./VoiceButton";

const INITIAL_MESSAGES = {
  en: "Hello! 🌱 I am your Farm Assistant. You can type or speak your question in English, Hindi, or Marathi.",

  hi: "नमस्ते! 🌱 मैं आपका फार्म असिस्टेंट हूँ। आप अपना प्रश्न हिंदी, अंग्रेज़ी या मराठी में टाइप या बोल सकते हैं।",

  mr: "नमस्कार! 🌱 मी तुमचा फार्म असिस्टंट आहे. तुम्ही तुमचा प्रश्न मराठी, हिंदी किंवा इंग्रजीमध्ये टाइप किंवा बोलू शकता.",
};

export default function ChatWindow() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      message: INITIAL_MESSAGES.en,
      sender: "assistant",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Selected voice/chat language
  const [language, setLanguage] = useState("en-IN");

  // Latest assistant response for Text-to-Speech
  const [lastAssistantResponse, setLastAssistantResponse] =
    useState("");

  // --------------------------------------------------
  // LANGUAGE CHANGE
  // --------------------------------------------------

  const handleLanguageChange = (event) => {
    const newLanguage = event.target.value;

    setLanguage(newLanguage);

    const languageCode = newLanguage.split("-")[0];

    // Change the initial assistant message
    setMessages((previousMessages) => {
      if (previousMessages.length === 0) {
        return previousMessages;
      }

      return [
        {
          ...previousMessages[0],
          message:
            INITIAL_MESSAGES[languageCode] ||
            INITIAL_MESSAGES.en,
        },
        ...previousMessages.slice(1),
      ];
    });

    // Clear old TTS response
    setLastAssistantResponse("");
  };

  // --------------------------------------------------
  // SEND MESSAGE
  // --------------------------------------------------

  const sendMessage = async (messageText = input) => {
    const trimmedMessage = messageText.trim();

    if (!trimmedMessage || loading) {
      return;
    }

    const userMessage = {
      id: Date.now(),
      message: trimmedMessage,
      sender: "user",
    };

    setMessages((previousMessages) => [
      ...previousMessages,
      userMessage,
    ]);

    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: trimmedMessage,

          // Send selected language to API
          language: language.split("-")[0],
        }),
      });

      const data = await response.json();

      const assistantResponse =
        data.response ||
        "Sorry, I could not understand your question.";

      const assistantMessage = {
        id: Date.now() + 1,
        message: assistantResponse,
        sender: "assistant",
      };

      setMessages((previousMessages) => [
        ...previousMessages,
        assistantMessage,
      ]);

      // Store response only for speaker button
      setLastAssistantResponse(assistantResponse);
    } catch (error) {
      console.error("Chat error:", error);

      const errorMessage =
        "Sorry, something went wrong. Please try again.";

      setMessages((previousMessages) => [
        ...previousMessages,
        {
          id: Date.now() + 1,
          message: errorMessage,
          sender: "assistant",
        },
      ]);

      setLastAssistantResponse(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------
  // SPEECH-TO-TEXT
  // --------------------------------------------------

  const handleTranscript = useCallback(
    (transcript) => {
      if (!transcript?.trim()) {
        return;
      }

      setInput(transcript);

      // Automatically send recognized speech
      sendMessage(transcript);
    },
    [language, loading]
  );

  // --------------------------------------------------
  // ENTER KEY
  // --------------------------------------------------

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex h-[650px] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-green-100 bg-white shadow-lg">

      {/* Header */}
      <div className="bg-green-700 px-5 py-4 text-white">
        <h1 className="text-xl font-bold">
          🌱 Farm Assistant
        </h1>

        <p className="mt-1 text-sm text-green-50">
          Ask your agriculture-related questions
        </p>
      </div>

      {/* Language Selection */}
      <div className="flex items-center justify-between border-b bg-white px-5 py-3">
        <span className="text-sm font-medium text-gray-700">
          Voice Language
        </span>

        <select
          value={language}
          onChange={handleLanguageChange}
          className="rounded-lg border border-green-200 px-3 py-2 text-sm outline-none focus:border-green-500"
        >
          <option value="en-IN">
            English
          </option>

          <option value="hi-IN">
            हिंदी
          </option>

          <option value="mr-IN">
            मराठी
          </option>
        </select>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-green-50/40 p-5">
        {messages.map((item) => (
          <MessageBubble
            key={item.id}
            message={item.message}
            sender={item.sender}
          />
        ))}

        {loading && (
          <div className="text-sm text-gray-500">
            🌱 Assistant is thinking...
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-100 bg-white p-4">
        <div className="flex items-center gap-2">

          {/* Text Input */}
          <input
            type="text"
            value={input}
            onChange={(event) =>
              setInput(event.target.value)
            }
            onKeyDown={handleKeyDown}
            placeholder="Type your agriculture question..."
            className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
          />

          {/* Voice Button */}
          <VoiceButton
            language={language}
            onTranscript={handleTranscript}
            textToSpeak={lastAssistantResponse}
          />

          {/* Send Button */}
          <button
            type="button"
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send
          </button>

        </div>
      </div>
    </div>
  );
}