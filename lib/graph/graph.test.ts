import { graph } from "@/lib/graph/graph";

describe("LangGraph wiring", () => {
  it("runs classifyIntent and returns intent", async () => {
    const result = await graph.invoke({ question: "What is my cholesterol level?" });
    expect(result.intent).toBe("rag_chat");
  });
});