import { createAction } from '@reduxjs/toolkit';
import { Balances } from './reducer'

export const updateBalances = createAction<{ token: string, balances: Balances }>('balances/update');
