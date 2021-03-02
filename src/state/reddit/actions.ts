import { createAction } from '@reduxjs/toolkit';

export const loadItem = createAction<{ itemUrl: string; response: any }>('reddit/fetchItem');
