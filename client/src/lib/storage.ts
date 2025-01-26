import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";

export async function uploadFile(file: File, path: string): Promise<string> {
  try {
    console.log('Storage: Starting upload', { path, fileSize: file.size, fileType: file.type });
    const storageRef = ref(storage, path);
    console.log('Storage: Setting up upload metadata and CORS headers');
    const metadata = {
      cacheControl: 'public, max-age=3600, immutable',
      contentType: file.type,
      contentDisposition: 'inline',
      customMetadata: {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET, HEAD, OPTIONS',
        'access-control-max-age': '3600',
        'access-control-expose-headers': 'Content-Length, Content-Type, Content-Disposition',
        'original-filename': file.name,
        'upload-timestamp': Date.now().toString(),
        'public-access': 'true'
      }
    };
    const snapshot = await uploadBytes(storageRef, file, metadata);
    console.log('Storage: Upload successful', { path, metadata: snapshot.metadata });

    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log('Download URL obtained:', downloadURL);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}