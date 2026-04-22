"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { ChatMessage } from "@/app/api/match/[id]/chat/route";
import { filterProfanity } from "@/lib/swear-filter";
import styles from "../match.module.css";

interface MatchChatPanelProps {
  matchId: string;
  playerId: "p1" | "p2";
  playerName: string;
  matchToken: string;
  filterSwearWords: boolean;
  /** Called whenever a new message arrives (so parent can show unread dot) */
  onNewMessage: () => void;
  /** Whether this panel is currently the active visible tab */
  isActive: boolean;
}

export function MatchChatPanel({
  matchId,
  playerId,
  playerName,
  matchToken,
  filterSwearWords,
  onNewMessage,
  isActive,
}: MatchChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [muted, setMuted] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const isActiveRef = useRef(isActive);
  const onNewMessageRef = useRef(onNewMessage);

  useEffect(() => { isActiveRef.current = isActive; }, [isActive]);
  useEffect(() => { onNewMessageRef.current = onNewMessage; }, [onNewMessage]);

  // Fetch message history on mount
  useEffect(() => {
    fetch(`/api/match/${matchId}/chat`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.messages)) {
          setMessages(data.messages);
        }
      })
      .catch(() => {});
  }, [matchId]);

  // Subscribe to SSE chat stream
  useEffect(() => {
    const es = new EventSource(`/api/match/${matchId}/chat/stream`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      const msg: ChatMessage = JSON.parse(event.data);

      // If muted AND the message is from the opponent — drop it from display
      if (muted && msg.playerId !== playerId) {
        onNewMessageRef.current();
        return;
      }

      setMessages((prev) => {
        // Avoid duplicating messages we already have from the REST fetch
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });

      if (!isActiveRef.current && msg.playerId !== playerId) {
        onNewMessageRef.current();
      }
    };

    return () => {
      es.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, muted, playerId]);

  // Auto-scroll on new messages or when the tab becomes visible
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    if (isActive) {
      bottomRef.current?.scrollIntoView({ behavior: "instant" });
    }
  }, [isActive]);

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || sending) return;

    setSending(true);
    setInputText("");

    try {
      await fetch(`/api/match/${matchId}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Match-Token": matchToken,
        },
        body: JSON.stringify({ playerName, text }),
      });
    } catch {
      // Best-effort — no UI error for chat sends
    } finally {
      setSending(false);
    }
  }, [inputText, sending, matchId, matchToken, playerName]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  function displayText(msg: ChatMessage): string {
    // Viewer-side filter: if the viewer has filtering on, mask profanity
    if (filterSwearWords) {
      return filterProfanity(msg.text);
    }
    return msg.text;
  }

  return (
    <div className={styles.chatPanel}>
      {/* Controls row — mute button only, no redundant title */}
      <div className={styles.chatHeader}>
        <button
          className={`${styles.chatMuteBtn} ${muted ? styles.chatMuteBtnActive : ""}`}
          onClick={() => setMuted((v) => !v)}
          title={muted ? "Unmute chat" : "Mute incoming messages"}
          aria-label={muted ? "Unmute chat" : "Mute incoming messages"}
        >
          {muted ? (
            /* Muted icon (bell-slash) */
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              <path d="M18.63 13A17.89 17.89 0 0 1 18 8" />
              <path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14" />
              <path d="M18 8a6 6 0 0 0-9.33-5" />
              <line x1="1" y1="1" x2="23" y2="23" />
            </svg>
          ) : (
            /* Unmuted icon (bell) */
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          )}
        </button>
      </div>

      {/* Muted banner */}
      {muted && (
        <div className={styles.chatMutedBanner}>
          Muted — incoming messages hidden
        </div>
      )}

      {/* Message list */}
      <div className={styles.chatMessageList}>
        {messages.length === 0 ? (
          <p className={`${styles.logEntry} ${styles.logMuted}`}>No messages yet. Say hello!</p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`${styles.chatMessage} ${msg.playerId === playerId ? styles.chatMessageOwn : styles.chatMessageOther}`}
            >
              <span className={styles.chatMsgName}>
                {msg.playerId === playerId ? "You" : msg.playerName}
              </span>
              <span className={styles.chatMsgText}>{displayText(msg)}</span>
              <span className={styles.chatMsgTime}>
                {new Date(msg.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input row */}
      <div className={styles.chatInputRow}>
        <textarea
          className={styles.chatTextInput}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message… (Enter to send)"
          rows={1}
          maxLength={300}
          disabled={sending}
        />
        <button
          className={styles.chatSendBtn}
          onClick={handleSend}
          disabled={sending || !inputText.trim()}
          aria-label="Send message"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
