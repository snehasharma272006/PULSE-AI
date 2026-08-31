import { GraphState } from "../state";

export async function compareReports(state: typeof GraphState.State) {
  console.log("compareReports called — not implemented yet, question was:", state.question);
  return { chunks: [] }; // placeholder — real comparison logic comes once analyze-pdf is wired in
}