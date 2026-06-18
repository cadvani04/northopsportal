import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";
import { del, get, put } from "@vercel/blob";

const MAX_BYTES = 4 * 1024 * 1024;

export function isVercelBlobUrl(url: string) {
  return url.includes(".blob.vercel-storage.com");
}

/** Vercel Blob: legacy token or newer store + OIDC (BLOB_STORE_ID). */
function isBlobStorageAvailable() {
  return !!(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

function guessContentType(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return "application/octet-stream";
}

export async function uploadFile(
  storagePath: string,
  file: File,
  options: { allowedTypes?: string[]; maxBytes?: number; localDir?: string }
) {
  const maxBytes = options.maxBytes ?? MAX_BYTES;
  if (file.size > maxBytes) {
    throw new Error(`File must be ${Math.round(maxBytes / 1024 / 1024)} MB or smaller.`);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length > maxBytes) {
    throw new Error(`File must be ${Math.round(maxBytes / 1024 / 1024)} MB or smaller.`);
  }

  if (options.allowedTypes?.length) {
    const ok = options.allowedTypes.some(
      (type) => file.type === type || file.name.toLowerCase().endsWith(type.replace("*", ""))
    );
    if (!ok && !options.allowedTypes.includes(file.type)) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      const allowedExt = options.allowedTypes.some((t) => ext && t.includes(ext));
      if (!allowedExt) {
        throw new Error("File type not allowed.");
      }
    }
  }

  const filename = file.name.replace(/[^\w.\-]+/g, "_") || "file";

  if (isBlobStorageAvailable()) {
    const blob = await put(`${storagePath}/${filename}`, buffer, {
      access: "private",
      contentType: file.type || "application/octet-stream",
      addRandomSuffix: true,
    });
    return blob.url;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "File storage is not configured. In Vercel: Project → Storage → Create Blob → Connect to this project, then redeploy."
    );
  }

  const localDir = path.join(process.cwd(), "public", options.localDir || "uploads");
  await mkdir(localDir, { recursive: true });
  const localName = `${Date.now()}-${filename}`;
  await writeFile(path.join(localDir, localName), buffer);
  return `/${options.localDir || "uploads"}/${localName}`;
}

export async function deleteStoredFile(documentUrl: string, localPrefix?: string) {
  if (isVercelBlobUrl(documentUrl)) {
    await del(documentUrl);
    return;
  }

  const prefix = localPrefix || "/uploads/";
  if (documentUrl.startsWith(prefix)) {
    try {
      await unlink(path.join(process.cwd(), "public", documentUrl));
    } catch {
      /* ignore */
    }
  }
}

export async function readStoredFile(storedUrl: string) {
  if (isVercelBlobUrl(storedUrl)) {
    const result = await get(storedUrl, { access: "private" });
    if (!result || result.statusCode === 304 || !result.stream) {
      throw new Error("File not found");
    }

    return {
      body: result.stream,
      contentType: result.blob.contentType || "application/octet-stream",
    };
  }

  if (storedUrl.startsWith("/uploads/")) {
    const filePath = path.join(process.cwd(), "public", storedUrl);
    const buffer = await readFile(filePath);
    return {
      body: buffer,
      contentType: guessContentType(filePath),
    };
  }

  throw new Error("Unsupported file location");
}

export const RECEIPT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];
