import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { del, put } from "@vercel/blob";

const MAX_BYTES = 4 * 1024 * 1024; // Vercel request body limit

export function isPdfFile(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

export async function readPdfFile(file: File) {
  if (!isPdfFile(file)) {
    throw new Error("Only PDF files are allowed.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("PDF must be 4 MB or smaller.");
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length > MAX_BYTES) {
    throw new Error("PDF must be 4 MB or smaller.");
  }
  return buffer;
}

function isVercelBlobUrl(url: string) {
  return url.includes(".public.blob.vercel-storage.com");
}

export async function uploadAgreementPdf(agreementId: string, file: File) {
  const buffer = await readPdfFile(file);
  const filename = file.name.replace(/[^\w.\-]+/g, "_") || "agreement.pdf";

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`agreements/${agreementId}/${filename}`, buffer, {
      access: "public",
      contentType: "application/pdf",
      addRandomSuffix: true,
    });
    return blob.url;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN is not configured. Add Vercel Blob storage to enable PDF uploads."
    );
  }

  const dir = path.join(process.cwd(), "public", "uploads", "agreements");
  await mkdir(dir, { recursive: true });
  const localName = `${agreementId}.pdf`;
  await writeFile(path.join(dir, localName), buffer);
  return `/uploads/agreements/${localName}`;
}

export async function deleteAgreementPdf(documentUrl: string) {
  if (isVercelBlobUrl(documentUrl)) {
    await del(documentUrl);
    return;
  }

  if (documentUrl.startsWith("/uploads/agreements/")) {
    const localPath = path.join(process.cwd(), "public", documentUrl);
    try {
      await unlink(localPath);
    } catch {
      // File may already be gone.
    }
  }
}
