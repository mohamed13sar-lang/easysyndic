export const STORAGE_BUCKETS = {
  documents: process.env.SUPABASE_STORAGE_BUCKET_DOCUMENTS || 'documents',
  complaintMedia:
    process.env.SUPABASE_STORAGE_BUCKET_COMPLAINT_MEDIA || 'complaint-media',
  paymentProofs:
    process.env.SUPABASE_STORAGE_BUCKET_PAYMENT_PROOFS || 'payment-proofs',
} as const;

export const STORAGE_LIMITS = {
  documents: 10 * 1024 * 1024,
  image: 5 * 1024 * 1024,
  audio: 10 * 1024 * 1024,
} as const;

export const ALLOWED_DOCUMENT_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

export const ALLOWED_AUDIO_MIME_TYPES = new Set([
  'audio/m4a',
  'audio/mp4',
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/aac',
  'audio/x-m4a',
]);
