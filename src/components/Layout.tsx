import { useMemo } from 'react'
import { Outlet } from 'react-router-dom'
import { BottomNav, TopNav } from './BottomNav'
import { photoUrl, shuffledPhotos } from '../lib/photos'

export function AppLayout() {
  return (
    <div className="app-shell">
      <TopNav />
      <div className="app-main">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  )
}

export function FlushLayout() {
  return (
    <div className="app-shell">
      <TopNav />
      <div className="app-main flush">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  )
}

export function MasonryHero() {
  const photos = useMemo(() => shuffledPhotos(8), [])

  return (
    <header className="hero">
      <div className="masonry">
        {photos.map((file) => (
          <img key={file} src={photoUrl(file)} alt="" />
        ))}
      </div>
      <div className="hero-title">
        <h1>
          The Solomons <em>Cook</em>
        </h1>
      </div>
    </header>
  )
}
