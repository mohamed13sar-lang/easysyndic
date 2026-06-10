import { getSupabaseConfig } from '@/config/runtime';

type LocalUploadFile = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  size?: number | null;
};

export type UploadedFile = {
  url: string;
  fileName: string;
  mimeType: string;
  size?: number | null;
};

async function getSupabaseClient() {
  const { anonKey, url } = getSupabaseConfig();

  if (!url || !anonKey) {
    throw new Error(
      'Upload indisponible: Supabase Storage non configure.',
    );
  }

  const { createClient } = await import('@supabase/supabase-js');
  return createClient(url, anonKey);
}

function extensionFromMime(mimeType: string) {
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('webp')) return 'webp';
  if (mimeType.includes('m4a')) return 'm4a';
  if (mimeType.includes('aac')) return 'aac';
  if (mimeType.includes('mpeg') || mimeType.includes('mp3')) return 'mp3';
  return mimeType.startsWith('audio/') ? 'm4a' : 'jpg';
}

function buildFileName(file: LocalUploadFile, fallbackMimeType: string) {
  const mimeType = file.mimeType ?? fallbackMimeType;
  const extension = extensionFromMime(mimeType);
  const rawName = file.fileName?.trim() || `media-${Date.now()}.${extension}`;
  return rawName.replace(/[^\w.-]+/g, '-').toLowerCase();
}

async function uploadFile(
  folder: string,
  file: LocalUploadFile,
  fallbackMimeType: string,
): Promise<UploadedFile> {
  const client = await getSupabaseClient();
  const { bucket } = getSupabaseConfig();
  const mimeType = file.mimeType ?? fallbackMimeType;
  const fileName = buildFileName(file, fallbackMimeType);
  const path = `${folder}/${Date.now()}-${fileName}`;
  const response = await fetch(file.uri);
  const blob = await response.blob();

  const { error } = await client.storage.from(bucket).upload(path, blob, {
    contentType: mimeType,
    upsert: false,
  });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = client.storage.from(bucket).getPublicUrl(path);

  return {
    url: data.publicUrl,
    fileName,
    mimeType,
    size: file.size ?? blob.size,
  };
}

export function uploadPaymentProof(file: LocalUploadFile) {
  return uploadFile('payment-proofs', file, 'image/jpeg');
}

export function uploadComplaintImage(file: LocalUploadFile) {
  return uploadFile('complaint-images', file, 'image/jpeg');
}

export function uploadComplaintAudio(file: LocalUploadFile) {
  return uploadFile('complaint-audio', file, 'audio/m4a');
}
