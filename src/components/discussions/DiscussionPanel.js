import React, { useEffect, useRef, useState } from "react";
import { Button, Form } from "react-bootstrap";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import { io } from "socket.io-client";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import api, { API_URL } from "../../api/client";
import { useAuth } from "../../contexts/AuthContext";
import toast from "react-hot-toast";

export default function DiscussionPanel({ positionId }) {
  const { t } = useTranslation();
  const { hasRole } = useAuth();
  const canLinkAuthors = hasRole("recruiter", "admin");
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get(`/positions/${positionId}/messages`);
        if (!cancelled) setMessages(data);
      } catch {
        toast.error("Failed to load discussion");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [positionId]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const socket = io(API_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;
    socket.emit("discussion:join", positionId);
    socket.on("discussion:message", (msg) => {
      if (Number(msg.positionId) !== Number(positionId)) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    // Polling fallback every 5s
    const poll = setInterval(async () => {
      try {
        const last = messages[messages.length - 1];
        const params = last ? { since: last.createdAt } : {};
        const { data } = await api.get(`/positions/${positionId}/messages`, { params });
        if (data?.length) {
          setMessages((prev) => {
            const ids = new Set(prev.map((m) => m.id));
            const merged = [...prev];
            data.forEach((m) => {
              if (!ids.has(m.id)) merged.push(m);
            });
            return merged;
          });
        }
      } catch {
        /* ignore */
      }
    }, 5000);

    return () => {
      socket.emit("discussion:leave", positionId);
      socket.disconnect();
      clearInterval(poll);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSending(true);
    try {
      const { data } = await api.post(`/positions/${positionId}/messages`, { content });
      setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data]));
      setContent("");
    } catch {
      toast.error("Failed to send");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="discussion-panel">
      <div className="discussion-thread">
        {messages.length === 0 && (
          <div className="empty-state py-4">
            <div className="empty-state-icon">
              <i className="bi bi-chat-dots" />
            </div>
            <p className="empty-state-hint mb-0">{t("discussion.empty")}</p>
          </div>
        )}
        {messages.map((m) => {
          const name =
            m.author
              ? `${m.author.firstName || ""} ${m.author.lastName || ""}`.trim() || m.author.email
              : "User";
          const initials = name
            .split(" ")
            .map((p) => p[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();
          return (
            <div key={m.id} className="discussion-msg fade-in">
              {m.author?.photo ? (
                <img src={m.author.photo} alt="" className="msg-avatar" />
              ) : (
                <span className="msg-avatar avatar-fallback">{initials}</span>
              )}
              <div className="msg-content">
                <div className="msg-head">
                  {canLinkAuthors && m.author?.id ? (
                    <Link to={`/profile?userId=${m.author.id}`} className="msg-author-link">
                      <strong className="msg-author">{name}</strong>
                    </Link>
                  ) : (
                    <strong className="msg-author">{name}</strong>
                  )}
                  <span className="text-muted small msg-time">
                    {m.createdAt ? format(new Date(m.createdAt), "MMM d, HH:mm") : ""}
                  </span>
                </div>
                <div className="msg-bubble">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <Form onSubmit={send} className="discussion-composer mt-3">
        <Form.Control
          as="textarea"
          rows={3}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t("discussion.placeholder")}
        />
        <div className="d-flex justify-content-end mt-2">
          <Button type="submit" disabled={sending || !content.trim()}>
            <i className="bi bi-send me-1" />
            {t("discussion.send")}
          </Button>
        </div>
      </Form>
    </div>
  );
}