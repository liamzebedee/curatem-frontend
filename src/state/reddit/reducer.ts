import { createReducer } from '@reduxjs/toolkit';
import { loadItem } from './actions';

export interface RedditPostInfo {
    title: string
    selftext: string
    author: string
    created: number
}

export interface RedditState {
    [itemUrl: string]: RedditPostInfo;
}

const initialState: RedditState = {};

export default createReducer<RedditState>(initialState, (builder) =>
    builder.addCase(loadItem, (state, { payload: { itemUrl, response } }) => {
        state[itemUrl] = response;
        return state;
    }),
);
