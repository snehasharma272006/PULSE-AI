import { StateGraph, START, END } from "@langchain/langgraph";
import { GraphState } from "./state";

async function classifyIntent(state: typeof GraphState.State) {
  console.log("classifyIntent received question:", state.question);
  return { intent: "rag_chat" };
}

export const graph = new StateGraph(GraphState)
  .addNode("classifyIntent", classifyIntent)
  .addEdge(START, "classifyIntent")
  .addEdge("classifyIntent", END)
  .compile();