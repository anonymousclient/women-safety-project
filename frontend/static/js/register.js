const form = document.getElementById('register-form');
const submitBtn = document.getElementById('submit-btn');
const globalError = document.getElementById('error-msg');

const validators = {
  name: (v) => /^[A-Za-z\s]{3,}$/.test(v) ? '' : 'Name must be 3+ characters (letters only)',
  email: (v) => /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/.test(v) ? '' : 'Invalid email format',
  phone: (v) => /^\d{10}$/.test(v) ? '' : 'Phone must be exactly 10 digits',
  password: (v) => /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}/.test(v) 
    ? '' : 'Requires 8+ chars, upper, lower, number, & special char',
  confirmPassword: (v) => v === form.password.value ? '' : 'Passwords do not match'
};

const handleValidation = (e) => {
  const { name, value } = e.target;
  if (!validators[name]) return;
  
  const error = validators[name](value);
  const errorEl = document.getElementById(`${name}-error`);
  
  if (error) {
    errorEl.textContent = error;
    errorEl.style.display = 'block';
    e.target.style.borderColor = '#ef4444';
  } else {
    errorEl.style.display = 'none';
    e.target.style.borderColor = 'var(--border)';
  }
  
  // Check if all fields are valid to enable/disable button
  const formData = new FormData(form);
  let isValid = true;
  for (let [key, val] of formData.entries()) {
    if (validators[key] && validators[key](val)) isValid = false;
  }
  submitBtn.disabled = !isValid;
};

form.querySelectorAll('input').forEach(input => {
  input.addEventListener('input', handleValidation);
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> <span>Creating account...</span>';
  globalError.style.display = 'none';

  const formData = new FormData(form);
  const data = Object.fromEntries(formData.entries());
  delete data.confirmPassword;

  try {
    const res = await api.post('/auth/register', data);
    // Redirect to OTP with email in URL or session (simulating React state)
    sessionStorage.setItem('temp_email', data.email);
    window.location.href = 'verify-otp.html';
  } catch (err) {
    globalError.textContent = err.message;
    globalError.style.display = 'block';
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<span>Sign Up & Verify</span> <i class="fas fa-arrow-right"></i>';
  }
});
