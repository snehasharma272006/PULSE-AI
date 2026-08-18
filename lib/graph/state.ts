import { Annotation } from "@langchain/langgraph";

export const GraphState = Annotation.Root({
  question: Annotation<string>(),
  intent: Annotation<string>(),
});