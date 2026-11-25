import { useEffect, useMemo, useRef, useState } from 'react'

const TILE_SIZE = 256
const CAMPUS_CENTER = { latitude: 22.805, longitude: 86.202 }

function toWorld({ latitude, longitude }, zoom) {
  const scale = TILE_SIZE * (2 ** zoom)
  const lat = Math.max(-85.0511, Math.min(85.0511, latitude)) * Math.PI / 180
  return {
    x: ((longitude + 180) / 360) * scale,
    y: ((1 - Math.log(Math.tan(lat) + 1 / Math.cos(lat)) / Math.PI) / 2) * scale,
  }
}

export default function LiveTrackingMap({ locations }) {
  const mapRef = useRef(null)
  const dragRef = useRef(null)
  const followRef = useRef(true)
  const [following, setFollowing] = useState(true)
  const [size, setSize] = useState({ width: 720, height: 390 })
  const [zoom, setZoom] = useState(15)
  const [mapCenter, setMapCenter] = useState(null)
  const locationKey = useMemo(() => locations.map((entry) => `${entry.userId}:${Number(entry.latitude).toFixed(5)}:${Number(entry.longitude).toFixed(5)}`).sort().join('|'), [locations])

  useEffect(() => {
    const element = mapRef.current
    if (!element) return undefined
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!locations.length || !followRef.current) return
    const latitude = locations.reduce((sum, location) => sum + location.latitude, 0) / locations.length
    const longitude = locations.reduce((sum, location) => sum + location.longitude, 0) / locations.length
    setMapCenter(toWorld({ latitude, longitude }, zoom))
  }, [locationKey, locations, zoom])

  const center = mapCenter || toWorld(CAMPUS_CENTER, zoom)
  const centerTileX = Math.floor(center.x / TILE_SIZE)
  const centerTileY = Math.floor(center.y / TILE_SIZE)
  const tileColumns = Math.ceil(size.width / TILE_SIZE) + 2
  const tileRows = Math.ceil(size.height / TILE_SIZE) + 2
  const firstTileX = centerTileX - Math.floor(tileColumns / 2)
  const firstTileY = centerTileY - Math.floor(tileRows / 2)
  const worldTiles = 2 ** zoom
  const routeEndpoints = locations.length >= 2 ? locations.slice(0, 2).map((location) => {
    const point = toWorld(location, zoom)
    return { x: size.width / 2 + point.x - center.x, y: size.height / 2 + point.y - center.y }
  }) : []
  const tiles = []
  for (let row = 0; row < tileRows; row += 1) {
    for (let column = 0; column < tileColumns; column += 1) {
      const tileX = firstTileX + column
      const tileY = firstTileY + row
      if (tileY < 0 || tileY >= worldTiles) continue
      const wrappedX = ((tileX % worldTiles) + worldTiles) % worldTiles
      tiles.push({
        key: `${zoom}/${wrappedX}/${tileY}`,
        src: `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${tileY}.png`,
        left: size.width / 2 + tileX * TILE_SIZE - center.x,
        top: size.height / 2 + tileY * TILE_SIZE - center.y,
      })
    }
  }

  function panStart(event) {
    if (event.target.closest('button')) return
    followRef.current = false
    setFollowing(false)
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { x: event.clientX, y: event.clientY, center }
  }

  function panMove(event) {
    if (!dragRef.current) return
    setMapCenter({
      x: dragRef.current.center.x - (event.clientX - dragRef.current.x),
      y: dragRef.current.center.y - (event.clientY - dragRef.current.y),
    })
  }

  function panEnd() { dragRef.current = null }

  return <div className="relative isolate overflow-hidden rounded-2xl border border-line bg-sky-50">
    <div ref={mapRef} className="relative h-[17rem] touch-none cursor-grab overflow-hidden active:cursor-grabbing sm:h-[25rem]" onPointerDown={panStart} onPointerMove={panMove} onPointerUp={panEnd} onPointerCancel={panEnd}>
      {tiles.map((tile) => <img key={tile.key} src={tile.src} alt="" draggable="false" className="pointer-events-none absolute max-w-none select-none" style={{ width: TILE_SIZE, height: TILE_SIZE, left: tile.left, top: tile.top }} />)}
      {locations.length === 0 && <div className="pointer-events-none absolute left-1/2 top-1/2 z-[5] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/80 bg-white/95 px-5 py-3 text-center shadow-lg"><p className="text-sm font-bold text-ink">No live locations yet</p><p className="mt-1 text-xs font-medium text-stone">Requester and helper can share to appear here.</p></div>}
      {routeEndpoints.length === 2 && <svg aria-label="Line connecting requester and helper locations" className="pointer-events-none absolute inset-0 z-[5] size-full overflow-visible"><line x1={routeEndpoints[0].x} y1={routeEndpoints[0].y} x2={routeEndpoints[1].x} y2={routeEndpoints[1].y} stroke="white" strokeWidth="9" strokeLinecap="round"/><line x1={routeEndpoints[0].x} y1={routeEndpoints[0].y} x2={routeEndpoints[1].x} y2={routeEndpoints[1].y} stroke="#07866f" strokeWidth="5" strokeLinecap="round" strokeDasharray="10 8"/></svg>}
      {locations.map((location) => {
        const point = toWorld(location, zoom)
        const left = size.width / 2 + point.x - center.x
        const top = size.height / 2 + point.y - center.y
        if (left < -100 || left > size.width + 100 || top < -80 || top > size.height + 80) return null
        const isHelper = location.role === 'helper'
        return <div key={location.userId} className="absolute z-10 -translate-x-1/2 -translate-y-full" style={{ left, top }}>
          <div className="mb-1 whitespace-nowrap rounded-full border border-white/70 bg-ink px-2.5 py-1 text-[0.65rem] font-bold text-white shadow-lg">{location.name} · {isHelper ? 'Helper' : 'Requester'}</div>
          <div className={`relative mx-auto flex size-10 items-center justify-center rounded-full border-[3px] border-white text-xs font-extrabold text-white shadow-xl ${isHelper ? 'bg-jade' : 'bg-orange-500'}`}>{location.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}<span className={`absolute -bottom-1.5 left-1/2 size-2.5 -translate-x-1/2 rotate-45 border-b-2 border-r-2 border-white ${isHelper ? 'bg-jade' : 'bg-orange-500'}`} /></div>
        </div>
      })}
      <div className="absolute right-3 top-3 z-20 flex flex-col gap-1 overflow-hidden rounded-xl border border-white/80 bg-white/95 shadow-lg">
        <button type="button" aria-label={following ? 'Following live location' : 'Follow live location'} title={following ? 'Following live location' : 'Follow live location'} onClick={() => { followRef.current = true; setFollowing(true); if (locations.length) { const latitude = locations.reduce((sum, location) => sum + location.latitude, 0) / locations.length; const longitude = locations.reduce((sum, location) => sum + location.longitude, 0) / locations.length; setMapCenter(toWorld({ latitude, longitude }, zoom)) } }} className={`size-11 text-sm font-bold ${following ? 'bg-jade/10 text-jade-deep' : 'text-ink hover:bg-mist'}`}>◎</button>
        <button type="button" aria-label="Zoom in" onClick={() => setZoom((value) => Math.min(19, value + 1))} className="size-11 border-t border-line text-lg font-bold text-ink hover:bg-mist">+</button>
        <button type="button" aria-label="Zoom out" onClick={() => setZoom((value) => Math.max(3, value - 1))} className="size-11 border-t border-line text-lg font-bold text-ink hover:bg-mist">−</button>
      </div>
      <div className="absolute bottom-3 left-3 z-20 rounded-lg bg-white/90 px-2.5 py-1.5 text-[0.6rem] font-semibold text-stone shadow">Map tiles © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline">OpenStreetMap contributors</a></div>
    </div>
    <div className="flex flex-wrap items-center gap-4 border-t border-line bg-white px-4 py-3 text-xs font-semibold text-stone"><span className="inline-flex items-center gap-2"><i className="size-2.5 rounded-full bg-jade"/>Helper</span><span className="inline-flex items-center gap-2"><i className="size-2.5 rounded-full bg-orange-500"/>Requester</span><span className="ml-auto">Drag to move · use + / − to zoom</span></div>
  </div>
}
