// frontend/src/Calculator.jsx

import { useState, useEffect, useCallback } from "react";
import { calculate, getHistory, clearHistory } from "./api";

const BUTTONS = [
  ["C", "±", "%", "÷"],
  ["7", "8", "9", "×"],
  ["4", "5", "6", "−"],
  ["1", "2", "3", "+"],
  ["0", ".", "⌫", "="],
];

// Display symbol → what we send to Python backend
const OPS = { "÷": "/", "×": "*", "−": "-", "+": "+" };

export default function Calculator() {
  const [display, setDisplay]       = useState("0");
  const [expression, setExpression] = useState("");
  const [stored, setStored]         = useState(null);
  const [op, setOp]                 = useState(null);
  const [justEvaled, setJustEvaled] = useState(false);
  const [history, setHistory]       = useState([]);
  const [loading, setLoading]       = useState(false);

  // Load history on mount
  useEffect(() => {
    getHistory().then(setHistory);
  }, []);

  const handleButton = useCallback(async (btn) => {

    if (btn === "C") {
      setDisplay("0"); setExpression("");
      setStored(null); setOp(null); setJustEvaled(false);
      return;
    }

    if (btn === "±") { setDisplay(d => String(parseFloat(d) * -1)); return; }
    if (btn === "%")  { setDisplay(d => String(parseFloat(d) / 100)); return; }
    if (btn === "⌫")  { setDisplay(d => d.length > 1 ? d.slice(0, -1) : "0"); return; }

    // Operator pressed
    if (OPS[btn]) {
      setStored(parseFloat(display));
      setOp(btn);
      setExpression(`${display} ${btn}`);
      setDisplay("0");
      setJustEvaled(false);
      return;
    }

    // Equals — send to Python backend
    if (btn === "=") {
      if (op && stored !== null) {
        setLoading(true);
        try {
          const { result } = await calculate(stored, OPS[op], parseFloat(display));
          setDisplay(result);
          setExpression("");
          setStored(null); setOp(null);
          setJustEvaled(true);
          // Refresh history from DB
          const h = await getHistory();
          setHistory(h);
        } catch (err) {
          setDisplay("Error");
        } finally {
          setLoading(false);
        }
      }
      return;
    }

    if (btn === ".") {
      if (!display.includes(".")) setDisplay(d => d + ".");
      return;
    }

    // Digit
    if (justEvaled) { setDisplay(btn); setJustEvaled(false); }
    else { setDisplay(d => d === "0" ? btn : d.length < 14 ? d + btn : d); }

  }, [display, op, stored, justEvaled]);

  // Keyboard support
  useEffect(() => {
    const map = {
      "0":"0","1":"1","2":"2","3":"3","4":"4",
      "5":"5","6":"6","7":"7","8":"8","9":"9",
      ".":".", "+":"+", "-":"−", "*":"×", "/":"÷",
      "Enter":"=", "=":"=", "Backspace":"⌫", "Escape":"C",
    };
    const handler = (e) => { if (map[e.key]) handleButton(map[e.key]); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleButton]);

  return (
    <div style={{ display:"flex", gap:"24px", padding:"40px", 
                  minHeight:"100vh", background:"#0a0a0a",
                  justifyContent:"center", alignItems:"flex-start",
                  fontFamily:"'Courier New', monospace" }}>

      {/* ── CALCULATOR ── */}
      <div style={{ background:"#111", border:"1px solid #222",
                    borderRadius:"8px", padding:"20px", width:"300px" }}>

        {/* Screen */}
        <div style={{ background:"#0d1400", border:"1px solid #1a2a00",
                      borderRadius:"4px", padding:"16px", marginBottom:"16px",
                      minHeight:"80px" }}>
          <div style={{ color:"#3a5000", fontSize:"12px", minHeight:"18px" }}>
            {expression || "\u00a0"}
          </div>
          <div style={{ color: loading ? "#666" : "#c8ff00",
                        fontSize:"32px", textAlign:"right",
                        textShadow:"0 0 20px rgba(200,255,0,0.4)" }}>
            {loading ? "..." : display}
          </div>
        </div>

        {/* Buttons Grid */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"8px" }}>
          {BUTTONS.map(row => row.map(btn => (
            <button key={btn} onClick={() => handleButton(btn)}
              style={{
                gridColumn: btn === "0" ? "span 2" : "span 1",
                height:"56px", border:"1px solid #222", borderRadius:"4px",
                background: btn === "=" ? "#c8ff00" : "#111",
                color: btn === "=" ? "#000"
                     : OPS[btn] ? "#ff6b35"
                     : btn === "C" ? "#ff4444"
                     : "#c8ff00",
                fontSize:"18px", cursor:"pointer",
                fontFamily:"'Courier New', monospace",
              }}>
              {btn}
            </button>
          )))}
        </div>
      </div>

      {/* ── HISTORY PANEL ── */}
      <div style={{ background:"#111", border:"1px solid #222",
                    borderRadius:"8px", padding:"20px", width:"280px" }}>
        <div style={{ display:"flex", justifyContent:"space-between",
                      alignItems:"center", marginBottom:"16px" }}>
          <span style={{ color:"#c8ff00", fontSize:"13px", letterSpacing:"2px" }}>
            HISTORY
          </span>
          <button onClick={() => clearHistory().then(() => setHistory([]))}
            style={{ background:"none", border:"1px solid #333", color:"#ff4444",
                     padding:"4px 10px", borderRadius:"4px", cursor:"pointer",
                     fontSize:"11px", fontFamily:"'Courier New', monospace" }}>
            CLEAR
          </button>
        </div>

        {history.length === 0
          ? <p style={{ color:"#333", fontSize:"12px" }}>No history yet</p>
          : history.map((h, i) => (
              <div key={i} style={{ borderBottom:"1px solid #1a1a1a",
                                    paddingBottom:"10px", marginBottom:"10px" }}>
                <div style={{ color:"#3a5000", fontSize:"12px" }}>{h.expression}</div>
                <div style={{ color:"#c8ff00", fontSize:"20px" }}>= {h.result}</div>
                <div style={{ color:"#222", fontSize:"10px" }}>{h.timestamp}</div>
              </div>
            ))
        }
      </div>
    </div>
  );
}