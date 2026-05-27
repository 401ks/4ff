/**
 * Authentication Functions
 * Handles signup, login, logout, and session management
 */
import { getSupabase } from './supabase-client.js';
import { CONFIG } from './config.js';

export const Auth = {
  
  /**
   * Sign up new user
   */
  async signup({ fullName, username, email, password, agreedToTerms }) {
    if (!agreedToTerms) {
      throw new Error('You must agree to the Terms & Conditions');
    }
    
    const supabase = await getSupabase();
    
    // Check username availability first
    const { data: existing } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username)
      .single();
      
    if (existing) {
      throw new Error('Username is already taken');
    }
    
    // Create auth user with metadata
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          username: username,
          referred_by: localStorage.getItem('referral_code') || null
        }
      }
    });
    
    if (error) throw error;
    
    // Clear referral code after use
    localStorage.removeItem('referral_code');
    
    return { user: data.user, session: data.session };
  },
  
  /**
   * Sign in existing user
   */
  async login({ email, password }) {
    const supabase = await getSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    
    // Update last login
    if (data.user) {
      await supabase
        .from('profiles')
        .update({ last_login: new Date().toISOString() })
        .eq('id', data.user.id);
    }
    
    return { user: data.user, session: data.session };
  },
  
  /**
   * Sign out current user
   */
  async logout() {
    const supabase = await getSupabase();
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    // Clear local storage
    localStorage.removeItem('naijaassets_session');
    window.location.href = '/login.html';
  },
  
  /**
   * Get current session
   */
  async getCurrentSession() {
    const supabase = await getSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },
  
  /**
   * Get current user profile
   */
  async getCurrentProfile() {
    const supabase = await getSupabase();
    const session = await this.getCurrentSession();
    
    if (!session?.user) return null;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
      
    if (error) throw error;
    return data;
  },
  
  /**
   * Check if user is authenticated and redirect if not
   */
  async requireAuth(redirectPath = '/login.html') {
    const session = await this.getCurrentSession();
    
    if (!session?.user) {
      // Save intended destination for post-login redirect
      localStorage.setItem('redirect_after_login', window.location.pathname);
      window.location.href = redirectPath;
      return false;
    }
    
    return true;
  },
  
  /**
   * Capture referral code from URL parameter
   */
  captureReferralCode() {
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    
    if (refCode && refCode.length === 8) {
      // Store temporarily (expires in 24h)
      localStorage.setItem('referral_code', refCode);
      localStorage.setItem('referral_timestamp', Date.now().toString());
      return true;
    }
    return false;
  },
  
  /**
   * Validate stored referral code (check expiry)
   */
  getValidReferralCode() {
    const code = localStorage.getItem('referral_code');
    const timestamp = localStorage.getItem('referral_timestamp');
    
    if (!code || !timestamp) return null;
    
    // Check if within 24 hours
    const hoursElapsed = (Date.now() - parseInt(timestamp)) / (1000 * 60 * 60);
    if (hoursElapsed > 24) {
      localStorage.removeItem('referral_code');
      localStorage.removeItem('referral_timestamp');
      return null;
    }
    
    return code;
  }
};