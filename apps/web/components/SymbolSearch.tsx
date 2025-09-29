"use client";
import React, { useEffect, useState, useRef } from "react";

type Row = { symbol: string; name: string };

export default function SymbolSearch({
  onSelect,
}: {
  onSelect: (sym: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [results, setResults] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let mounted = true;
    fetch("/sp500.csv")
      .then((r) => r.text())
      .then((text) => {
        if (!mounted) return;
        const lines = text.split(/\r?\n/).filter(Boolean);
        const parsed: Row[] = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i];
          // split on first comma
          const idx = line.indexOf(",");
          if (idx === -1) continue;
          let sym = line.slice(0, idx).trim();
          let name = line.slice(idx + 1).trim();
          if (name.startsWith('"') && name.endsWith('"')) {
            name = name.slice(1, -1).replace(/""/g, '"');
          }
          parsed.push({ symbol: sym, name });
        }
        setRows(parsed);
      })
      .catch(() => {
        setRows([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }
    const q = query.toLowerCase();
    const filtered = rows.filter(
      (r) =>
        r.symbol.toLowerCase().startsWith(q) || r.name.toLowerCase().includes(q)
    );
    setResults(filtered.slice(0, 20));
  }, [query, rows]);

  return (
    <div style={{ position: "relative" }}>
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && results.length) {
            onSelect(results[0].symbol);
            setQuery(results[0].symbol);
            setOpen(false);
          }
        }}
        placeholder="Search symbol or company"
        aria-label="Search symbol or company"
        style={{
          width: 300,
          color: "black",
          padding: 8,
          borderRadius: 6,
          border: "1px solid #ccc",
        }}
      />
      {open && results.length > 0 && (
        <ul
          style={{
            position: "absolute",
            zIndex: 50,
            background: "white",
            color: "black",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            width: 300,
            maxHeight: 300,
            overflow: "auto",
            marginTop: 4,
            padding: 0,
            listStyle: "none",
          }}
        >
          {results.map((r) => (
            <li
              key={r.symbol}
              style={{
                padding: 8,
                borderBottom: "1px solid #eee",
                cursor: "pointer",
              }}
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(r.symbol);
                setQuery(r.symbol);
                setOpen(false);
              }}
            >
              <div style={{ fontWeight: 600 }}>{r.symbol}</div>
              <div style={{ fontSize: 12, color: "#444" }}>{r.name}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
