import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";

export async function uploadFile(file: File, path: string): Promise<string> {
  try {
    console.log('Storage: Starting upload', { path, fileSize: file.size, fileType: file.type });
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    console.log('Storage: Upload successful', { path, bytesTransferred: snapshot.bytesTransferred });

    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log('Download URL obtained:', downloadURL);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}