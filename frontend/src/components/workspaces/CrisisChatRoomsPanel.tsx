// frontend/src/components/workspaces/CrisisChatRoomsPanel.tsx

import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../../app/store";
import { useLanguage } from "../../context/LanguageContext";
import { io } from "socket.io-client";
import api from "../../api/axios"; 
import { AlertCircle, Send, MessageSquare } from "lucide-react";

// Safe Socket.io initialization using Vite env variables or fallback
const SOCKET_URL = (import.meta.env?.VITE_SOCKET_URL as string) || "http://localhost:5173";
const socket = io(SOCKET_URL, {
  auth: { token: localStorage.getItem("token") } 
});

interface Participant {
  id: string;
  userName: string;
  role: string;
}

interface ChatRoom {
  id: string;
  title: string;
  type: string;
  createdById: Participant;
  participants: Participant[];
}

export function CrisisChatRoomsPanel() {
  const { user } = useSelector((state: RootState) => state.auth);
  const { dir } = useLanguage();
  
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
  const [managers, setManagers] = useState<any[]>([]); 
  const [selectedManager, setSelectedManager] = useState("");
  const [issueTitle, setIssueTitle] = useState("");
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<any[]>([]);

  // Fixed typescript comparison error by removing undefined overlaps
  const isCSAgent = user?.role === "CS_AGENT";

  // 1. Fetch active rooms and available managers for escalation
  useEffect(() => {
    const initData = async () => {
      try {
        const roomsRes = await api.get("/api/chat-rooms");
        if (roomsRes.data.success) {
          setRooms(roomsRes.data.data);
        }

        if (isCSAgent) {
          const usersRes = await api.get("/api/users?role=MANAGER"); 
          setManagers(usersRes.data.data || []);
        }
      } catch (err) {
        console.error("Error loading chat data", err);
      }
    };
    initData();

    // 2. Real-time listener for receiving new escalation requests
    socket.on("new_escalation_chat", (newRoom: ChatRoom) => {
      setRooms((prev) => [newRoom, ...prev]);
      new Audio("/assets/notification.mp3").play().catch(() => {});
    });

    // 3. Real-time message listener for the active chat session
    socket.on("new_message", (message: any) => {
      if (selectedRoom && message.roomId === selectedRoom.id) {
        setMessages((prev) => [...prev, message]);
      }
    });

    return () => {
      socket.off("new_escalation_chat");
      socket.off("new_message");
    };
  }, [selectedRoom, isCSAgent]);

  // Create a new escalation chat room and alert the selected manager
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedManager || !issueTitle.trim()) return;

    try {
      const res = await api.post("/api/chat-rooms/escalate", {
        managerId: selectedManager,
        issueTitle: issueTitle
      });

      if (res.data.success) {
        setRooms((prev) => [res.data.data, ...prev]);
        setSelectedRoom(res.data.data);
        setIssueTitle("");
        setSelectedManager("");
      }
    } catch (err) {
      console.error("Error creating room", err);
    }
  };

  const handleSelectRoom = (room: ChatRoom) => {
    setSelectedRoom(room);
    socket.emit("join_room", { roomId: room.id });
    
    // Fetch conversation history for the selected room
    api.get(`/api/chat-rooms/${room.id}/messages`).then((res) => {
      if (res.data.success) {
        setMessages(res.data.data.reverse());
      }
    });
  };

  const handleSendMessage = () => {
    if (!draft.trim() || !selectedRoom) return;
    socket.emit("send_message", {
      roomId: selectedRoom.id,
      text: draft
    });
    setDraft("");
  };

  return (
    <div className="space-y-6" dir={dir}>
      <header className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-sm flex justify-between items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-rose-600">Crisis Dispatch Center</p>
          <h2 className="mt-2 text-3xl font-semibold text-slate-900">Escalation & Emergency Chats</h2>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        
        {/* Left Section: Active chat list & escalation controls */}
        <section className="space-y-6">
          
          {/* Escalation Trigger form (Visible to CS agents only) */}
          {isCSAgent && (
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-rose-500" /> Escalate Issue to a Manager
              </h3>
              <form onSubmit={handleCreateRoom} className="space-y-4">
                <select 
                  value={selectedManager} 
                  onChange={(e) => setSelectedManager(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-rose-400 bg-slate-50"
                  required
                >
                  <option value="">Select a Manager to summon...</option>
                  {managers.map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.userName} ({m.role})
                    </option>
                  ))}
                </select>
                <input 
                  type="text" 
                  placeholder="Summarize the issue briefly..."
                  value={issueTitle}
                  onChange={(e) => setIssueTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-rose-400 bg-slate-50"
                  required
                />
                <button type="submit" className="w-full rounded-xl bg-rose-600 p-3 text-sm font-semibold text-white hover:bg-rose-700 transition">
                  Create Room & Summon Manager
                </button>
              </form>
            </div>
          )}

          {/* Active Chat Queue */}
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-semibold text-slate-500 mb-4">Active Chat Requests</div>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {rooms.map((room) => (
                <button 
                  key={room.id} 
                  type="button" 
                  onClick={() => handleSelectRoom(room)} 
                  className={`w-full rounded-2xl border p-4 text-left transition ${selectedRoom?.id === room.id ? "border-rose-300 bg-rose-50" : "border-slate-200 bg-slate-50 hover:bg-white"}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      {/* Bold CS Agent Name */}
                      <div className="font-bold text-slate-900 text-base truncate">
                        👤 {room.createdById?.userName || "CS Agent"}
                      </div>
                      {/* Bold Red Subtitle - Incident/Issue Title */}
                      <div className="mt-1 text-sm text-rose-600 font-semibold italic truncate">
                        Issue: {room.title || "No Subject Specified"}
                      </div>
                    </div>
                    <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700 flex-shrink-0">ACTIVE</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Right Section: Selected Chat Room Workspace */}
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm flex flex-col h-[600px]">
          {selectedRoom ? (
            <>
              <div className="border-b pb-4">
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-500">Discussion Room</p>
                <h3 className="mt-1 text-xl font-bold text-slate-900">{selectedRoom.createdById?.userName}</h3>
                <span className="text-xs text-rose-600 font-bold flex items-center gap-1.5 mt-1">
                  <span className="h-2 w-2 rounded-full bg-rose-600 animate-pulse"></span>
                  🚨 {selectedRoom.title}
                </span>
              </div>

              {/* Message History Container */}
              <div className="flex-1 my-4 overflow-y-auto space-y-3 p-3 bg-slate-50 rounded-2xl">
                {messages.map((msg, index) => (
                  <div key={index} className={`flex flex-col ${msg.senderId === user?.id ? "items-end" : "items-start"}`}>
                    <div className={`p-3 rounded-2xl text-sm max-w-[85%] ${msg.senderId === user?.id ? "bg-slate-900 text-white rounded-tr-none" : "bg-white border text-slate-800 rounded-tl-none shadow-sm"}`}>
                      <p className="text-[10px] font-bold text-rose-400 mb-1">{msg.senderName}</p>
                      <p className="break-words">{msg.text}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Message Composer Footer */}
              <div className="flex gap-2 pt-2 border-t">
                <input 
                  value={draft} 
                  onChange={(e) => setDraft(e.target.value)} 
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-rose-400" 
                  placeholder="Type your reply here to assist..." 
                />
                <button type="button" onClick={handleSendMessage} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition flex items-center gap-1">
                  <Send className="h-4 w-4" /> Send
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
              <MessageSquare className="h-12 w-12 text-slate-300 mb-2" />
              <p className="text-sm font-medium">Please select an active escalation chat from the sidebar to start helping.</p>
            </div>
          )}
        </section>

      </div>
    </div>
  );
}