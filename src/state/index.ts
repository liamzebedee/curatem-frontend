import { configureStore, getDefaultMiddleware } from '@reduxjs/toolkit'
import { save, load } from 'redux-localstorage-simple'

// import application from './application/reducer'
// import { updateVersion } from './global/actions'
// import user from './user/reducer'
// import transactions from './transactions/reducer'
// import swap from './swap/reducer'
// import mint from './mint/reducer'
// import lists from './lists/reducer'
// import burn from './burn/reducer'
import reddit from './reddit/reducer'
import markets from './markets/reducer'
import {reducer as balancerSwapper } from '../components/BalancerSwapper'

const PERSISTED_KEYS: string[] = ['user', 'transactions', 'lists']

const store = configureStore({
  reducer: {
    reddit,
    markets,
    balancerSwapper
  },
  middleware: [...getDefaultMiddleware({ thunk: true }), save({ states: PERSISTED_KEYS })],
  preloadedState: load({ states: PERSISTED_KEYS })
})

// store.dispatch(updateVersion())

export default store

export type AppState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
