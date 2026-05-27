/**
 * Referral Tracking & Management
 */
import { getSupabase } from './supabase-client.js';
import { CONFIG } from './config.js';

export const Referrals = {
  
  /**
   * Generate user's referral URL
   */
  getReferralUrl(username) {
    return `${CONFIG.app.domain}/signup.html?ref=${username}`;
  },
  
  /**
   * Copy referral link to clipboard
   */
  async copyReferralLink(username) {
    const url = this.getReferralUrl(username);
    
    try {
      await navigator.clipboard.writeText(url);
      return true;
    } catch (err) {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    }
  },
  
  /**
   * Record a referral event (called by admin after approval)
   */
  async recordReferralEvent({ referrerId, referredUserId, eventType }) {
    const supabase = await getSupabase();
    
    const earnings = CONFIG.app.referralEarnings[eventType] || 0;
    
    const { data, error } = await supabase
      .from('referral_events')
      .insert({
        referrer_id: referrerId,
        referred_user_id: referredUserId,
        event_type: eventType,
        earnings_amount: earnings
      })
      .select()
      .single();
      
    if (error) throw error;
    return data;
  },
  
  /**
   * Get recent referral activity for dashboard
   */
  async getRecentReferrals(userId, limit = 5) {
    const supabase = await getSupabase();
    
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        username,
        created_at,
        submissions (
          status,
          created_at
        )
      `)
      .eq('referred_by', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
      
    if (error) throw error;
    
    // Format for display
    return data.map(profile => ({
      username: profile.username,
      joinedAt: new Date(profile.created_at).toLocaleDateString(),
      status: profile.submissions?.[0]?.status || 'No activity yet',
      lastActivity: profile.submissions?.[0]?.created_at 
        ? new Date(profile.submissions[0].created_at).toLocaleDateString()
        : null
    }));
  },
  
  /**
   * Initialize referral tracking on page load
   */
  init() {
    // Capture referral code if present in URL
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    
    if (refCode && refCode.length === 8) {
      // Validate it's a real user
      this.validateReferralCode(refCode).then(isValid => {
        if (isValid) {
          localStorage.setItem('referral_code', refCode);
          localStorage.setItem('referral_timestamp', Date.now().toString());
          
          // Show visual feedback
          this.showReferralBanner(refCode);
        }
      });
    }
  },
  
  /**
   * Validate referral code against database
   */
  async validateReferralCode(code) {
    const supabase = await getSupabase();
    
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('referral_code', code)
      .single();
      
    return !error && !!data;
  },
  
  /**
   * Show temporary banner when referral is captured
   */
  showReferralBanner(referrerUsername) {
    const banner = document.createElement('div');
    banner.className = 'fixed top-4 right-4 z-50 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-slide-in';
    banner.innerHTML = `
      <span class="material-symbols-outlined">check_circle</span>
      <span>Referred by <strong>@${referrerUsername}</strong></span>
    `;
    
    document.body.appendChild(banner);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      banner.style.opacity = '0';
      banner.style.transform = 'translateY(-10px)';
      setTimeout(() => banner.remove(), 300);
    }, 5000);
  }
};

// Auto-init if on signup page
if (window.location.pathname.includes('signup.html')) {
  Referrals.init();
}