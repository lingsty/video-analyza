import { useState, useEffect, useRef } from 'react'
import YouTube from 'react-youtube'

const getYouTubeId = (url) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?\s*v=|\&v=)([^#\&\?]*).*/
  const match = url.match(regExp)
  return (match && match[2].length === 11) ? match[2] : null
}

const formatTime = (seconds) => {
  if (isNaN(seconds)) return "00:00"
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

export default function App() {
  const [videoUrl, setVideoUrl] = useState('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
  const [inputUrl, setInputUrl] = useState('')
  const [markers, setMarkers] = useState([])
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [autoPause, setAutoPause] = useState(false)
  const [flashEffect, setFlashEffect] = useState(false)

  const [hotkeys, setHotkeys] = useState(() => {
    const saved = localStorage.getItem('videoAnalyzerHotkeys')
    return saved ? JSON.parse(saved) : { p: 'Perfektní příjem', o: 'Obrana v poli', c: 'Chyba / Bod soupeře' }
  })

  const playerRef = useRef(null)

  useEffect(() => {
    localStorage.setItem('videoAnalyzerHotkeys', JSON.stringify(hotkeys))
  }, [hotkeys])

  const handleHotkeyChange = (key, newValue) => {
    setHotkeys(prev => ({ ...prev, [key]: newValue }))
  }

  const addMarker = (label) => {
    if (!playerRef.current) return
    const currentSeconds = playerRef.current.getCurrentTime()

    if (autoPause) {
      playerRef.current.pauseVideo()
    }

    setFlashEffect(true)
    setTimeout(() => setFlashEffect(false), 200)

    const newMarker = {
      id: Date.now(),
      time: formatTime(currentSeconds),
      rawTime: currentSeconds,
      label: label
    }

    setMarkers((prevMarkers) => {
      const updated = [...prevMarkers, newMarker]
      return updated.sort((a, b) => a.rawTime - b.rawTime)
    })
  }

  const rewindVideo = () => {
    if (playerRef.current) {
      const currentTime = playerRef.current.getCurrentTime()
      playerRef.current.seekTo(Math.max(0, currentTime - 3), true)
    }
  }

  const adjustMarkerTime = (idToAdjust, seconds, e) => {
    e.stopPropagation() 
    setMarkers(prevMarkers => {
      const updated = prevMarkers.map(marker => {
        if (marker.id === idToAdjust) {
          const newTime = Math.max(0, marker.rawTime + seconds)
          return {
            ...marker,
            rawTime: newTime,
            time: formatTime(newTime)
          }
        }
        return marker
      })
      return updated.sort((a, b) => a.rawTime - b.rawTime)
    })
  }

  const deleteMarker = (idToRemove, e) => {
    e.stopPropagation()
    setMarkers(markers.filter(marker => marker.id !== idToRemove))
  }

  const seekToTime = (seconds) => {
    if (playerRef.current) {
      playerRef.current.seekTo(seconds, true)
      playerRef.current.playVideo()
    }
  }

  const changeSpeed = (rate) => {
    setPlaybackSpeed(rate)
    if (playerRef.current) {
      playerRef.current.setPlaybackRate(rate)
    }
  }

const exportToObsidian = () => {
    if (markers.length === 0) {
      alert("Zatím nemáš žádné značky k exportu!")
      return
    }

    const currentVideoId = getYouTubeId(videoUrl);

    // PŘIDÁNO: Odkaz na centrální soubor hned na prvním řádku
    let markdownContent = `[[Analyza pro hráčů]]\n\n# Analýza videa\n\n**Zdroj:** ${videoUrl}\n\n`
    
    markdownContent += `## Rychlý přehled (Tabulka)\n\n| Čas | Akce | Poznámka |\n|---|---|---|\n`
    markers.forEach(marker => {
      markdownContent += `| **[${marker.time}](https://youtu.be/${currentVideoId}?t=${Math.floor(marker.rawTime)})** | ${marker.label} |  |\n`
    })

    markdownContent += `\n## Detailní záznam (Deník)\n\n`
    markers.forEach(marker => {
      markdownContent += `- **[${marker.time}](https://youtu.be/${currentVideoId}?t=${Math.floor(marker.rawTime)})** ${marker.label}\n`
    })

    const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Analyza_videa_${new Date().toISOString().slice(0, 10)}.md`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT') return

      const key = e.key.toLowerCase()
      if (hotkeys[key]) {
        e.preventDefault()
        addMarker(hotkeys[key])
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [hotkeys, autoPause])

  const handleLoadVideo = (e) => {
    e.preventDefault()
    if (inputUrl.trim()) {
      setVideoUrl(inputUrl)
      setMarkers([])
    }
  }

  const onPlayerReady = (event) => {
    playerRef.current = event.target
    playerRef.current.setPlaybackRate(playbackSpeed)
  }

  const videoId = getYouTubeId(videoUrl)

  return (
    <div className="min-h-screen bg-gray-950 text-slate-100 font-sans">
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-xl font-bold tracking-tight text-indigo-400">
          Video Cut-List <span className="text-xs font-normal text-slate-500">v2.1 PRO</span>
        </h1>

        <form onSubmit={handleLoadVideo} className="flex gap-2 w-full sm:w-auto max-w-md">
          <input
            type="text"
            placeholder="Vlož URL videa z YouTube..."
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            className="bg-gray-950 border border-gray-800 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 flex-1 min-w-[260px]"
          />
          <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded-lg text-sm font-medium transition cursor-pointer">
            Načíst
          </button>
        </form>
      </header>

      <main className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
        <div className="lg:col-span-2 space-y-4">

          <div className={`aspect-video bg-gray-900 border ${flashEffect ? 'border-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.5)]' : 'border-gray-800'} rounded-xl overflow-hidden shadow-2xl relative flex items-center justify-center transition-all duration-100`}>
            {videoId ? (
              <YouTube
                videoId={videoId}
                onReady={onPlayerReady}
                opts={{
                  width: '100%',
                  height: '100%',
                  playerVars: { autoplay: 0, controls: 1 },
                }}
                className="w-full h-full aspect-video pointer-events-auto"
              />
            ) : (
              <span className="text-rose-400 text-sm">Neplatné YouTube ID. Zkontroluj odkaz.</span>
            )}
          </div>

          <div className="bg-gray-900 p-3 border border-gray-800 rounded-xl flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium uppercase tracking-wider mr-2">Rychlost:</span>
              {[0.5, 0.75, 1, 1.25, 1.5].map(rate => (
                <button
                  key={rate}
                  onClick={() => changeSpeed(rate)}
                  className={`px-2.5 py-1 text-xs rounded border transition cursor-pointer ${playbackSpeed === rate ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/50 font-bold' : 'bg-gray-950 text-slate-400 border-gray-800 hover:border-gray-600'}`}
                >
                  {rate}x
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={rewindVideo}
                className="flex items-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-slate-300 px-3 py-1.5 rounded-lg text-sm font-medium transition border border-gray-700 cursor-pointer"
                title="Vrátit video o 3 vteřiny zpět"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 17l-5-5 5-5" /><path d="M18 17l-5-5 5-5" /></svg>
                -3s videa
              </button>

              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={autoPause}
                    onChange={(e) => setAutoPause(e.target.checked)}
                  />
                  <div className={`block w-10 h-6 rounded-full transition-colors ${autoPause ? 'bg-indigo-500' : 'bg-gray-800'}`}></div>
                  <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${autoPause ? 'translate-x-4' : ''}`}></div>
                </div>
                <span className="text-sm text-slate-300 group-hover:text-white transition">Auto-Pause při zápisu</span>
              </label>
            </div>
          </div>

          <div className="bg-gray-900 p-4 border border-gray-800 rounded-xl">
            <h3 className="text-sm font-semibold text-slate-400 mb-3">Dynamické zkratky (Klikni na text pro úpravu)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {['p', 'o', 'c'].map(key => (
                <div key={key} className="flex items-center gap-3 bg-gray-950 p-2 border border-gray-800/80 rounded-lg focus-within:border-indigo-500/50 transition">
                  <kbd className="bg-slate-800 text-slate-300 border border-slate-700 px-2.5 py-1 rounded font-bold font-mono uppercase">{key}</kbd>
                  <input
                    type="text"
                    value={hotkeys[key]}
                    onChange={(e) => handleHotkeyChange(key, e.target.value)}
                    className="bg-transparent text-sm text-slate-300 focus:outline-none w-full"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl flex flex-col h-[calc(100vh-140px)] shadow-xl">
          <div className="p-4 border-b border-gray-800 flex justify-between items-center">
            <h2 className="font-semibold text-slate-200">Zaznamenané momenty ({markers.length})</h2>
            <button
              onClick={exportToObsidian}
              className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-3 py-1.5 rounded-md transition cursor-pointer shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:shadow-[0_0_20px_rgba(79,70,229,0.5)]"
            >
              Exportovat .MD
            </button>
          </div>

          <div className="p-4 overflow-y-auto flex-1">
            <div className="space-y-2">
              {markers.map((marker) => (
                <div
                  key={marker.id}
                  onClick={() => seekToTime(marker.rawTime)}
                  className="flex items-center gap-3 bg-gray-950 p-3 border border-gray-800/60 rounded-lg hover:border-indigo-500/30 hover:bg-gray-800 transition cursor-pointer group"
                >
                  <span className="font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded text-sm font-bold group-hover:bg-indigo-500 group-hover:text-white transition">
                    {marker.time}
                  </span>
                  <span className="text-sm text-slate-300 flex-1">{marker.label}</span>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={(e) => adjustMarkerTime(marker.id, -3, e)}
                      className="px-2 py-1 text-xs font-mono font-bold text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition cursor-pointer"
                      title="Opravit čas: Posunout tuto značku o 3s zpět"
                    >
                      -3s
                    </button>
                    <button
                      onClick={(e) => deleteMarker(marker.id, e)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition cursor-pointer"
                      title="Smazat značku"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                    </button>
                  </div>
                </div>
              ))}
              {markers.length === 0 && (
                <div className="text-center text-slate-600 py-12 text-sm flex flex-col items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                  Stiskni P, O, C pro uložení momentu.
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}