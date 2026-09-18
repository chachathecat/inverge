// One end-to-end server budget includes authentication, upload, build checks and OCR.
export const LOCAL_OCR_REQUEST_MS = 60_000;
export const LOCAL_OCR_UPLOAD_MS = 30_000;
export const LOCAL_OCR_CLIENT_MS = LOCAL_OCR_REQUEST_MS + 5_000;
