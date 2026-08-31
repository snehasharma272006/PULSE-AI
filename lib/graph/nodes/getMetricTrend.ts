import { GraphState } from "../state";

export async function getMetricTrend(state: typeof GraphState.State) {
  console.log("getMetricTrend called — not implemented yet, question was:", state.question);
  return { chunks: [] }; // placeholder — real trend logic comes once analyze-pdf is wired in
}