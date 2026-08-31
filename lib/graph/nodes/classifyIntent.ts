import { GraphState } from "../state";

export async function classifyIntent(state: typeof GraphState.State) {
  console.log("classifyIntent received question:", state.question);
  return { intent: "rag_chat" as const };
}