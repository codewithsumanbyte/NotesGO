import * as tus from 'tus-js-client';
import { SupabaseClient } from '@supabase/supabase-js';

export interface UploadProgress {
  bytesUploaded: number;
  bytesTotal: number;
  percentage: number;
  speed?: string; // formatted e.g. "3.2 MB/s"
}

export interface UploadVaultFileOptions {
  supabase: SupabaseClient;
  file: File;
  userId: string;
  currentFolderId: string | null;
  onProgress?: (progress: UploadProgress) => void;
  onAbortRef?: (abortFn: () => void) => void;
}

export interface UploadVaultFileResult {
  fileId: string;
  storagePath: string;
  name: string;
  size: number;
}

const DEFAULT_SUPABASE_URL = 'https://dqugqxhurfwzxdkevuro.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRxdWdxeGh1cmZ3enhka2V2dXJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwOTU2MDEsImV4cCI6MjEwNTY3MTYwMX0.6KRHl0Mx2qOZ0d2fGh0Vh2MQwjY-Zk5pTQIfFi-j7cQ';

/**
 * Returns the direct Supabase Storage TUS resumable endpoint.
 * Bypasses API gateway bottlenecks for high-speed, reliable large uploads (100MB+).
 */
export function getResumableUploadEndpoint(): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;

  try {
    const parsed = new URL(supabaseUrl);
    const hostParts = parsed.hostname.split('.');
    if (hostParts.length >= 3 && hostParts[1] === 'supabase') {
      const projectId = hostParts[0];
      return `https://${projectId}.storage.supabase.co/storage/v1/upload/resumable`;
    }
  } catch {
    // Fall back to standard endpoint
  }

  return `${supabaseUrl.replace(/\/$/, '')}/storage/v1/upload/resumable`;
}

/**
 * Uploads a file to Supabase Storage:
 * - Files >= 6MB use Resumable TUS protocol in 6MB chunks with real-time progress & auto-retry.
 * - Files < 6MB use direct single upload for near-instant speed.
 * - Saves metadata into the public.files table upon completion.
 */
export async function uploadVaultFile({
  supabase,
  file,
  userId,
  currentFolderId,
  onProgress,
  onAbortRef,
}: UploadVaultFileOptions): Promise<UploadVaultFileResult> {
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `${userId}/${Date.now()}_${sanitizedName}`;

  // 1. Get authenticated session for RLS authorization
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError || !session?.access_token) {
    throw new Error('Please sign in to upload files to your vault.');
  }

  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
  const isLargeFile = file.size >= 6 * 1024 * 1024; // 6MB threshold

  if (isLargeFile) {
    // Perform Chunked Resumable TUS Upload
    await new Promise<void>((resolve, reject) => {
      const endpoint = getResumableUploadEndpoint();
      let lastTime = Date.now();
      let lastUploaded = 0;

      const upload = new tus.Upload(file, {
        endpoint,
        retryDelays: [0, 3000, 5000, 10000, 20000],
        // Supabase Storage requires strictly 6MB chunks
        chunkSize: 6 * 1024 * 1024,
        uploadDataDuringCreation: true,
        removeFingerprintOnSuccess: true,
        headers: {
          authorization: `Bearer ${session.access_token}`,
          apikey: anonKey,
          'x-upsert': 'true',
        },
        metadata: {
          bucketName: 'vault',
          objectName: storagePath,
          contentType: file.type || 'application/octet-stream',
          cacheControl: '3600',
        },
        onProgress: (bytesUploaded, bytesTotal) => {
          const now = Date.now();
          const timeDiff = (now - lastTime) / 1000;
          let speedStr: string | undefined;

          if (timeDiff >= 0.5) {
            const bytesDiff = bytesUploaded - lastUploaded;
            const bytesPerSec = bytesDiff / timeDiff;
            if (bytesPerSec > 1024 * 1024) {
              speedStr = `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
            } else if (bytesPerSec > 1024) {
              speedStr = `${(bytesPerSec / 1024).toFixed(0)} KB/s`;
            }
            lastTime = now;
            lastUploaded = bytesUploaded;
          }

          const percentage = Math.min(100, Math.round((bytesUploaded / bytesTotal) * 100));
          onProgress?.({
            bytesUploaded,
            bytesTotal,
            percentage,
            speed: speedStr,
          });
        },
        onSuccess: () => {
          onProgress?.({
            bytesUploaded: file.size,
            bytesTotal: file.size,
            percentage: 100,
          });
          resolve();
        },
        onError: (err: any) => {
          console.error('TUS Upload Error Details:', err);
          const status = err?.originalResponse?.getStatus?.() || 0;
          const body = (err?.originalResponse?.getBody?.() || '').toLowerCase();
          const msg = (err?.message || '').toLowerCase();

          if (
            status === 413 ||
            msg.includes('413') ||
            body.includes('413') ||
            msg.includes('payload too large') ||
            body.includes('payload too large') ||
            msg.includes('entitytoolarge') ||
            body.includes('entitytoolarge') ||
            msg.includes('maximum allowed size') ||
            body.includes('maximum allowed size')
          ) {
            reject(
              new Error(
                `File exceeds Supabase limit (50 MB on Free Tier). To upload files over 50 MB (like 100MB+), upgrade your Supabase project to Pro (supports up to 50 GB) or compress the file.`
              )
            );
          } else if (status === 401 || status === 403) {
            reject(new Error('Session expired or unauthorized. Please re-login and try again.'));
          } else {
            reject(
              new Error(
                err?.message ||
                  'Upload interrupted or failed. Please verify your connection and try again.'
              )
            );
          }
        },
      });

      if (onAbortRef) {
        onAbortRef(() => {
          upload.abort();
          reject(new Error('Upload canceled by user.'));
        });
      }

      // Check for previous interrupted uploads to resume
      upload
        .findPreviousUploads()
        .then((previousUploads) => {
          if (previousUploads.length > 0) {
            upload.resumeFromPreviousUpload(previousUploads[0]);
          }
          upload.start();
        })
        .catch(() => {
          upload.start();
        });
    });
  } else {
    // Fast path for small files (< 6MB)
    onProgress?.({
      bytesUploaded: Math.round(file.size * 0.2),
      bytesTotal: file.size,
      percentage: 20,
    });

    const { error: uploadError } = await supabase.storage.from('vault').upload(storagePath, file, {
      cacheControl: '3600',
      upsert: true,
    });

    if (uploadError) {
      if (
        uploadError.message?.toLowerCase().includes('413') ||
        uploadError.message?.toLowerCase().includes('payload too large') ||
        uploadError.message?.toLowerCase().includes('exceeded the maximum allowed size')
      ) {
        throw new Error(
          'File exceeds Supabase storage size limit. Upgrade your Supabase project or compress the file.'
        );
      }
      throw uploadError;
    }

    onProgress?.({
      bytesUploaded: file.size,
      bytesTotal: file.size,
      percentage: 100,
    });
  }

  // 2. Insert record in public.files table
  const { data: dbData, error: dbError } = await supabase
    .from('files')
    .insert({
      user_id: userId,
      folder_id: currentFolderId,
      name: file.name,
      storage_path: storagePath,
      mime_type: file.type || 'application/octet-stream',
      size: file.size,
    })
    .select('id')
    .single();

  if (dbError) throw dbError;

  return {
    fileId: dbData?.id || '',
    storagePath,
    name: file.name,
    size: file.size,
  };
}
