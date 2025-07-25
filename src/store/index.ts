// src/store/index.ts - UPDATED with serialization fix
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import walletReducer from "./slices/walletSlice";
import uiReducer from "./slices/uiSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    wallet: walletReducer,
    ui: uiReducer,
  },
  // ADDED: Configure middleware to fix non-serializable value errors
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types that might have non-serializable values
        ignoredActions: [
          "persist/PERSIST",
          "persist/REHYDRATE",
          "persist/PAUSE",
          "persist/PURGE",
          "persist/REGISTER",
        ],
        // Ignore these field paths in actions (where Date objects might be passed)
        ignoredActionsPaths: [
          "meta.arg",
          "payload.timestamp", // This fixes your timestamp error
          "payload.lastUpdated",
          "payload.date",
          "payload.changes.timestamp", // ADDED: For real-time changes
          "payload.recentChanges.timestamp", // ADDED: For recent changes array
          "meta.baseQueryMeta",
        ],
        // Ignore these paths in the state tree
        ignoredPaths: [
          "wallet.lastUpdated",
          "wallet.tokens.lastUpdated",
          "wallet.recentChanges", // ADDED: For real-time changes array
          "auth.lastLogin",
          "ui.notifications.timestamp",
        ],
      },
      // Optional: Configure immutability check
      immutableCheck: {
        ignoredPaths: [
          "wallet.tokens",
          "wallet.wallets",
          "wallet.recentChanges",
        ],
      },
    }),
  // Enable Redux DevTools in development
  devTools: process.env.NODE_ENV !== "production",
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
