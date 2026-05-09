const emailForm = document.getElementById('email-form');
const smsForm = document.getElementById('sms-form');
const emailTab = document.getElementById('email-tab');
const phoneTab = document.getElementById('phone-tab');
const displayEmail = document.getElementById('display-email');
const displayPhone = document.getElementById('display-phone');
const globalError = document.getElementById('error-msg');
const globalSuccess = document.getElementById('success-msg');

const email = sessionStorage.getItem('temp_email');

if (!email) window.location.href = 'login.html';
displayEmail.textContent = email;

// Email Logic
const emailOtpInput = document.getElementById('email-otp');
const emailVerifyBtn = document.getElementById('email-verify-btn');
const resendEmailBtn = document.getElementById('resend-email-btn');

emailOtpInput.addEventListener('input', () => {
    emailOtpInput.value = emailOtpInput.value.replace(/\D/g, '');
    emailVerifyBtn.disabled = emailOtpInput.value.length !== 6;
});

// Auto-start cooldown for the first email that was automatically sent on register
let cooldown = 60;
const timer = setInterval(() => {
    cooldown--;
    resendEmailBtn.textContent = `Resend in ${cooldown}s`;
    resendEmailBtn.disabled = true;
    if (cooldown <= 0) {
        clearInterval(timer);
        resendEmailBtn.disabled = false;
        resendEmailBtn.textContent = 'Resend Code';
    }
}, 1000);

resendEmailBtn.addEventListener('click', async () => {
    resendEmailBtn.disabled = true;
    resendEmailBtn.textContent = 'Sending...';
    try {
        await api.post('/otp/send-email', { email: email });
        globalSuccess.textContent = 'OTP sent to your email.';
        globalSuccess.style.display = 'block';
        setTimeout(() => globalSuccess.style.display = 'none', 3000);
        
        cooldown = 60;
        const newTimer = setInterval(() => {
            cooldown--;
            resendEmailBtn.textContent = `Resend in ${cooldown}s`;
            if (cooldown <= 0) {
                clearInterval(newTimer);
                resendEmailBtn.disabled = false;
                resendEmailBtn.textContent = 'Resend Code';
            }
        }, 1000);
    } catch (err) {
        globalError.textContent = err.message;
        globalError.style.display = 'block';
        resendEmailBtn.disabled = false;
        resendEmailBtn.textContent = 'Resend Code';
    }
});

emailForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    emailVerifyBtn.disabled = true;
    try {
        // We might not have a full token, but the backend requires token for /verify-email?
        // Wait, looking at routes/otp.py: @token_required is on verify-email? No, let's check.
        // Actually, the user wasn't logged in, so they just hit verify.
        // The backend verify-email uses JWT token. Wait...
        
        await api.post('/otp/verify-email', { otp: emailOtpInput.value, email: email });
        globalSuccess.textContent = 'Email verified! Redirecting to Login...';
        globalSuccess.style.display = 'block';
        setTimeout(() => window.location.href = 'login.html', 2000);
    } catch (err) {
        globalError.textContent = err.message;
        globalError.style.display = 'block';
        emailVerifyBtn.disabled = false;
    }
});
