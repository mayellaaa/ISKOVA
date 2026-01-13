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
    return await Database.getBookings();
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
  
  if(userGreeting || logoutBtn){
    getUser().then(user => {
      if(userGreeting){
        userGreeting.textContent = user ? `Hello, ${user.user_metadata?.full_name || user.email}` : '';
      }
      if(logoutBtn){
        logoutBtn.addEventListener('click', async (e)=>{
          e.preventDefault();
          await logout();
        });
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
      const time = timeSelect.value;
      if(!date || !time){ 
        alert('Please select both date and time'); 
        return; 
      }

      // Get existing bookings for that date/time
      const existingBookings = await getReservations();
      const bookedLabs = existingBookings
        .filter(b => b.date === date && b.time === time)
        .map(b => b.lab);

      // Update lab status based on today's bookings
      await updateLabStatus();

      // Filter available labs
      const availableLabs = labsData.filter(lab => {
        // Check if lab is not fully booked
        if(lab.status === 'full') return false;
        // Check if already booked at this time
        if(bookedLabs.includes(lab.name)) return false;
        return true;
      });

      // Display available labs
      if(availableLabs.length === 0){
        availabilityPanel.innerHTML = '<p style="color:#b33446;text-align:center;padding:20px">No labs available for this date/time. Please choose a different time.</p>';
        bookingSection.style.display = 'none';
      } else {
        availabilityPanel.innerHTML = availableLabs.map(lab => `
          <div class="availability-item" data-lab='${JSON.stringify(lab)}'>
            <h4>${lab.name}</h4>
            <p><strong>Capacity:</strong> ${lab.capacity} | <strong>Location:</strong> ${lab.building}, ${lab.floor}</p>
            <span class="status-badge ${lab.status}">${lab.status.toUpperCase()}</span>
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
            showBookingSummary(selectedLabData, date, time);
          });
        });
      }
    });

    // Show booking summary
    function showBookingSummary(lab, date, time){
      const system = `${lab.name} • PC-${Math.floor(Math.random()*lab.computers)+1}`;
      document.getElementById('selectedLab').textContent = lab.name;
      document.getElementById('selectedDate').textContent = date;
      document.getElementById('selectedTime').textContent = time;
      document.getElementById('selectedSystem').textContent = system;
      bookingSection.style.display = 'block';
      
      // Store for confirmation
      bookingSection.dataset.booking = JSON.stringify({ lab: lab.name, date, time, system });
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
    
    getReservations().then(bookings => {
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
                <p><strong>System:</strong> ${booking.system || 'TBD'}</p>
                <p><strong>Date:</strong> ${booking.date}</p>
                <p><strong>Time:</strong> ${booking.time}</p>
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
    getReservations().then(bookings => {
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
              <h4>${b.lab} - ${b.system || 'TBD'}</h4>
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
    let booking;
    
    if(bookingId){
      booking = getReservations().find(b => b.id === bookingId);
    } else {
      try{
        booking = JSON.parse(localStorage.getItem('lastBooking') || 'null');
      }catch{}
    }

    if(booking){
      document.getElementById('confirmLab').textContent = booking.lab;
      document.getElementById('confirmDate').textContent = booking.date;
      document.getElementById('confirmTime').textContent = booking.time;
      document.getElementById('confirmSystem').textContent = booking.system || 'TBD';
      document.getElementById('confirmId').textContent = booking.id || 'N/A';
      
      // Simple QR code visualization
      document.getElementById('qrCode').innerHTML = `
        <div style="width:100%;height:100%;display:grid;grid-template-columns:repeat(8,1fr);grid-template-rows:repeat(8,1fr);gap:2px;padding:10px">
          ${Array.from({length:64}, (_,i) => 
            `<div style="background:${Math.random()>0.5?'#000':'#fff'};border-radius:2px"></div>`
          ).join('')}
        </div>
      `;
    }
  }

  // Labs page
  if(document.getElementById('labsList')){
    const searchInput = document.getElementById('searchLabs');
    loadLabs().then(async () => {
      await updateLabStatus();
      
      function renderLabs(){
        const search = searchInput.value.toLowerCase();
        const filter = filterSelect.value;
        
        const filtered = labsData.filter(lab => {
          const matchesSearch = lab.name.toLowerCase().includes(search) || 
                               lab.building.toLowerCase().includes(search);
          const matchesFilter = !filter || lab.type === filter;
          return matchesSearch && matchesFilter;
        });

        const labsList = document.getElementById('labsList');
        if(filtered.length === 0){
          labsList.innerHTML = '<p style="color:#e9d6d9;text-align:center;grid-column:1/-1">No labs found</p>';
          return;
        }

        labsList.innerHTML = filtered.map(lab => {
          const badgeClass = lab.status === 'available' ? 'available' : 
                            lab.status === 'limited' ? 'limited' : 'full';
          return `
            <div class="lab-card">
              <h3>${lab.name}</h3>
              <span class="badge ${badgeClass}">${lab.status.toUpperCase()}</span>
              <div class="lab-info">
                <p><strong>Capacity:</strong> ${lab.capacity} students</p>
                <p><strong>Computers:</strong> ${lab.computers} units</p>
                <p><strong>Location:</strong> ${lab.building}, ${lab.floor}</p>
              </div>
              <a class="btn primary" href="reserve.html" style="width:100%;margin-top:12px">Book Now</a>
            </div>
          `;
        }).join('');
      }

      searchInput.addEventListener('input', renderLabs);
      filterSelect.addEventListener('change', renderLabs);
      renderLabs();
    });
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
  function monthName(y,m){
    return new Date(y,m,1).toLocaleString(undefined,{ month:'long' });
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
          const holiday = (m===0 && day===1) ? '<div class="holiday">New Year\'s Day</div>' : '';
          cell = `<td class="${isToday?'today':''}"><div>${day}</div>${holiday}</td>`;
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
    const today = new Date();
    let year = today.getFullYear();
    let month = today.getMonth();

    function update(){
      cal.innerHTML = buildCalendar(year,month);
      header.innerHTML = `
        <button class="btn outline" aria-label="Prev" id="prevMonth">◀</button>
        <span class="month">${monthName(year,month)} ${year}</span>
        <button class="btn outline" aria-label="Next" id="nextMonth">▶</button>
      `;
      document.getElementById('prevMonth').onclick = ()=>{ month = (month+11)%12; if(month===11) year--; update(); };
      document.getElementById('nextMonth').onclick = ()=>{ month = (month+1)%12; if(month===0) year++; update(); };
    }
    update();
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
