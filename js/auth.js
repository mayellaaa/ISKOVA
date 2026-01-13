// Authentication and Database Functions using Supabase

const Auth = {
  // Register new user
  async register(email, password, fullName, userId) {
    try {
      // Sign up user with Supabase Auth
      const { data: authData, error: authError } = await supabaseClient.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            full_name: fullName,
            user_id: userId
          }
        }
      });

      if (authError) throw authError;

      // Insert user profile into users table
      const { error: profileError } = await supabaseClient
        .from('users')
        .insert([
          { 
            id: authData.user.id,
            email: email,
            full_name: fullName,
            user_id: userId,
            created_at: new Date().toISOString()
          }
        ]);

      if (profileError) throw profileError;

      return { success: true, user: authData.user };
    } catch (error) {
      console.error('Registration error:', error);
      return { success: false, error: error.message };
    }
  },

  // Login user
  async login(email, password) {
    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (error) throw error;

      return { success: true, user: data.user };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  },

  // Logout user
  async logout() {
    try {
      const { error } = await supabaseClient.auth.signOut();
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: error.message };
    }
  },

  // Get current user
  async getCurrentUser() {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      return user;
    } catch (error) {
      console.error('Get user error:', error);
      return null;
    }
  },

  // Reset password
  async resetPassword(email) {
    try {
      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/pages/reset-password.html'
      });

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Reset password error:', error);
      return { success: false, error: error.message };
    }
  }
};

const Database = {
  // Get all bookings for current user
  async getBookings() {
    try {
      const user = await Auth.getCurrentUser();
      if (!user) return [];

      const { data, error } = await supabaseClient
        .from('bookings')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get bookings error:', error);
      return [];
    }
  },

  // Create new booking
  async createBooking(bookingData) {
    try {
      const user = await Auth.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      const booking = {
        user_id: user.id,
        lab: bookingData.lab,
        date: bookingData.date,
        time: bookingData.time,
        system: bookingData.system,
        status: 'active',
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabaseClient
        .from('bookings')
        .insert([booking])
        .select()
        .single();

      if (error) throw error;
      return { success: true, booking: data };
    } catch (error) {
      console.error('Create booking error:', error);
      return { success: false, error: error.message };
    }
  },

  // Update booking status
  async updateBookingStatus(bookingId, status) {
    try {
      const { error } = await supabaseClient
        .from('bookings')
        .update({ status: status })
        .eq('id', bookingId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Update booking error:', error);
      return { success: false, error: error.message };
    }
  },

  // Delete booking
  async deleteBooking(bookingId) {
    try {
      const { error } = await supabaseClient
        .from('bookings')
        .delete()
        .eq('id', bookingId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Delete booking error:', error);
      return { success: false, error: error.message };
    }
  },

  // Get all labs
  async getLabs() {
    try {
      const { data, error } = await supabaseClient
        .from('labs')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Get labs error:', error);
      // Return fallback data if database not set up
      return [
        {name:"Lab A", capacity:40, computers:40, type:"large", status:"available", building:"CS Building", floor:"2nd Floor"},
        {name:"Lab B", capacity:25, computers:25, type:"medium", status:"limited", building:"CS Building", floor:"3rd Floor"},
        {name:"Lab C", capacity:15, computers:15, type:"small", status:"available", building:"Engineering", floor:"1st Floor"},
        {name:"Lab D", capacity:50, computers:50, type:"large", status:"full", building:"Library", floor:"Basement"},
        {name:"Lab E", capacity:20, computers:20, type:"small", status:"available", building:"Science Building", floor:"4th Floor"}
      ];
    }
  }
};

// Export functions
window.Auth = Auth;
window.Database = Database;
