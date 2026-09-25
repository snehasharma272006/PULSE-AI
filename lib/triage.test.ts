import { triage, emptySymptomInput } from "@/lib/triage";

describe("triage() — routine cases", () => {
  it("returns routine with score 0 when nothing is reported", () => {
    const result = triage(emptySymptomInput());
    expect(result.level).toBe("routine");
    expect(result.score).toBe(0);
    expect(result.redFlagTriggered).toBe(false);
  });

  it("stays routine for mild, low-weight symptoms", () => {
    const result = triage({
      ...emptySymptomInput(),
      fever: "mild",
      abdominalPain: "mild",
    });
    expect(result.level).toBe("routine");
    expect(result.score).toBe(2);
  });
});

describe("triage() — urgent cases (score-based, no red flag)", () => {
  it("crosses into urgent on a single severe-but-not-critical symptom", () => {
    const result = triage({
      ...emptySymptomInput(),
      abdominalPain: "severe",
    });
    expect(result.level).toBe("urgent");
    expect(result.score).toBe(6);
    expect(result.redFlagTriggered).toBe(false);
  });

  it("combines moderate symptoms plus sudden onset into urgent", () => {
    const result = triage({
      ...emptySymptomInput(),
      abdominalPain: "moderate",
      breathingDifficulty: "moderate",
      onset: "sudden",
    });
    expect(result.level).toBe("urgent");
    expect(result.score).toBe(8);
  });
});

describe("triage() — critical via cumulative score (no single red flag)", () => {
  it("reaches critical purely by stacking moderate symptoms", () => {
    const result = triage({
      ...emptySymptomInput(),
      fever: "high",
      pulseIrregular: true,
      consciousness: "dizzy",
      abdominalPain: "moderate",
      onset: "sudden",
    });
    expect(result.level).toBe("critical");
    expect(result.score).toBe(13);
    expect(result.redFlagTriggered).toBe(false);
  });
});

describe("triage() — critical via red flags (score is irrelevant)", () => {
  it("flags crushing, radiating chest pain as critical", () => {
    const result = triage({ ...emptySymptomInput(), chestPain: "crushing_radiating" });
    expect(result.level).toBe("critical");
    expect(result.redFlagTriggered).toBe(true);
    expect(result.reasons[0]).toMatch(/chest pain/i);
  });

  it("flags unconsciousness as critical even with nothing else reported", () => {
    const result = triage({ ...emptySymptomInput(), consciousness: "unconscious" });
    expect(result.level).toBe("critical");
    expect(result.redFlagTriggered).toBe(true);
  });

  it("flags severe uncontrolled bleeding as critical", () => {
    const result = triage({ ...emptySymptomInput(), bleeding: "severe_uncontrolled" });
    expect(result.level).toBe("critical");
    expect(result.redFlagTriggered).toBe(true);
  });

  it("flags a seizure as critical", () => {
    const result = triage({ ...emptySymptomInput(), seizure: true });
    expect(result.level).toBe("critical");
    expect(result.redFlagTriggered).toBe(true);
  });

  it("flags major trauma as critical", () => {
    const result = triage({ ...emptySymptomInput(), majorTrauma: true });
    expect(result.level).toBe("critical");
    expect(result.redFlagTriggered).toBe(true);
  });

  it("still reports a real score alongside a red-flag verdict, not a placeholder", () => {
    const result = triage({
      ...emptySymptomInput(),
      seizure: true,
      fever: "mild",
    });
    expect(result.level).toBe("critical");
    expect(result.score).toBe(1); // mild fever's point, computed independently of the red flag
  });
});