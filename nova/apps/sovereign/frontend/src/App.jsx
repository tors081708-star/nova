import React, { useState } from "react";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:8001";

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await axios.post(`${BACKEND_URL}/api/chat`, { message: input });
      const botMsg = { role: "assistant", content: res.data.reply };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Error communicating with server." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4">
      <header className="border-b border-gray-800 pb-4 mb-4 flex justify-between items-center">
        <h1 className="text-xl font-bold tracking-wide">NOVA Sovereign AI</h1>
        <span className="text-xs bg-emerald-900/60 text-emerald-400 border border-emerald-700/50 px-2 py-1 rounded">
          Fedora Native
        </span>
      </header>

      <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 mt-20">
            Ask NOVA anything. Fully autonomous & unmetered.
          </div>
        )}
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`p-3 rounded-lg max-w-[80%] ${
              m.role === "user"
                ? "bg-blue-600 text-white ml-auto"
                : "bg-gray-800 text-gray-200 mr-auto border border-gray-700"
            }`}
          >
            {m.content}
          </div>
        ))}
        {loading && <div className="text-gray-500 italic text-sm">NOVA is thinking...</div>}
      </div>

      <form onSubmit={sendMessage} className="flex gap-2">
        <input
          type="text"
          className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
          placeholder="Type your prompt..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-5 py-2 rounded-lg transition"
        >
          Send
        </button>
      </form>
    </div>
  );
}
