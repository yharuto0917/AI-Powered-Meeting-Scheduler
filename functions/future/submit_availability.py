from firebase_functions import https_fn
from firebase_admin import firestore, auth
import json
import logging

def submit_availability_handler(req: https_fn.Request) -> https_fn.Response:
    """Handle participant availability submission"""
    try:
        # Extract meeting ID from path
        path_parts = req.path.strip('/').split('/')
        if len(path_parts) < 2:
            return https_fn.Response(
                json.dumps({"error": "Meeting ID required"}),
                status=400,
                headers={"Content-Type": "application/json"}
            )
        
        meeting_id = path_parts[-1]
        
        # Parse request body
        try:
            data = req.get_json()
        except Exception:
            return https_fn.Response(
                json.dumps({"error": "Invalid JSON"}),
                status=400,
                headers={"Content-Type": "application/json"}
            )
        
        # Validate required fields
        required_fields = ['userName', 'schedule']
        for field in required_fields:
            if field not in data:
                return https_fn.Response(
                    json.dumps({"error": f"Missing required field: {field}"}),
                    status=400,
                    headers={"Content-Type": "application/json"}
                )
        
        # Generate user ID if not authenticated
        user_id = None
        auth_header = req.headers.get('Authorization', '')
        
        if auth_header.startswith('Bearer '):
            try:
                token = auth_header.split('Bearer ')[1]
                decoded_token = auth.verify_id_token(token)
                user_id = decoded_token['uid']
            except auth.InvalidIdTokenError:
                pass
        
        # If no authenticated user, generate a unique ID based on name and meeting
        if not user_id:
            import hashlib
            user_id = hashlib.md5(f"{meeting_id}_{data['userName']}".encode()).hexdigest()[:16]
        
        # Verify meeting exists and is still accepting responses
        db = firestore.client()
        meeting_ref = db.collection('meetings').document(meeting_id)
        meeting_doc = meeting_ref.get()
        
        if not meeting_doc.exists:
            return https_fn.Response(
                json.dumps({"error": "Meeting not found"}),
                status=404,
                headers={"Content-Type": "application/json"}
            )
        
        meeting_data = meeting_doc.to_dict()
        if meeting_data.get('status') != 'scheduling':
            return https_fn.Response(
                json.dumps({"error": "Meeting is no longer accepting responses"}),
                status=400,
                headers={"Content-Type": "application/json"}
            )
        
        # Check if deadline has passed
        deadline = meeting_data.get('deadline')
        if deadline and deadline < firestore.SERVER_TIMESTAMP:
            return https_fn.Response(
                json.dumps({"error": "Response deadline has passed"}),
                status=400,
                headers={"Content-Type": "application/json"}
            )
        
        # Save participant availability
        availability_data = {
            'userName': data['userName'],
            'schedule': data['schedule'],
            'submittedAt': firestore.SERVER_TIMESTAMP,
        }
        
        availability_ref = meeting_ref.collection('availabilities').document(user_id)
        availability_ref.set(availability_data)
        
        return https_fn.Response(
            json.dumps({
                "success": True,
                "userId": user_id,
                "message": "Availability submitted successfully"
            }),
            status=200,
            headers={"Content-Type": "application/json"}
        )
        
    except Exception as e:
        logging.error(f"Error submitting availability: {str(e)}")
        return https_fn.Response(
            json.dumps({"error": "Internal server error"}),
            status=500,
            headers={"Content-Type": "application/json"}
        )