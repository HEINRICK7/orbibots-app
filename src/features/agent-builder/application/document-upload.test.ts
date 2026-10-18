import { describe, expect, it } from "vitest";
import { createDocumentKey, MAX_DOCUMENT_BYTES, resolveDocumentFormat, validateDocumentFile } from "./document-upload";

describe("document upload preparation", () => {
  it("maps only formats supported by the backend", () => {
    expect(resolveDocumentFormat("Manual.MD")).toBe("MARKDOWN");
    expect(resolveDocumentFormat("regras.txt")).toBe("TEXT");
    expect(resolveDocumentFormat("guia.pdf")).toBe("PDF");
    expect(resolveDocumentFormat("guia.docx")).toBe("DOCX");
    expect(() => resolveDocumentFormat("pagina.html")).toThrow("Formato não suportado");
  });

  it("builds a safe document key and enforces the backend's 5 MiB binary limit", () => {
    expect(createDocumentKey("Política de Entrega.pdf")).toBe("politica-de-entrega");
    expect(validateDocumentFile({ name: "faq.md", size: 1 } as File)).toBe("MARKDOWN");
    expect(() => validateDocumentFile({ name: "grande.pdf", size: MAX_DOCUMENT_BYTES + 1 } as File)).toThrow("5 MiB");
    expect(() => validateDocumentFile({ name: "vazio.txt", size: 0 } as File)).toThrow("vazio");
  });
});
