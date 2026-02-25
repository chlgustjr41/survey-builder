import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from './firebase'
import { nanoid } from 'nanoid'

export async function uploadImage(
  file: File,
  folder: 'result-images' | 'email-images'
): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'png'
  const path = `${folder}/${nanoid()}.${ext}`
  const fileRef = storageRef(storage, path)
  await uploadBytes(fileRef, file)
  return getDownloadURL(fileRef)
}
