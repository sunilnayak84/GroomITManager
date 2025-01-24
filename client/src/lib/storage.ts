import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export async function uploadFile(file: File, path: string): Promise<string> {
  try {
    // Create a storage reference
    const storageRef = ref(storage, path);

    // Upload the file
    const snapshot = await uploadBytes(storageRef, file);
    console.log('File uploaded successfully:', snapshot);

    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log('File upload successful. Generated URL:', downloadURL);
    
    // Verify URL is accessible
    try {
      const response = await fetch(downloadURL, { 
        method: 'HEAD',
        mode: 'cors'
      });
      if (!response.ok) {
        console.error('Generated URL may not be accessible:', response.status);
      }
    } catch (error) {
      console.error('Error verifying download URL:', error);
    }

    return downloadURL;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
}
