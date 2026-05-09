const form = document.getElementById('login-form');
const submitBtn = document.getElementById('submit-btn');
const globalError = document.getElementById('error-msg');
const userTab = document.getElementById('user-tab');
const adminTab = document.getElementById('admin-tab');

let isAdmin = false;

userTab.addEventListener('click', () => {
    isAdmin = false;
    userTab.style.background = 'var(--surface)';
    userTab.style.color = 'var(--text)';
    adminTab.style.background = 'transparent';
    adminTab.style.color = 'var(--text-muted)';
});

adminTab.addEventListener('click', () => {
    isAdmin = true;
    adminTab.style.background = 'var(--surface)';
    adminTab.style.color = 'var(--text)';
    userTab.style.background = 'transparent';
    userTab.style.color = 'var(--text-muted)';
});

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> <span>Signing in...</span>';
    globalError.style.display = 'none';

    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    try {
        const endpoint = isAdmin ? '/auth/login/admin' : '/auth/login/user';
        const res = await api.post(endpoint, data);
        
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));

        if (!isAdmin && (!res.user.email_verified || !res.user.phone_verified)) {
            sessionStorage.setItem('temp_email', res.user.email);
            sessionStorage.setItem('temp_phone', res.user.phone);
            window.location.href = 'verify-otp.html';
        } else if (res.user.role === 'admin') {
            window.location.href = 'admin.html';
        } else {
            window.location.href = 'dashboard.html';
        }
    } catch (err) {
        globalError.textContent = err.message;
        globalError.style.display = 'block';
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<span>Sign In</span> <i class="fas fa-arrow-right"></i>';
    }
});
