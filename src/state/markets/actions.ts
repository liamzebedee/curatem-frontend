import { createAction } from '@reduxjs/toolkit';

export const loadMarket = createAction<{ marketAddress: string; response: any }>('markets/load');
