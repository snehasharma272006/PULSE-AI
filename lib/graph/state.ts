import { Annotation } from "@langchain/langgraph";

export const GraphState = Annotation.Root({
  question: Annotation<string>(),
  userId: Annotation<string>(),
  reportId: Annotation<string | undefined>(),

  intent: Annotation<"rag_chat" | "trend" | "comparison" | "multi_part">(),

  chunks: Annotation<Array<{ text: string; reportId: string; pageNumber: number }>>({
    reducer: (_, next) => next,
    default: () => [],
  }),
});