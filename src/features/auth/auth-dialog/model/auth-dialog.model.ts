'use client';

import { create } from 'zustand';

type AuthDialogState = {
    open: boolean;
    defaultTab: 'signin' | 'signup';
    openSignIn: () => void;
    openSignUp: () => void;
    close: () => void;
};

export const useAuthDialog = create<AuthDialogState>((set) => ({
    open: false,
    defaultTab: 'signin',
    openSignIn: () => set({ open: true, defaultTab: 'signin' }),
    openSignUp: () => set({ open: true, defaultTab: 'signup' }),
    close: () => set({ open: false }),
}));
