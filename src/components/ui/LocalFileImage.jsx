import React, { useEffect, useState } from "react";
import { resolveFileUrl, revokeResolvedFileUrl } from "@/lib/localFiles";
import { apiUrl } from "@/lib/apiBase";

function normalizeDisplayUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  // Old records may contain a relative server upload path.
  if (raw.startsWith("/uploads/")) return apiUrl(raw);

  // Google profile photo URLs can be blocked/expire when used directly in an <img>.
  // Serve them through our backend image proxy instead.
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();
    if (
      host === "googleusercontent.com" ||
      host.endsWith(".googleusercontent.com") ||
      host === "gstatic.com" ||
      host.endsWith(".gstatic.com")
    ) {
      return apiUrl(`/api/media/proxy?url=${encodeURIComponent(raw)}`);
    }
  } catch {
    // Keep non-URL values unchanged; resolveFileUrl handles local-file:// values.
  }

  return raw;
}

export default function LocalFileImage({ src, fallback = null, onError, onLoad, ...props }) {
  const [resolved, setResolved] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    setFailed(false);
    setResolved("");

    if (!src) return undefined;

    resolveFileUrl(src)
      .then((value) => {
        if (live) setResolved(normalizeDisplayUrl(value));
      })
      .catch(() => {
        if (live) setFailed(true);
      });

    return () => {
      live = false;
      revokeResolvedFileUrl(src);
    };
  }, [src]);

  if (!src || failed || !resolved) return fallback;

  return (
    <img
      src={resolved}
      {...props}
      onLoad={(event) => onLoad?.(event)}
      onError={(event) => {
        setFailed(true);
        onError?.(event);
      }}
    />
  );
}
