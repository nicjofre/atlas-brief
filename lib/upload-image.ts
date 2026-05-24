'use client'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './db/types'

type DB = SupabaseClient<Database>

const MAX_WIDTH = 1600
const JPEG_QUALITY = 0.85

/**
 * Resize an image File to MAX_WIDTH using canvas, export as JPEG.
 * Falls back to the original file if it's smaller than MAX_WIDTH already.
 */
async function resizeImage(file: File): Promise<Blob> {
  // createImageBitmap with imageOrientation respects EXIF rotation
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const { width, height } = bitmap

  if (width <= MAX_WIDTH) {
    bitmap.close()
    return file
  }

  const scale = MAX_WIDTH / width
  const targetW = Math.round(width * scale)
  const targetH = Math.round(height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = targetW
  canvas.height = targetH
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    throw new Error('Canvas 2D context unavailable')
  }
  ctx.drawImage(bitmap, 0, 0, targetW, targetH)
  bitmap.close()

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      blob => (blob ? resolve(blob) : reject(new Error('Canvas toBlob failed'))),
      'image/jpeg',
      JPEG_QUALITY,
    )
  })
}

export async function uploadPropertyAsset(
  db: DB,
  args: { file: File; pathPrefix: string }
): Promise<{ path: string; publicUrl: string }> {
  const { file, pathPrefix } = args

  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image')
  }

  const blob = await resizeImage(file)
  const ext = blob.type === 'image/jpeg' ? 'jpg' : file.name.split('.').pop() ?? 'jpg'
  const path = `${pathPrefix}-${Date.now()}.${ext}`

  const { error } = await db.storage.from('property-assets').upload(path, blob, {
    contentType: blob.type,
    upsert: false,
  })
  if (error) throw error

  // We use authenticated signed reads; the public_url is generated lazily on read,
  // so for storage we just persist the path.
  return { path, publicUrl: path }
}

/**
 * Get a signed URL valid for the session for displaying a stored image.
 */
export async function getSignedAssetUrl(db: DB, path: string, expiresIn = 60 * 60): Promise<string | null> {
  const { data, error } = await db.storage.from('property-assets').createSignedUrl(path, expiresIn)
  if (error || !data) return null
  return data.signedUrl
}

