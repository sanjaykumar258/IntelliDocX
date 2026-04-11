import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  isIntelliBotOpen: boolean;
}

const initialState: UIState = {
  isIntelliBotOpen: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setIntelliBotOpen: (state, action: PayloadAction<boolean>) => {
      state.isIntelliBotOpen = action.payload;
    },
    toggleIntelliBot: (state) => {
      state.isIntelliBotOpen = !state.isIntelliBotOpen;
    },
  },
});

export const { setIntelliBotOpen, toggleIntelliBot } = uiSlice.actions;
export default uiSlice.reducer;
