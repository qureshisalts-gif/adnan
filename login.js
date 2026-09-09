const loginForm = document.getElementById('login-form');
const loginEmail = document.getElementById('login-email');
const loginPassword = document.getElementById('login-password');
const loginError = document.getElementById('login-error');

// Automatically redirect to app if already logged in
if (sessionStorage.getItem('isAuthenticated') === 'true') {
    window.location.href = 'index.html';
}

loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const email = loginEmail.value.trim();
    const password = loginPassword.value;
    
    // Check credentials
    if (email === 'qureshisalts@gmail.com' && password === '58195819a') {
        // Success
        sessionStorage.setItem('isAuthenticated', 'true');
        window.location.href = 'index.html';
    } else {
        // Failure
        loginError.textContent = 'Incorrect email or password. Please try again.';
        
        // Shake animation for failure feedback
        const loginCard = document.querySelector('.login-card');
        loginCard.style.transform = 'translateX(-10px)';
        setTimeout(() => loginCard.style.transform = 'translateX(10px)', 100);
        setTimeout(() => loginCard.style.transform = 'translateX(-10px)', 200);
        setTimeout(() => loginCard.style.transform = 'translateX(10px)', 300);
        setTimeout(() => loginCard.style.transform = 'translateX(0)', 400);
    }
});
