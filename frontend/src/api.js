// frontend/src/api.js

const BASE_URL = "http://localhost:5000/api";

// Send calculation to Python backend
export async function calculate(a, op, b) {
  const res = await fetch(`${BASE_URL}/calculate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ a, op, b }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Calculation failed");
  return data; // { result, expression }
}

// Fetch history from DB
export async function getHistory() {
  const res = await fetch(`${BASE_URL}/history`);
  return res.json(); // array of { expression, result, timestamp }
}

// Clear all history
export async function clearHistory() {
  await fetch(`${BASE_URL}/history`, { method: "DELETE" });
}