import type { DeckCard } from "./types.js";

export const DEFAULT_DECK: DeckCard[] = [
  { value: "0", label: "0", tone: "number" },
  { value: "1", label: "1", tone: "number" },
  { value: "2", label: "2", tone: "number" },
  { value: "3", label: "3", tone: "number" },
  { value: "5", label: "5", tone: "number" },
  { value: "8", label: "8", tone: "number" },
  { value: "13", label: "13", tone: "number" },
  { value: "21", label: "21", tone: "number" },
  { value: "?", label: "?", tone: "uncertain" },
  { value: "coffee", label: "Coffee", tone: "break" },
];
