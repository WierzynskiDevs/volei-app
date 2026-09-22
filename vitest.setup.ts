import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Desmonta o que cada teste renderizou — sem isto, o segundo teste de um
// arquivo encontraria o DOM do primeiro ainda de pé.
afterEach(() => {
  cleanup();
});
