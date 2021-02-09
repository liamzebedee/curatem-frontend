import { useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { loadItem } from './actions'
import { AppState } from '../../state'

// export function useBurnState(): AppState['burn'] {
//   return useSelector<AppState, AppState['burn']>(state => state.burn)
// }

export function useRedditState(): AppState['reddit'] {
  return useSelector<AppState, AppState['reddit']>(state => state.reddit)
}

export function useRedditPostAPI(): {
  fetchPost: (itemUrl: string) => void
} {
  const dispatch = useDispatch()

  const fetchPost = useCallback(
    async (itemUrl: string) => {
      // TODO: validate URL.
      
      const url = new URL(itemUrl) // https://www.reddit.com/r/ethereum/comments/hbjx25/the_great_reddit_scaling_bakeoff/1612834360869
      const REDDIT_URL_REGEX = /r\/([a-zA-Z0-9]+)\/comments\/([a-zA-Z0-9]+)\//
      const matches = url.pathname.match(REDDIT_URL_REGEX)
      if(!matches || matches.length != 3) {
        throw new Error("incorrect number of matches")
      }
      const id = matches[2]

      const REDDIT_COMMENT = 't1'
      const REDDIT_POST = 't3'

      const apiResponse = await fetch(`https://api.reddit.com/api/info/?id=${REDDIT_POST}_${id}`)
        .then(response => response.json())

      const body = apiResponse.data.children[0].data
      const { title, selftext, author, created } = body
      
      const response = { title, selftext, author, created }

      dispatch(loadItem({ itemUrl, response }))
    },
    [dispatch]
  )

  return {
    fetchPost
  }
}