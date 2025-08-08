import React, { useState } from 'react'
import FPSScene from './FPSScene'

export default function App(){
  const [showControls, setShowControls] = useState(true)
  return (
    <div className="w-screen h-screen flex flex-col">
      <header className="p-4 flex items-center justify-between bg-black/30">
        <div className="text-lg font-semibold">Echoes in the Canopy — FPS Prototype</div>
        <div className="text-sm opacity-80">WASD Move • Mouse Look • Click to Shoot • E Interact</div>
      </header>
      <main className="flex-1 relative">
        <FPSScene onShowControls={(v)=>setShowControls(v)} />
        {showControls && (
          <div className="absolute bottom-6 left-6 bg-black/50 p-3 rounded-md text-sm">
            Click on the canvas to lock pointer. Press Esc to unlock.
          </div>
        )}
      </main>
      <footer className="p-3 text-xs text-center bg-black/20">Prototype — not final art. Deploy via Vercel or run locally with <code>npm install</code> and <code>npm run dev</code>.</footer>
    </div>
  )
}
