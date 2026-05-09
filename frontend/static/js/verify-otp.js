const emailForm = document.getElementById('email-form');
const smsForm = document.getElementById('sms-form');
const emailTab = document.getElementById('email-tab');
const phoneTab = document.getElementById('phone-tab');
const displayEmail = document.getElementById('display-email');
const displayPhone = document.getElementById('display-phone');
const globalError = document.getElementById('error-msg');
const globalSuccess = document.getElementById('success-msg');

const email = sessionStorage.getItem('temp_email');
const phone = sessionStorage.getItem('temp_phone');

if (!email) window.location.href = 'login.html';
displayEmail.textContent = email;
displayPhone.textContent = phone;

// Tab Switching
emailTab.addEventListener('click', () => {
    emailTab.style.background = 'var(--surface)';
    emailTab.style.color = 'var(--text)';
    phoneTab.style.background = 'transparent';
    phoneTab.style.color = 'var(--text-muted)';
    emailForm.classList.remove('hidden');
    smsForm.classList.add('hidden');
});

phoneTab.addEventListener('click', () => {
    phoneTab.style.background = 'var(--surface)';
    phoneTab.style.color = 'var(--text)';
    emailTab.style.background = 'transparent';
    emailTab.style.color = 'var(--text-muted)';
    smsForm.classList.remove('hidden');
    emailForm.classList.add('hidden');
});

// Email Logic
const emailOtpInput = document.getElementById('email-otp');
const emailVerifyBtn = document.getElementById('email-verify-btn');
const resendEmailBtn = document.getElementById('resend-email-btn');

emailOtpInput.addEventListener('input', () => {
    emailOtpInput.value = emailOtpInput.value.replace(/\D/g, '');
    emailVerifyBtn.disabled = emailOtpInput.value.length !== 6;
});

resendEmailBtn.addEventListener('click', async () => {
    resendEmailBtn.disabled = true;
    resendEmailBtn.textContent = 'Sending...';
    try {
        await api.post('/otp/send-email');
        globalSuccess.textContent = 'OTP sent to your email.';
        globalSuccess.style.display = 'block';
        setTimeout(() => globalSuccess.style.display = 'none', 3000);
        
        let cooldown = 60;
        const timer = setInterval(() => {
            cooldown--;
            resendEmailBtn.textContent = `Resend in ${cooldown}s`;
            if (cooldown <= 0) {
                clearInterval(timer);
                resendEmailBtn.disabled = false;
                resendEmailBtn.textContent = 'Send Code';
            }
        }, 1000);
    } catch (err) {
        globalError.textContent = err.message;
        globalError.style.display = 'block';
        resendEmailBtn.disabled = false;
        resendEmailBtn.textContent = 'Send Code';
    }
});

emailForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    emailVerifyBtn.disabled = true;
    try {
        await api.post('/otp/verify-email', { otp: emailOtpInput.value });
        globalSuccess.textContent = 'Email verified! Redirecting...';
        globalSuccess.style.display = 'block';
        setTimeout(() => window.location.href = 'login.html', 2000);
    } catch (err) {
        globalError.textContent = err.message;
        globalError.style.display = 'block';
        emailVerifyBtn.disabled = false;
    }
});

// SMS Logic (Firebase Compat)
// Note: User must fill these in firebase.js or we define them here.
// For simplicity in vanilla, I'll assume they defined a global config or I'll provide one placeholder.
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "woman-safety-e2386.firebaseapp.com",
    projectId: "woman-safety-e2386",
    storageBucket: "woman-safety-e2386.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Only init if not already init
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

let confirmationResult = null;
const smsBtn = document.getElementById('sms-btn');
const smsInputGroup = document.getElementById('sms-input-group');
const smsOtpInput = document.getElementById('sms-otp');

window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier('recaptcha-container', {
    'size': 'invisible'
});

smsForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    smsBtn.disabled = true;
    globalError.style.display = 'none';

    if (!confirmationResult) {
        // Send SMS
        const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
        try {
            confirmationResult = await firebase.auth().signInWithPhoneNumber(formattedPhone, window.recaptchaVerifier);
            smsInputGroup.classList.remove('hidden');
            smsBtn.querySelector('span').textContent = 'Verify SMS';
            smsBtn.disabled = false;
            globalSuccess.textContent = 'SMS code sent.';
            globalSuccess.style.display = 'block';
        } catch (err) {
            globalError.textContent = 'Failed to send SMS. Check console or config.';
            globalError.style.display = 'block';
            smsBtn.disabled = false;
        }
    } else {
        // Verify SMS
        try {
            const result = await confirmationResult.confirm(smsOtpInput.value);
            const idToken = await result.user.getIdToken();
            await api.post('/otp/verify-phone', { firebase_token: idToken });
            globalSuccess.textContent = 'Phone verified! Redirecting...';
            globalSuccess.style.display = 'block';
            setTimeout(() => window.location.href = 'login.html', 2000);
        } catch (err) {
            globalError.textContent = 'Invalid SMS code.';
            globalError.style.display = 'block';
            smsBtn.disabled = false;
        }
    }
});
