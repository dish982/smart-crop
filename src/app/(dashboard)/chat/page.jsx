"use client";

import ChatWindow from "@/components/chat/ChatWindow";

export default function ChatPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl items-center justify-center">
        <ChatWindow />
      </div>
    </main>
  );
}