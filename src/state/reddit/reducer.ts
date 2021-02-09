import { createReducer } from '@reduxjs/toolkit'
import { loadItem } from './actions'

export interface RedditAPIObject {
  [k: string]: any
}

export interface RedditState {
  [itemUrl: string]: RedditAPIObject
}

const initialState: RedditState = {
}

export default createReducer<RedditState>(initialState, builder =>
  builder.addCase(loadItem, (state, { payload: { itemUrl, response } }) => {
    state[itemUrl] = response
    return state
  })
)
