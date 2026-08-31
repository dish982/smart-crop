"use client";

export default function MessageBubble({ message, sender }) {
  const isUser = sender === "user";

  return (
    <div className={`flex w-full mb-4 ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] px-4 py-3 rounded-2xl shadow-sm ${
          isUser
            ? "bg-green-600 text-white rounded-br-sm"
            : "bg-white text-gray-800 border border-green-100 rounded-bl-sm"
        }`}
      >
        {!isUser && (
          <div className="text-xs font-semibold text-green-700 mb-1">
            🌱 Farm Assistant
          </div>
        )}

        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {message}
        </p>
      </div>
    </div>
  );
}