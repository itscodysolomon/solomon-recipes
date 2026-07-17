// Portrait-orientation photos only — the hero grid crops each to a uniform 3:4 tile.
export const PHOTO_POOL = [
  'vsco60202a1842bd8.jpg',
  'vsco60202b8073f70.jpg',
  'vsco60459d17be876.jpg',
  'vsco60b07cfe0b96d.jpg',
  'vsco61eb5ab74c2d1.jpg',
  'vsco623cb7a80e5da.jpg',
  'vsco_010123.jpg',
  'vsco_012426.jpg',
  'vsco_020825.jpg',
  'vsco_022324.jpg',
  'vsco_030825.jpg',
  'vsco_051723.jpg',
  'vsco_060122.jpg',
  'vsco_060123.jpg',
  'vsco_070724.jpg',
  'vsco_073025.jpg',
  'vsco_080125.jpg',
  'vsco_080325.jpg',
  'vsco_102625 (1).jpg',
  'vsco_102625 (2).jpg',
  'vsco_102625.jpg',
  'vsco_111724 (1).jpg',
  'vsco_111724.jpg',
]

export function photoUrl(filename: string): string {
  return `./photos/${encodeURIComponent(filename)}`
}

export function shuffledPhotos(count: number): string[] {
  const photos = [...PHOTO_POOL]
  for (let i = photos.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[photos[i], photos[j]] = [photos[j], photos[i]]
  }
  return photos.slice(0, count)
}
