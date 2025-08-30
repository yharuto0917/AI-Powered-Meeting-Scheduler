from firebase_functions import https_fn
from firebase_admin import firestore, auth
import json
import logging

def update_meeting_handler(req: https_fn.Request) -> https_fn.Response:
    """Handle meeting update requests (host only)"""
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
        
        # Extract meeting ID from path
        path_parts = req.path.strip('/').split('/')
        if len(path_parts) < 2:
            return https_fn.Response(
                json.dumps({"error": "Meeting ID required"}),
                status=400,
                headers={"Content-Type": "application/json"}
            )
        
        meeting_id = path_parts[-1]
        
        # Get meeting from Firestore
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
        
        # Check if user is the meeting creator
        if meeting_data.get('creatorUid') != user_uid:
            return https_fn.Response(
                json.dumps({"error": "Forbidden: Only meeting creator can update"}),
                status=403,
                headers={"Content-Type": "application/json"}
            )
        
        # Parse request body
        try:
            update_data = req.get_json()
        except Exception:
            return https_fn.Response(
                json.dumps({"error": "Invalid JSON"}),
                status=400,
                headers={"Content-Type": "application/json"}
            )
        
        # Filter allowed update fields
        allowed_fields = ['title', 'description', 'deadline', 'status']
        filtered_data = {k: v for k, v in update_data.items() if k in allowed_fields}
        
        if not filtered_data:
            return https_fn.Response(
                json.dumps({"error": "No valid fields to update"}),
                status=400,
                headers={"Content-Type": "application/json"}
            )
        
        # Add update timestamp
        filtered_data['updatedAt'] = firestore.SERVER_TIMESTAMP
        
        # Update meeting document
        meeting_ref.update(filtered_data)
        
        return https_fn.Response(
            json.dumps({
                "success": True,
                "message": "Meeting updated successfully"
            }),
            status=200,
            headers={"Content-Type": "application/json"}
        )
        
    except auth.InvalidIdTokenError:
        return https_fn.Response(
            json.dumps({"error": "Invalid authentication token"}),
            status=401,
            headers={"Content-Type": "application/json"}
        )
    except Exception as e:
        logging.error(f"Error updating meeting: {str(e)}")
        return https_fn.Response(
            json.dumps({"error": "Internal server error"}),
            status=500,
            headers={"Content-Type": "application/json"}
        )