from flask import Blueprint, request, jsonify
from bson import ObjectId
from app import mongo
from app.services.otp_service import generate_otp, store_otp, send_email_otp_smtp, verify_otp_code
from app.middleware.auth_middleware import token_required

otp_bp = Blueprint("otp", __name__)

@otp_bp.route("/send-email", methods=["POST"])
@token_required
def send_email_otp_route(current_user):
    """
    Generate and send an OTP to the user's registered email.
    User must be authenticated via JWT to request an OTP for their account.
    """
    user_id = current_user["_id"]
    email = current_user["email"]

    # Generate and store OTP
    otp_code = generate_otp()
    store_otp(mongo, user_id, email, otp_code, otp_type="email")

    # Send Email
    success = send_email_otp_smtp(email, otp_code)
    
    if success:
        return jsonify({"message": "OTP sent successfully to your email."}), 200
    else:
        return jsonify({"error": "Failed to send OTP email. Please try again later."}), 500

@otp_bp.route("/verify-email", methods=["POST"])
@token_required
def verify_email_otp_route(current_user):
    """
    Verify the email OTP provided by the user.
    """
    data = request.get_json()
    if not data or "otp" not in data:
        return jsonify({"error": "OTP code is required."}), 400

    user_id = current_user["_id"]
    provided_code = str(data.get("otp")).strip()

    success, message = verify_otp_code(mongo, user_id, provided_code, otp_type="email")

    if success:
        # Mark email as verified in user document
        mongo.users.update_one(
            {"_id": user_id},
            {"$set": {"email_verified": True}}
        )
        return jsonify({"message": message}), 200
    else:
        return jsonify({"error": message}), 400

@otp_bp.route("/verify-phone", methods=["POST"])
@token_required
def verify_phone_token_route(current_user):
    """
    Verify the Firebase token after a successful Phone OTP verification on the frontend.
    """
    data = request.get_json()
    if not data or "firebase_token" not in data:
        return jsonify({"error": "Firebase token is required."}), 400

    firebase_token = data.get("firebase_token")
    
    try:
        from firebase_admin import auth
        # Verify the Firebase token
        decoded_token = auth.verify_id_token(firebase_token)
        phone_number = decoded_token.get("phone_number")
        
        if not phone_number:
            return jsonify({"error": "Invalid token: No phone number found."}), 400
            
        # Optional: Check if the phone number matches the one in DB
        # if current_user.get("phone") != phone_number:
        #     return jsonify({"error": "Verified phone number does not match registered phone number."}), 400

        # Mark phone as verified
        mongo.users.update_one(
            {"_id": current_user["_id"]},
            {"$set": {"phone_verified": True}}
        )
        return jsonify({"message": "Phone number verified successfully."}), 200
        
    except Exception as e:
        print(f"Firebase token verification failed: {e}")
        return jsonify({"error": "Failed to verify phone token. Please try again."}), 400
