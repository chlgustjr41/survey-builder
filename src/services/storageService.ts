import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { storage } from './firebase'
import { nanoid } from 'nanoid'

/**
 * Deletes a file from Firebase Storage given its download URL.
 * The path is extracted from the URL's /o/ segment.
 */
export async function deleteStorageFile(url: string): Promise<void> {
  const match = url.match(/\/o\/(.+?)(\?|$)/)
  const path = match ? decodeURIComponent(match[1]) : null
  if (!path) return
  await deleteObject(storageRef(storage, path))
}

export async function uploadImage(
  file: File,
  folder: 'result-images' | 'email-images' | 'qr-logos'
): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'png'
  const path = `${folder}/${nanoid()}.${ext}`
  const fileRef = storageRef(storage, path)
  await uploadBytes(fileRef, file)
  return getDownloadURL(fileRef)
}
