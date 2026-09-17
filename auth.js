// auth.js
// Protects the page from being accessed without logging in.
// Checks sessionStorage before the page fully loads.
if (sessionStorage.getItem('isAuthenticated') !== 'true') {
    // Prevent rendering of any content
    document.documentElement.style.display = 'none';
    window.location.replace('login.html');
}
