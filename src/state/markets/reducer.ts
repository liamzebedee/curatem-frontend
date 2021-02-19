import { createReducer } from '@reduxjs/toolkit'
import { loadMarket } from './actions'

export interface Market {
}

export interface MarketsState {
  [market: string]: Market
}

const initialState: MarketsState = {
}

export default createReducer<MarketsState>(initialState, builder =>
  builder.addCase(loadMarket, (state, { payload: { marketAddress, response } }) => {
    state[marketAddress] = response
    return state
  })
)
