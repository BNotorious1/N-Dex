
import type { UploadUrlResponseMetadata } from './uploadUrlResponseMetadata';

export interface UploadUrlResponse {
  /** Presigned GCS URL for PUT upload. */
  uploadURL: string;
  /** Normalized object path (e.g. /objects/uploads/uuid). */
  objectPath: string;
  metadata?: UploadUrlResponseMetadata;
}
