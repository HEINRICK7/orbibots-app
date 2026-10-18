export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;

export type UploadableDocumentFormat = "MARKDOWN" | "TEXT" | "PDF" | "DOCX";

const documentFormats: Record<string, UploadableDocumentFormat> = {
  md: "MARKDOWN",
  markdown: "MARKDOWN",
  txt: "TEXT",
  pdf: "PDF",
  docx: "DOCX",
};

export function resolveDocumentFormat(fileName: string): UploadableDocumentFormat {
  const extension = fileName.split(".").at(-1)?.toLocaleLowerCase("en-US") ?? "";
  const format = documentFormats[extension];
  if (!format) throw new Error("Formato não suportado. Envie MD, TXT, PDF ou DOCX.");
  return format;
}

export function createDocumentKey(fileName: string): string {
  const baseName = fileName.replace(/\\/g, "/").split("/").at(-1)?.replace(/\.[^.]+$/, "") ?? "documento";
  const key = baseName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-US")
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return key || "documento";
}

export function validateDocumentFile(file: File): UploadableDocumentFormat {
  if (file.size === 0) throw new Error("O arquivo está vazio.");
  if (file.size > MAX_DOCUMENT_BYTES) throw new Error("O backend aceita arquivos de até 5 MiB.");
  return resolveDocumentFormat(file.name);
}
