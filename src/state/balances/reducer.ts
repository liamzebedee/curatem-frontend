import { BigNumber } from '@ethersproject/bignumber';
import { createReducer } from '@reduxjs/toolkit';
import { updateBalances } from './actions';


export interface BalancesState {
    tokens: {
        [token: string]: Balances
    }
}

export interface Balances {
    [holder: string]: BigNumber
}

const initialState: BalancesState = {
    tokens: {}
};

export default createReducer<BalancesState>(initialState, (builder) =>
    builder.addCase(updateBalances, (state, { payload }) => {
        const { token } = payload
        if(!state.tokens[token]) {
            state.tokens[token] = {}
        }

        Object.entries(payload.balances).map(([user, balance]) => {
            state.tokens[token][user] = balance
        })

        return state;
    }),
);
