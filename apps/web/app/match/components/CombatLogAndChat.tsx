"use client";

import { useState, useCallback } from "react";
import type { RefObject } from "react";
import type { PublicMatchState } from "@/lib/game-server/types";
import { MatchChatPanel } from "./MatchChatPanel";
import styles from "../match.module.css";

interface CombatLogAndChatProps {
  entries: PublicMatchState["log"];
  logEndRef: RefObject<HTMLDivElement | null>;
  matchId: string;
  playerId: "p1" | "p2";
  playerName: string;
  matchToken: string;
  filterSwearWords: boolean;
  onTabChange?: (tab: Tab) => void;
}

type Tab = "log" | "chat";

export function CombatLogAndChat({
  entries,
  logEndRef,
  matchId,
  playerId,
  playerName,
  matchToken,
  filterSwearWords,
  onTabChange,
}: CombatLogAndChatProps) {
  const [activeTab, setActiveTab] = useState<Tab>("log");
  const [chatUnread, setChatUnread] = useState(0);

  const handleNewMessage = useCallback(() => {
    if (activeTab !== "chat") {
      setChatUnread((n) => n + 1);
    }
  }, [activeTab]);

  const switchToChat = () => {
    setActiveTab("chat");
    setChatUnread(0);
    onTabChange?.("chat");
  };

  const switchToLog = () => {
    setActiveTab("log");
    onTabChange?.("log");
  };

  return (
    <div className={`${styles.bottomPanel} ${activeTab === "chat" ? styles.bottomPanelExpanded : ""}`}>
      <div className={styles.combatLogStrip}>
        {/* Tab bar */}
        <div className={styles.tabBar}>
          <button
            id="tab-combat-log"
            className={`${styles.tabBtn} ${activeTab === "log" ? styles.tabBtnActive : ""}`}
            onClick={switchToLog}
          >
            Combat Log
          </button>
          <button
            id="tab-chat"
            className={`${styles.tabBtn} ${activeTab === "chat" ? styles.tabBtnActive : ""}`}
            onClick={switchToChat}
          >
            Chat
            {chatUnread > 0 && activeTab !== "chat" && (
              <span className={styles.chatUnreadDot} aria-label={`${chatUnread} new messages`} />
            )}
          </button>
        </div>

        {/* Panels — kept mounted so state + SSE connection persists */}
        <div style={{ display: activeTab === "log" ? "contents" : "none" }}>
          <div className={styles.combatLogScroller}>
            {entries.length === 0 ? (
              <p className={`${styles.logEntry} ${styles.logMuted}`}>No events yet.</p>
            ) : (
              entries.map((entry, index) => (
                <p
                  key={`${entry.event}:${index}`}
                  className={`${styles.logEntry} ${logClass(entry.event ?? "")}`}
                >
                  {entry.message}
                </p>
              ))
            )}
            <div ref={logEndRef} />
          </div>
        </div>

        <div style={{ display: activeTab === "chat" ? "contents" : "none" }}>
          <MatchChatPanel
            matchId={matchId}
            playerId={playerId}
            playerName={playerName}
            matchToken={matchToken}
            filterSwearWords={filterSwearWords}
            onNewMessage={handleNewMessage}
            isActive={activeTab === "chat"}
          />
        </div>
      </div>
    </div>
  );
}

function logClass(event: string): string {
  switch (event) {
    case "DAMAGE_APPLIED":
    case "ENTITY_DIED":
      return styles.logDanger;
    case "HEAL_APPLIED":
      return styles.logSuccess;
    case "BLOCK_APPLIED":
      return styles.logInfo;
    case "STATUS_APPLIED":
      return styles.logStatus;
    case "STATUS_EXPIRED":
    case "STATUS_REMOVED":
      return styles.logMuted;
    case "CARD_PLAYED":
    case "CARD_EQUIPPED":
      return styles.logSpell;
    case "CARD_DESTROYED":
      return styles.logWarning;
    case "ENERGY_SPENT":
      return styles.logEnergy;
    case "STATUS_TICK":
      return styles.logTick;
    case "SUMMON_CREATED":
    case "SUMMON_EXPIRED":
      return styles.logSummon;
    default:
      return styles.logDefault;
  }
}
