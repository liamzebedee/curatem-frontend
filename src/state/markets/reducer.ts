import { createReducer } from '@reduxjs/toolkit';
import { loadMarket } from './actions';

export interface MarketsState {
    [market: string]: Record<string, unknown>;
}

const initialState: MarketsState = {};

export default createReducer<MarketsState>(initialState, (builder) =>
    builder.addCase(loadMarket, (state, { payload: { marketAddress, response } }) => {
        state[marketAddress] = response;
        return state;
    }),
);
