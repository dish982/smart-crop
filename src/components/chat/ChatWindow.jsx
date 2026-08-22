"use client";

import { useState } from "react";
import MessageBubble from "./MessageBubble";
import VoiceButton from "./VoiceButton";

export default function ChatWindow() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      message:
        "Namaste! 🌱 I am your Farm Assistant. You can type or speak your question in English, Hindi, or Marathi.",
      sender: "assistant",
    },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Selected voice language
  const [language, setLanguage] = useState("en-IN");
  const [lastAssistantResponse, setLastAssistantResponse] = useState("");

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

      setLastAssistantResponse(assistantResponse);

      setMessages((previousMessages) => [
        ...previousMessages,
        assistantMessage,
      ]);
    } catch (error) {
      console.error("Chat error:", error);

      setMessages((previousMessages) => [
        ...previousMessages,
        {
          id: Date.now() + 1,
          message:
            "Sorry, something went wrong. Please try again.",
          sender: "assistant",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Called when SpeechRecognition gets text
  const handleTranscript = (transcript) => {
    setInput(transcript);

    // Automatically send the recognized voice text
    sendMessage(transcript);
  };

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
          onChange={(event) =>
            setLanguage(event.target.value)
          }
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
            textToSpeak="{lastAssistantResponse}"
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