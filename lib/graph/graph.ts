import { StateGraph, START, END } from "@langchain/langgraph";
import { GraphState } from "./state";
import { classifyIntent } from "./nodes/classifyIntent";
import { retrieveChunks } from "./nodes/retrieveChunks";
import { getMetricTrend } from "./nodes/getMetricTrend";
import { compareReports } from "./nodes/compareReports";

function routeByIntent(state: typeof GraphState.State) {
  if (state.intent === "trend") return "getMetricTrend";
  if (state.intent === "comparison") return "compareReports";
  return "retrieveChunks"; // rag_chat + multi_part both retrieve for now
}

export const graph = new StateGraph(GraphState)
  .addNode("classifyIntent", classifyIntent)
  .addNode("retrieveChunks", retrieveChunks)
  .addNode("getMetricTrend", getMetricTrend)
  .addNode("compareReports", compareReports)
  .addEdge(START, "classifyIntent")
  .addConditionalEdges("classifyIntent", routeByIntent, [
    "retrieveChunks",
    "getMetricTrend",
    "compareReports",
  ])
  .addEdge("retrieveChunks", END)
  .addEdge("getMetricTrend", END)
  .addEdge("compareReports", END)
  .compile();