import { createContext, useContext, useState, useRef, useEffect } from 'react'

export const FOCUS_SECS = 30 * 60
export const BREAK_SECS = 5  * 60

function playDone() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    ;[0, 0.15, 0.3].forEach((t, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.frequency.value = [523, 659, 784][i]
      gain.gain.setValueAtTime(0.18, ctx.currentTime + t)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.4)
      osc.start(ctx.currentTime + t)
      osc.stop(ctx.currentTime + t + 0.4)
    })
  } catch (_) {}
}

function playWarning() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    ;[0, 0.25, 0.5].forEach(t => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.frequency.value = 440
      gain.gain.setValueAtTime(0.12, ctx.currentTime + t)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.15)
      osc.start(ctx.currentTime + t)
      osc.stop(ctx.currentTime + t + 0.15)
    })
  } catch (_) {}
}

const PomodoroContext = createContext(null)

export function PomodoroProvider({ children }) {
  const [mode,   setMode]   = useState('idle')
  const [secs,   setSecs]   = useState(FOCUS_SECS)
  const [cycles, setCycles] = useState(0)
  const intRef = useRef(null)

  useEffect(() => {
    if (mode === 'idle') { clearInterval(intRef.current); return }
    clearInterval(intRef.current)
    intRef.current = setInterval(() => {
      setSecs(s => {
        if (s === 10) playWarning()
        if (s === 0) {
          playDone()
          if (mode === 'focus') { setCycles(c => c + 1); setMode('break'); return BREAK_SECS }
          setMode('focus'); return FOCUS_SECS
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(intRef.current)
  }, [mode])

  function startFocus()  { setSecs(FOCUS_SECS); setMode('focus') }
  function resumeTimer() { setMode(prev => prev === 'idle' ? 'focus' : prev) }
  function pauseTimer()  { clearInterval(intRef.current); setMode('idle') }
  function resetTimer()  { clearInterval(intRef.current); setMode('idle'); setSecs(FOCUS_SECS); setCycles(0) }

  return (
    <PomodoroContext.Provider value={{ mode, secs, cycles, startFocus, resumeTimer, pauseTimer, resetTimer }}>
      {children}
    </PomodoroContext.Provider>
  )
}

export function usePomodoroContext() {
  const ctx = useContext(PomodoroContext)
  if (!ctx) throw new Error('usePomodoroContext must be used inside PomodoroProvider')
  return ctx
}
