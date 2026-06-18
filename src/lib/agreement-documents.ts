import { deleteStoredFile, uploadFile } from "@/lib/file-storage";

export function isPdfFile(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

export async function uploadAgreementPdf(agreementId: string, file: File) {
  if (!isPdfFile(file)) {
    throw new Error("Only PDF files are allowed.");
  }

  return uploadFile(`agreements/${agreementId}`, file, {
    allowedTypes: ["application/pdf", ".pdf"],
    localDir: "uploads/agreements",
  });
}

export async function deleteAgreementPdf(documentUrl: string) {
  await deleteStoredFile(documentUrl, "/uploads/agreements/");
}
