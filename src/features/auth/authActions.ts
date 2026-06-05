import { supabase } from '../../lib/supabase';
import { AppDispatch } from '../../store';
import { clearLibrary } from '../library/librarySlice';
import { setLoading, setError, setUser } from './authSlice';

export const signInWithGoogle = () => async (dispatch: AppDispatch) => {
    dispatch(setLoading(true));

    // Explicitly use the current origin for redirect to avoid cross-domain issues in multi-environment setups
    const redirectUrl = window.location.origin;

    const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: redirectUrl,
        },
    });

    if (error) {
        dispatch(setError(error.message));
    }
};

export const signOut = () => async (dispatch: AppDispatch) => {
    dispatch(setLoading(true));
    const { error } = await supabase.auth.signOut();
    if (error) {
        dispatch(setError(error.message));
    } else {
        dispatch(setUser(null));
        dispatch(clearLibrary());
    }
};
