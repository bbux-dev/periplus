import { useNavigate } from 'react-router-dom'

/**
 * Returns a back-navigation handler that falls back to `fallback` when there
 * is no in-app history to return to (e.g. the app was opened fresh via a
 * bookmark or home-screen icon in standalone PWA mode).
 *
 * Usage:
 *   const goBack = useBackOrHome('/')            // DomainPage
 *   const goBack = useBackOrHome(`/d/${domain}`) // EntryTypePage
 */
export function useBackOrHome(fallback: string = '/') {
  const navigate = useNavigate()
  return () => {
    // history.length === 1 means this is the first (and only) history entry —
    // there is no in-app page to go back to; navigate to the logical parent.
    if (window.history.length <= 1) {
      navigate(fallback, { replace: true })
    } else {
      navigate(-1)
    }
  }
}
