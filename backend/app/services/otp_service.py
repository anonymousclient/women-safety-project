import random
import string
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timedelta, timezone

def generate_otp(length=6):
    """Generate a random numeric OTP."""
    return ''.join(random.choices(string.digits, k=length))

def store_otp(db, user_id, email, otp_code, otp_type="email"):
    """
    Store OTP in database with 5 minutes expiry.
    Removes any existing active OTP for this user and type.
    """
    db.otp_verifications.delete_many({"user_id": user_id, "type": otp_type})
    
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=5)
    
    db.otp_verifications.insert_one({
        "user_id": user_id,
        "email": email,
        "otp_code": otp_code,
        "type": otp_type,
        "attempts": 0,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc)
    })

def send_email_otp_smtp(email, otp_code):
    """
    Send OTP via email using SMTP.
    Requires MAIL_USERNAME and MAIL_PASSWORD in environment.
    """
    sender_email = os.environ.get("MAIL_USERNAME")
    sender_password = os.environ.get("MAIL_PASSWORD")
    
    if not sender_email or not sender_password:
        raise Exception("SMTP credentials not configured. Please check your .env file.")

    msg = MIMEMultipart()
    msg['From'] = f"Women Safety System <{sender_email}>"
    msg['To'] = email
    msg['Subject'] = "Your Verification Code"

    body = f"""
    Hello,

    Your verification code is: {otp_code}
    
    This code will expire in 5 minutes.
    Do not share this code with anyone.

    Stay Safe,
    Women Safety System Team
    """
    msg.attach(MIMEText(body, 'plain'))

    try:
        print(f"Attempting to send email to {email}...")
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.set_debuglevel(1)
        server.starttls()
        server.login(sender_email, sender_password)
        text = msg.as_string()
        server.sendmail(sender_email, email, text)
        server.quit()
        print(f"Email successfully sent to {email}")
        return True
    except Exception as e:
        print(f"SMTP ERROR: Failed to send email to {email}: {e}")
        return False

def verify_otp_code(db, user_id, provided_code, otp_type="email"):
    """
    Verify the provided OTP code.
    Returns: (success: bool, message: str)
    """
    otp_record = db.otp_verifications.find_one({"user_id": user_id, "type": otp_type})
    
    if not otp_record:
        return False, "No active OTP found. Please request a new one."
        
    # Check expiry
    now = datetime.now(timezone.utc)
    expires_at = otp_record["expires_at"]
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if now > expires_at:
        db.otp_verifications.delete_one({"_id": otp_record["_id"]})
        return False, "OTP has expired. Please request a new one."
        
    # Check attempts (max 3)
    if otp_record.get("attempts", 0) >= 3:
        db.otp_verifications.delete_one({"_id": otp_record["_id"]})
        return False, "Too many failed attempts. Please request a new OTP."
        
    # Verify code
    if otp_record["otp_code"] != provided_code:
        db.otp_verifications.update_one(
            {"_id": otp_record["_id"]},
            {"$inc": {"attempts": 1}}
        )
        return False, "Invalid OTP code."
        
    # Success - delete the OTP record
    db.otp_verifications.delete_one({"_id": otp_record["_id"]})
    return True, "OTP verified successfully."
