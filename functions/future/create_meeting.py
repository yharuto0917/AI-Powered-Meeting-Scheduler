from firebase_functions import https_fn
from firebase_admin import firestore, auth
import json
import logging

def create_meeting_handler(req: https_fn.Request) -> https_fn.Response:
    """Handle meeting creation requests"""
    try:
        # Verify authentication
        auth_header = req.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return https_fn.Response(
                json.dumps({"error": "Unauthorized"}),
                status=401,
                headers={"Content-Type": "application/json"}
            )
        
        token = auth_header.split('Bearer ')[1]
        decoded_token = auth.verify_id_token(token)
        user_uid = decoded_token['uid']
        
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
        required_fields = ['title', 'timeSlots', 'deadline']
        for field in required_fields:
            if field not in data:
                return https_fn.Response(
                    json.dumps({"error": f"Missing required field: {field}"}),
                    status=400,
                    headers={"Content-Type": "application/json"}
                )
        
        # Create meeting document
        db = firestore.client()
        meeting_data = {
            'title': data['title'],
            'description': data.get('description', ''),
            'timeSlots': [firestore.SERVER_TIMESTAMP] * len(data['timeSlots']),  # Placeholder
            'deadline': data['deadline'],
            'creatorUid': user_uid,
            'status': 'scheduling',
            'confirmedDateTime': None,
            'confirmedReason': None,
            'createdAt': firestore.SERVER_TIMESTAMP,
            'aiSuggestionsRemaining': 2,
        }
        
        # Add the meeting to Firestore
        meeting_ref = db.collection('meetings').add(meeting_data)
        meeting_id = meeting_ref[1].id
        
        return https_fn.Response(
            json.dumps({
                "success": True,
                "meetingId": meeting_id,
                "message": "Meeting created successfully"
            }),
            status=201,
            headers={"Content-Type": "application/json"}
        )
        
    except auth.InvalidIdTokenError:
        return https_fn.Response(
            json.dumps({"error": "Invalid authentication token"}),
            status=401,
            headers={"Content-Type": "application/json"}
        )
    except Exception as e:
        logging.error(f"Error creating meeting: {str(e)}")
        return https_fn.Response(
            json.dumps({"error": "Internal server error"}),
            status=500,
            headers={"Content-Type": "application/json"}
        )