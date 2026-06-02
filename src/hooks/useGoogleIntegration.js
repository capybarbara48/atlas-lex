import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export function calEventToItem(ev) {
  const startRaw = ev.start?.dateTime ?? ev.start?.date ?? null
  const allDay   = !ev.start?.dateTime
  return {
    id:        'gcal_' + ev.id,
    title:     ev.summary ?? '(sem título)',
    due_date:  startRaw,
    status:    'pendente',
    priority:  'media',
    assigned_to: null,
    source:    'google_calendar',
    sourceUrl: ev.htmlLink ?? null,
    allDay,
    startTime: allDay ? null : new Date(startRaw).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  }
}

export function gTaskToItem(gt) {
  return {
    id:        'gtask_' + gt.id,
    title:     gt.title ?? '(sem título)',
    due_date:  gt.due ?? null,
    status:    gt.status === 'completed' ? 'concluida' : 'pendente',
    priority:  'media',
    assigned_to: null,
    source:    'google_tasks',
  }
}

async function getValidToken() {
  try {
    const { data: row, error } = await supabase
      .from('google_tokens')
      .select('access_token, refresh_token, expires_at')
      .maybeSingle()

    if (error || !row) return null

    const buffer = new Date(Date.now() + 5 * 60 * 1000)
    if (new Date(row.expires_at) > buffer) return row.access_token

    // Expired — try to refresh via Edge Function
    const { data: refreshed, error: refreshErr } =
      await supabase.functions.invoke('refresh-google-token')
    if (refreshErr || !refreshed?.access_token) return null
    return refreshed.access_token
  } catch {
    return null
  }
}

export function useGoogleIntegration() {
  const [token,  setToken]  = useState(null)
  const [status, setStatus] = useState('loading') // 'loading' | 'ok' | 'disconnected'

  useEffect(() => {
    getValidToken().then(t => {
      setToken(t ?? null)
      setStatus(t ? 'ok' : 'disconnected')
    })
  }, [])

  const fetchCalendarEvents = useCallback(async (timeMin, timeMax) => {
    if (!token) return []
    try {
      const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events')
      url.searchParams.set('timeMin', timeMin)
      url.searchParams.set('timeMax', timeMax)
      url.searchParams.set('singleEvents', 'true')
      url.searchParams.set('orderBy', 'startTime')
      url.searchParams.set('maxResults', '100')
      const resp = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } })
      if (!resp.ok) return []
      const data = await resp.json()
      return (data.items ?? []).map(calEventToItem)
    } catch { return [] }
  }, [token])

  const fetchGoogleTasks = useCallback(async () => {
    if (!token) return []
    try {
      const resp = await fetch(
        'https://www.googleapis.com/tasks/v1/lists/@default/tasks?showCompleted=false&maxResults=100',
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!resp.ok) return []
      const data = await resp.json()
      return (data.items ?? []).filter(t => t.title).map(gTaskToItem)
    } catch { return [] }
  }, [token])

  return { token, status, fetchCalendarEvents, fetchGoogleTasks }
}
