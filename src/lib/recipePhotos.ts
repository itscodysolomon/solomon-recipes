import { getProfile } from './api'
import { isSupabaseConfigured, requireSupabase } from './supabase'

const MAX_IMAGE_SIZE = 1600

export function recipePhotoUrl(path: string | null | undefined): string | null {
  if (!path) return null
  if (
    path.startsWith('http') ||
    path.startsWith('data:') ||
    path.startsWith('blob:') ||
    path.startsWith('./') ||
    path.startsWith('/')
  ) {
    return path
  }
  if (!isSupabaseConfigured) return null
  return requireSupabase().storage.from('recipe-photos').getPublicUrl(path).data.publicUrl
}

export async function saveRecipePhoto(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file.')
  }

  const image = await resizeImage(file)

  if (!isSupabaseConfigured) {
    return blobToDataUrl(image)
  }

  const profile = await getProfile()
  if (!profile?.household_id) throw new Error('No household')

  const path = `${profile.household_id}/${crypto.randomUUID()}.jpg`
  const { error } = await requireSupabase()
    .storage
    .from('recipe-photos')
    .upload(path, image, { contentType: 'image/jpeg' })
  if (error) throw error
  return path
}

async function resizeImage(file: File): Promise<Blob> {
  const source = await createImageBitmap(file)
  const scale = Math.min(1, MAX_IMAGE_SIZE / Math.max(source.width, source.height))
  const width = Math.max(1, Math.round(source.width * scale))
  const height = Math.max(1, Math.round(source.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Could not process that image.')
  context.drawImage(source, 0, 0, width, height)
  source.close()

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not process that image.'))),
      'image/jpeg',
      0.82,
    )
  })
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Could not read that image.'))
    reader.readAsDataURL(blob)
  })
}
