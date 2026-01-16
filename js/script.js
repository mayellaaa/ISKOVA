(function(){
  // Check if user is logged in on protected pages
  async function checkAuth() {
    const user = await Auth.getCurrentUser();
    const protectedPages = ['dashboard', 'reserve', 'manage', 'confirmation'];
    const currentPage = window.location.pathname;
    const isProtected = protectedPages.some(page => currentPage.includes(page));
    
    if (isProtected && !user) {
      alert('Please log in to access this page');
      const isInPages = currentPage.includes('/pages/');
      window.location.href = isInPages ? 'login.html' : 'pages/login.html';
    }
    return user;
  }

  // Lab data - will be loaded from database or use fallback
  let labsData = [];

  async function loadLabs() {
    labsData = await Database.getLabs();
    return labsData;
  }

  async function getReservations(){
    return await Database.getAllBookings();
  }

  // Calculate lab status based on bookings
  async function updateLabStatus() {
    const bookings = await getReservations();
    const today = new Date().toISOString().split('T')[0];
    
    labsData.forEach(lab => {
      // Count how many bookings this lab has for today
      const todayBookings = bookings.filter(b => b.lab === lab.name && b.date === today);
      
      if (todayBookings.length === 0) {
        lab.status = 'available';
      } else if (todayBookings.length <= 3) {
        lab.status = 'limited';
      } else {
        lab.status = 'full';
      }
    });
    
    return labsData;
  }
  
  async function saveReservation(item){
    const result = await Database.createBooking(item);
    return result.booking;
  }
  
  async function deleteReservation(id){
    await Database.deleteBooking(id);
  }
  
  async function getUser(){ 
    return await Auth.getCurrentUser();
  }
  
  async function logout(){
    await Auth.logout();
    const isInPages = window.location.pathname.includes('/pages/');
    location.href = isInPages ? '../index.html' : 'index.html';
  }

  // Update header with user info
  const userGreeting = document.getElementById('userGreeting');
  const logoutBtn = document.getElementById('logoutBtn');
  const loginLink = document.getElementById('loginLink');
  
  if(userGreeting || logoutBtn){
    getUser().then(user => {
      if(user){
        // User is logged in
        if(userGreeting){
          userGreeting.textContent = `Hello, ${user.user_metadata?.full_name || user.email}`;
        }
        if(logoutBtn){
          logoutBtn.style.display = 'inline-block';
          logoutBtn.addEventListener('click', async (e)=>{
            e.preventDefault();
            await logout();
          });
        }
        if(loginLink){
          loginLink.style.display = 'none';
        }
      } else {
        // User is not logged in
        if(userGreeting){
          userGreeting.textContent = '';
        }
        if(logoutBtn){
          logoutBtn.style.display = 'none';
        }
        if(loginLink){
          loginLink.style.display = 'inline-block';
        }
      }
    });
  }

  // Populate selects
  async function populateLabs(selectId){
    const sel = document.getElementById(selectId);
    if(!sel) return;
    await loadLabs();
    sel.innerHTML = labsData.map(l=>`<option>${l.name}</option>`).join('');
  }

  // Register
  const registerForm = document.getElementById('registerForm');
  if(registerForm){
    registerForm.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const fullName = document.getElementById('fullName').value.trim();
      const email = document.getElementById('email').value.trim();
      const userId = document.getElementById('userId').value.trim();
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirmPassword').value;
      
      if(!fullName || !email || !userId || !password){ 
        alert('Please fill all fields'); 
        return; 
      }
      
      // Validate password requirements
      const hasLength = password.length >= 8 && password.length <= 12;
      const hasNumber = /\d/.test(password);
      const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
      
      if(!hasLength || !hasNumber || !hasSpecial) {
        alert('Password must have:\n• 8-12 characters\n• At least one number\n• At least one special character');
        return;
      }
      
      if(password !== confirmPassword){ 
        alert('Passwords do not match'); 
        return; 
      }
      
      const result = await Auth.register(email, password, fullName, userId);
      if(result.success){
        alert('Registration successful! Please check your email to verify your account.');
        location.href = 'login.html';
      } else {
        alert('Registration failed: ' + result.error);
      }
    });
  }

  // Login
  const loginForm = document.getElementById('loginForm');
  if(loginForm){
    loginForm.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const userId = document.getElementById('userId').value.trim();
      const password = document.getElementById('password').value;
      
      if(!userId || !password){ 
        alert('Enter credentials'); 
        return; 
      }
      
      // Assume userId is email for now
      const result = await Auth.login(userId, password);
      if(result.success){
        location.href = 'dashboard.html';
      } else {
        alert('Login failed: ' + result.error);
      }
    });
  }

  // Forgot Password
  const forgotPasswordForm = document.getElementById('forgotPasswordForm');
  if(forgotPasswordForm){
    forgotPasswordForm.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const email = document.getElementById('resetEmail').value.trim();
      
      if(!email){ 
        alert('Please enter your email'); 
        return; 
      }
      
      const result = await Auth.resetPassword(email);
      if(result.success){
        alert('Password reset link sent to ' + email);
        location.href = 'login.html';
      } else {
        alert('Reset failed: ' + result.error);
      }
    });
  }

  // Reserve
  const reserveForm = document.getElementById('reserveForm');
  if(reserveForm){
    const dateSelect = document.getElementById('dateSelect');
    const timeSelect = document.getElementById('timeSelect');
    const availabilityPanel = document.getElementById('availabilityPanel');
    const bookingSection = document.getElementById('bookingSection');
    let selectedLabData = null;

    // Load labs data
    loadLabs();

    // Check availability when form submitted
    reserveForm.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const date = dateSelect.value;
      let time = timeSelect.value;
      const timeOutSelect = document.getElementById('timeOutSelect');
      let timeOut = timeOutSelect ? timeOutSelect.value : '';
      if(!date || !time || !timeOut){ 
        alert('Please select date, time, and time out'); 
        return; 
      }

      // Validate that time out is not earlier than or equal to time
      if(timeOut <= time) {
        alert('Preferred Time Out must be after Preferred Time');
        return;
      }

      // Normalize time format to match database (add :00 seconds if not present)
      if(time.length === 5) {
        time = time + ':00';
      }

      // Get existing bookings for that date/time
      const existingBookings = await Database.getAllBookings();
      
      // Get labs that are already booked in the same HOUR (not just exact time)
      // Extract hour from selected time (e.g., "08:30:00" -> "08")
      const selectedHour = time.split(':')[0];
      
      const bookedLabs = existingBookings
        .filter(b => {
          if(b.date !== date) return false;
          // Extract hour from booking time
          const bookingHour = b.time.split(':')[0];
          // If same hour, lab is booked for entire hour
          return bookingHour === selectedHour;
        })
        .map(b => b.lab);

      // Update lab status based on today's bookings
      await updateLabStatus();

      // Filter available labs
      const availableLabs = labsData.filter(lab => {
        // If lab is already booked at this time, it's not available
        return !bookedLabs.includes(lab.name);
      });

      // Display available labs
      if(availableLabs.length === 0){
        availabilityPanel.innerHTML = '<p style="color:#b33446;text-align:center;padding:20px">No labs available for this date/time. Please choose a different time.</p>';
        bookingSection.style.display = 'none';
      } else {
        availabilityPanel.innerHTML = availableLabs.map(lab => `
          <div class="availability-item" data-lab='${JSON.stringify(lab)}'>
            <h4>${lab.name}</h4>
            <p><strong>Capacity:</strong> ${lab.capacity} students | <strong>Location:</strong> ${lab.building}, ${lab.floor}</p>
            <span class="status-badge available">AVAILABLE</span>
          </div>
        `).join('');

        // Add click handlers to lab items
        document.querySelectorAll('.availability-item').forEach(item => {
          item.addEventListener('click', function(){
            // Remove previous selection
            document.querySelectorAll('.availability-item').forEach(i => i.classList.remove('selected'));
            // Add selection to clicked item
            this.classList.add('selected');
            // Store selected lab
            selectedLabData = JSON.parse(this.getAttribute('data-lab'));
            // Show booking section
            showBookingSummary(selectedLabData, date, time, timeOut);
          });
        });
      }
    });

    // Show booking summary
    function showBookingSummary(lab, date, time, timeOut){
      document.getElementById('selectedLab').textContent = lab.name;
      document.getElementById('selectedDate').textContent = date;
      document.getElementById('selectedTime').textContent = time;
      document.getElementById('selectedTimeOut').textContent = timeOut;
      document.getElementById('selectedSystem').textContent = `${lab.building}, ${lab.floor}`;
      bookingSection.style.display = 'block';
      
      // Store for confirmation - use time_out to match Supabase column name
      bookingSection.dataset.booking = JSON.stringify({ lab: lab.name, date, time, time_out: timeOut });
    }

    // Confirm booking button
    const confirmBookingBtn = document.getElementById('confirmBookingBtn');
    if(confirmBookingBtn){
      confirmBookingBtn.addEventListener('click', async ()=>{
        if(!selectedLabData){
          alert('Please select a lab first');
          return;
        }
        const bookingData = JSON.parse(bookingSection.dataset.booking);
        
        // Normalize time format for comparison
        let checkTime = bookingData.time;
        if(checkTime && checkTime.length === 5) {
          checkTime = checkTime + ':00';
        }
        
        // Extract hour from selected time
        const selectedHour = checkTime.split(':')[0];
        
        // Double-check that this lab/hour isn't already booked
        const existingBookings = await Database.getAllBookings();
        const alreadyBooked = existingBookings.some(b => {
          if(b.lab !== bookingData.lab || b.date !== bookingData.date) return false;
          // Extract hour from existing booking
          const bookingHour = b.time.split(':')[0];
          // If same hour, it's blocked
          return bookingHour === selectedHour;
        });
        
        if(alreadyBooked){
          alert('This lab at this time is already booked. Please select a different time.');
          location.reload();
          return;
        }
        
        const booking = await saveReservation(bookingData);
        if(booking){
          alert('Booking created! Please confirm it in Manage Reservations.');
          location.href = 'manage.html';
        } else {
          alert('Failed to create booking. Please try again.');
        }
      });
    }

    // Cancel booking button
    const cancelBookingBtn = document.getElementById('cancelBookingBtn');
    if(cancelBookingBtn){
      cancelBookingBtn.addEventListener('click', ()=>{
        bookingSection.style.display = 'none';
        selectedLabData = null;
        document.querySelectorAll('.availability-item').forEach(i => i.classList.remove('selected'));
      });
    }
  }

  // Manage Reservations Page
  if(document.getElementById('reservationsList')){
    const reservationsList = document.getElementById('reservationsList');
    
    Database.getBookings().then(bookings => {
      if(bookings.length === 0){
        reservationsList.innerHTML = '<p style="color:#e9d6d9;text-align:center;padding:40px">No reservations yet. <a href="reserve.html" style="color:#fff">Make your first reservation</a></p>';
      } else {
        reservationsList.innerHTML = bookings.map(booking => {
          const isPending = booking.status === 'active';
          const statusClass = isPending ? 'pending' : 'confirmed';
          const statusText = isPending ? 'Pending Confirmation' : 'Confirmed';
          
          return `
            <div class="card reservation-card">
              <div class="reservation-header">
                <h3>${booking.lab}</h3>
                <span class="status-badge ${statusClass}">${statusText}</span>
              </div>
              <div class="reservation-details">
                <p><strong>Date:</strong> ${booking.date}</p>
                <p><strong>Time:</strong> ${booking.time} - ${booking.time_out}</p>
                <p><strong>Booking ID:</strong> ${booking.id}</p>
              </div>
              <div class="reservation-actions">
                ${isPending ? `<button class="btn primary" onclick="ISKOVA.confirmBooking('${booking.id}')">Confirm This Booking</button>` : ''}
                <button class="btn danger" onclick="ISKOVA.deleteBooking('${booking.id}')">Cancel Booking</button>
              </div>
            </div>
          `;
        }).join('');
      }
    });
  }

  // Dashboard
  if(document.getElementById('bookingHistory')){
    Database.getBookings().then(bookings => {
      const activeCount = bookings.filter(b => b.status === 'active').length;
      const totalCount = bookings.length;
      const upcomingCount = bookings.filter(b => new Date(b.date) > new Date()).length;

      document.getElementById('activeCount').textContent = activeCount;
      document.getElementById('totalCount').textContent = totalCount;
      document.getElementById('upcomingCount').textContent = upcomingCount;

      const historyEl = document.getElementById('bookingHistory');
      if(bookings.length === 0){
        historyEl.innerHTML = '<p style="color:#e9d6d9;text-align:center">No bookings yet. <a href="reserve.html" style="color:#fff">Make your first reservation</a></p>';
      } else {
        historyEl.innerHTML = bookings.reverse().map(b => `
          <div class="booking-card">
            <div class="info">
              <h4>${b.lab}</h4>
              <p>${b.date} at ${b.time} • ID: ${b.id}</p>
            </div>
            <div class="actions">
              <button class="btn subtle" onclick="window.location='confirmation.html?id=${b.id}'">View</button>
              <button class="btn danger" onclick="ISKOVA.deleteBooking('${b.id}')">Cancel</button>
            </div>
          </div>
        `).join('');
      }
    });
  }

  // Confirmation page
  if(document.getElementById('confirmLab')){
    const urlParams = new URLSearchParams(window.location.search);
    const bookingId = urlParams.get('id');
    
    async function loadConfirmationDetails(){
      let booking = null;
      
      if(bookingId){
        const reservations = await getReservations();
        booking = reservations.find(b => b.id === bookingId);
      } else {
        try{
          booking = JSON.parse(localStorage.getItem('lastBooking') || 'null');
        }catch{}
      }

      if(booking){
        document.getElementById('confirmLab').textContent = booking.lab;
        document.getElementById('confirmDate').textContent = booking.date;
        document.getElementById('confirmTime').textContent = booking.time;
        document.getElementById('confirmEndTime').textContent = booking.time_out || 'N/A';
        document.getElementById('confirmSystem').textContent = 'Southwing, 5th Floor';
        document.getElementById('confirmId').textContent = booking.id || 'N/A';
        document.getElementById('confirmStatus').textContent = booking.status ? booking.status.charAt(0).toUpperCase() + booking.status.slice(1) : 'Confirmed';
        
        // Get current user
        const user = await getUser();
        document.getElementById('confirmBookedBy').textContent = user?.user_metadata?.full_name || user?.email || 'N/A';
        
        // Format the booking creation timestamp
        const bookedAtTime = new Date().toLocaleString(undefined, { 
          year: 'numeric', 
          month: '2-digit', 
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
        document.getElementById('confirmBookedAt').textContent = bookedAtTime;
        
        // Generate real QR code with embedded booking data
        const qrCodeDiv = document.getElementById('qrCode');
        qrCodeDiv.innerHTML = ''; // Clear previous content
        
        // Create URL to confirmation page - will work when deployed
        const currentOrigin = window.location.origin;
        const qrData = `${currentOrigin}/pages/confirmation.html?id=${booking.id}`;
        
        // Generate QR code using QRCode library
        if(typeof QRCode !== 'undefined'){
          try {
            new QRCode(qrCodeDiv, {
              text: qrData,
              width: 200,
              height: 200,
              colorDark: '#000000',
              colorLight: '#ffffff',
              correctLevel: QRCode.CorrectLevel.M
            });
            
            // Show info if running locally
            if(currentOrigin.includes('localhost') || currentOrigin.includes('127.0.0.1') || currentOrigin.includes('file://')){
              const localWarning = document.createElement('div');
              localWarning.style.cssText = 'margin-top:12px;padding:10px;background:#fff3cd;color:#856404;border-radius:6px;font-size:12px;';
              localWarning.innerHTML = '<strong>Note:</strong> QR code will work after deploying to a web server (Netlify, Vercel, GitHub Pages, etc.)';
              qrCodeDiv.parentElement.appendChild(localWarning);
            }
          } catch(err) {
            console.error('QR Code generation error:', err);
            qrCodeDiv.innerHTML = '<p style="color:#333;padding:20px;font-size:12px;">QR Code generation failed. Please use Booking ID: ' + booking.id + '</p>';
          }
        } else {
          console.error('QRCode library not loaded');
          qrCodeDiv.innerHTML = '<p style="color:#333;padding:20px;font-size:12px;">QR Code library not loaded. Please use Booking ID: ' + booking.id + '</p>';
        }
      }
    }
    
    loadConfirmationDetails();
  }

// Labs page
if (document.getElementById('labsList')) {

  const labsList = document.getElementById('labsList');
  const searchInput = document.getElementById('searchLabs');
  const filterSelect = document.getElementById('filterCapacity');

  loadLabs().then(async () => {
    await updateLabStatus();
    renderLabs();
  });

  function renderLabs() {
    const search = searchInput.value.toLowerCase();
    const filter = filterSelect.value;

    const filteredLabs = labsData.filter(lab => {
      const matchesSearch =
        lab.name.toLowerCase().includes(search) ||
        lab.building.toLowerCase().includes(search);

      /*const matchesCapacity =
        !filter || lab.type === filter;
      */

      let computedType = 'large';
        if (lab.capacity <= 20) computedType = 'small';
        else if (lab.capacity <= 40) computedType = 'medium';

      const matchesCapacity =
        !filter || computedType === filter;

      return matchesSearch && matchesCapacity;
    });

    if (filteredLabs.length === 0) {
      labsList.innerHTML = `
        <p style="text-align:center;color:#e9d6d9;">
          No laboratory rooms found
        </p>`;
      return;
    }

    labsList.innerHTML = filteredLabs.map(lab => {
      const statusClass =
        lab.status === 'available' ? 'available' :
        lab.status === 'limited' ? 'limited' : 'full';

      return `
        <div class="lab-card">
          <h3>${lab.name}</h3>
          <span class="badge ${statusClass}">
            ${lab.status.toUpperCase()}
          </span>

          <div class="lab-info">
            <p><strong>Capacity:</strong> ${lab.capacity} students</p>
            <p><strong>Computers:</strong> ${lab.computers} units</p>
            <p><strong>Location:</strong> ${lab.building}, ${lab.floor}</p>
          </div>

          <a href="reserve.html" class="btn primary">
            Reserve this Lab
          </a>
        </div>
      `;
    }).join('');
  }

  searchInput.addEventListener('input', renderLabs);
  filterSelect.addEventListener('change', renderLabs);
}

  // Contact form
  const contactForm = document.getElementById('contactForm');
  if(contactForm){
    contactForm.addEventListener('submit', (e)=>{
      e.preventDefault();
      const name = document.getElementById('contactName').value;
      const email = document.getElementById('contactEmail').value;
      const subject = document.getElementById('contactSubject').value;
      const message = document.getElementById('contactMessage').value;
      if(!name || !email || !subject || !message){
        alert('Please fill all fields');
        return;
      }
      alert('Message sent successfully! We will get back to you soon.');
      contactForm.reset();
    });
  }

  // Calendar
  let bookingsByDate = {}; // Store bookings organized by date
  let bookingsSubscription = null; // Store subscription for cleanup

  function monthName(y,m){
    return new Date(y,m,1).toLocaleString(undefined,{ month:'long' });
  }

  async function loadBookingsByDate(){
    try {
      const bookings = await getReservations();
      console.log('DEBUG: Total bookings fetched:', bookings.length);
      console.log('DEBUG: Raw bookings:', bookings);
      
      bookingsByDate = {};
      bookings.forEach(booking => {
        // Extract just the date part from the timestamp
        let dateStr = booking.date;
        
        // If date contains a space, it's a timestamp - extract just the date portion
        if(dateStr && dateStr.includes(' ')) {
          dateStr = dateStr.split(' ')[0];
        }
        
        console.log('DEBUG: Processing booking - original date:', booking.date, '-> parsed date:', dateStr);
        
        if(!bookingsByDate[dateStr]){
          bookingsByDate[dateStr] = [];
        }
        bookingsByDate[dateStr].push(booking);
      });
      
      console.log('DEBUG: Bookings organized by date:', bookingsByDate);
      return Object.keys(bookingsByDate).length; // Return count of dates with bookings
    } catch (error) {
      console.error('DEBUG: Error loading bookings:', error);
      return 0;
    }
  }

  function buildCalendar(y,m){ // m: 0-11
    const first = new Date(y,m,1);
    const startDay = first.getDay(); // 0=Sun
    const daysInMonth = new Date(y,m+1,0).getDate();
    const prevMonthDays = new Date(y,m,0).getDate();
    const rows = [];
    let day = 1;
    for(let r=0;r<6;r++){
      const cells = [];
      for(let c=0;c<7;c++){
        const index = r*7+c;
        let cell = '';
        if(index < startDay){
          const prevDay = prevMonthDays - (startDay-index-1);
          cell = `<td class="muted">${prevDay}</td>`;
        } else if(day <= daysInMonth){
          const isToday = (new Date().getFullYear()===y && new Date().getMonth()===m && new Date().getDate()===day);
          const dateStr = `${y}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
          const bookingsForDate = bookingsByDate[dateStr] || [];
          const hasBookings = bookingsForDate.length > 0;
          const holiday = (m===0 && day===1) ? '<div class="holiday">New Year\'s Day</div>' : '';
          let reservationIndicator = '';
          if(hasBookings){
            reservationIndicator = `<div class="reservation-indicator" data-date="${dateStr}" style="cursor:pointer">${bookingsForDate.length} booking${bookingsForDate.length > 1 ? 's' : ''}</div>`;
          }
          cell = `<td class="${isToday?'today':''} ${hasBookings ? 'has-booking' : ''}" data-date="${dateStr}" data-bookings="${bookingsForDate.length}"><div>${day}</div>${holiday}${reservationIndicator}</td>`;
          day++;
        } else {
          const nextDay = day - daysInMonth;
          cell = `<td class="muted">${nextDay}</td>`;
          day++;
        }
        cells.push(cell);
      }
      rows.push(`<tr>${cells.join('')}</tr>`);
      if(day > daysInMonth + (7-startDay)) break; // stop early if filled
    }
    return `<table><thead><tr><th>Sunday</th><th>Monday</th><th>Tuesday</th><th>Wednesday</th><th>Thursday</th><th>Friday</th><th>Saturday</th></tr></thead><tbody>${rows.join('')}</tbody></table>`;
  }

  function renderCalendar(calendarId, headerId){
    const cal = document.getElementById(calendarId);
    const header = document.getElementById(headerId);
    if(!cal || !header) {
      console.error('DEBUG: Calendar or header element not found');
      return;
    }
    
    const today = new Date();
    let year = today.getFullYear();
    let month = today.getMonth();

    async function update(){
      console.log('DEBUG: Updating calendar for', monthName(year, month), year);
      const dateCount = await loadBookingsByDate();
      console.log('DEBUG: Dates with bookings:', dateCount);
      
      cal.innerHTML = buildCalendar(year,month);
      header.innerHTML = `
        <button class="btn outline" aria-label="Prev" id="prevMonth">◀</button>
        <span class="month">${monthName(year,month)} ${year}</span>
        <button class="btn outline" aria-label="Next" id="nextMonth">▶</button>
      `;
      
      // Add event listeners to date cells
      const dateCells = cal.querySelectorAll('td[data-date]');
      console.log('DEBUG: Date cells found:', dateCells.length);
      dateCells.forEach(cell => {
        cell.addEventListener('click', async () => {
          const dateStr = cell.getAttribute('data-date');
          console.log('DEBUG: Clicked date:', dateStr);
          await showBookingDetails(dateStr);
        });
      });

      document.getElementById('prevMonth').onclick = ()=>{ month = (month+11)%12; if(month===11) year--; update(); };
      document.getElementById('nextMonth').onclick = ()=>{ month = (month+1)%12; if(month===0) year++; update(); };
    }
    
    // Initial load
    update();
    
    // Set up real-time subscription for bookings
    if(bookingsSubscription) {
      bookingsSubscription.unsubscribe();
    }
    
    try {
      bookingsSubscription = supabaseClient
        .channel('bookings-changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'bookings' },
          (payload) => {
            console.log('DEBUG: Booking change detected:', payload);
            update(); // Refresh calendar when any booking changes
          }
        )
        .subscribe((status) => {
          console.log('DEBUG: Subscription status:', status);
        });
    } catch (error) {
      console.warn('DEBUG: Real-time subscription not available (Realtime may not be enabled):', error);
    }
  }

  async function showBookingDetails(dateStr){
    const bookings = bookingsByDate[dateStr] || [];
    const modal = document.getElementById('bookingDetailsModal');
    const bookingsList = document.getElementById('bookingsList');
    const dateDisplay = document.getElementById('selectedDateDisplay');
    
    if(!modal){
      // Create modal if it doesn't exist
      const newModal = document.createElement('div');
      newModal.id = 'bookingDetailsModal';
      newModal.className = 'booking-details-modal';
      newModal.innerHTML = `
        <div class="modal-content">
          <div class="modal-header">
            <h2>Bookings for <span id="selectedDateDisplay"></span></h2>
            <button class="close-btn" id="closeModal">&times;</button>
          </div>
          <div id="bookingsList"></div>
        </div>
      `;
      document.body.appendChild(newModal);
      document.getElementById('closeModal').addEventListener('click', () => {
        newModal.classList.remove('active');
      });
      newModal.addEventListener('click', (e) => {
        if(e.target === newModal){
          newModal.classList.remove('active');
        }
      });
    }

    const modal2 = document.getElementById('bookingDetailsModal');
    const dateDisplay2 = document.getElementById('selectedDateDisplay');
    const bookingsList2 = document.getElementById('bookingsList');
    
    // Format date for display
    const dateObj = new Date(dateStr + 'T00:00:00');
    const dateFormatted = dateObj.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    dateDisplay2.textContent = dateFormatted;
    
    if(bookings.length === 0){
      bookingsList2.innerHTML = '<div class="no-bookings">No bookings for this date</div>';
    } else {
      bookingsList2.innerHTML = bookings.map(booking => `
        <div class="booking-item">
          <h4>${booking.lab}</h4>
          <p><strong>Time:</strong> ${booking.time} - ${booking.time_out}</p>
          <p><strong>Status:</strong> ${booking.status || 'pending'}</p>
        </div>
      `).join('');
    }
    
    modal2.classList.add('active');
  }

  // expose
  window.ISKOVA = { 
    renderCalendar,
    confirmBooking: async function(id){
      const result = await Database.updateBookingStatus(id, 'confirmed');
      if(result.success){
        alert('Booking confirmed successfully!');
        location.reload();
      } else {
        alert('Failed to confirm booking: ' + result.error);
      }
    },
    deleteBooking: async function(id){
      if(confirm('Are you sure you want to cancel this booking?')){
        const result = await deleteReservation(id);
        location.reload();
      }
    }
  };

  // Check auth on page load
  checkAuth();
})();
