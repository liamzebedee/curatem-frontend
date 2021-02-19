import { useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppState } from '../../state'

// export function useBurnState(): AppState['burn'] {
//   return useSelector<AppState, AppState['burn']>(state => state.burn)
// }

export function useMarketsState(): AppState['markets'] {
  return useSelector<AppState, AppState['markets']>(state => state.markets)
}
