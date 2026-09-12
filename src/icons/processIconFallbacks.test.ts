import { describe, expect, it } from "vitest";
import { processIconFallback } from "./processIconFallbacks";

describe("process icon fallbacks", () => {
  it("provides offline brand icons for reference applications", () => {
    for (const name of ["chrome", "code", "node", "spotify", "postgres", "docker", "python"]) {
      expect(processIconFallback(name)).toMatch(/^data:image\/svg\+xml,/);
    }
  });

  it("provides a neural identity for agents without a bundled brand glyph", () => {
    expect(processIconFallback("trae")).toContain("AI%20agent");
    expect(processIconFallback("workbuddy.exe")).toContain("AI%20agent");
  });

  it("leaves unknown names available for the initials fallback", () => {
    expect(processIconFallback("unmapped-local-tool")).toBeNull();
  });
});
