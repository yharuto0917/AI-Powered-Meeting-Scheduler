from firebase_functions import https_fn
from firebase_admin import firestore
import json
import logging

def get_meeting_handler(req: https_fn.Request) -> https_fn.Response:
    """Handle meeting retrieval requests"""
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
        meeting_data['id'] = meeting_doc.id
        
        # Convert timestamps to ISO strings for JSON serialization
        if 'createdAt' in meeting_data and meeting_data['createdAt']:
            meeting_data['createdAt'] = meeting_data['createdAt'].isoformat()
        if 'deadline' in meeting_data and meeting_data['deadline']:
            meeting_data['deadline'] = meeting_data['deadline'].isoformat()
        if 'confirmedDateTime' in meeting_data and meeting_data['confirmedDateTime']:
            meeting_data['confirmedDateTime'] = meeting_data['confirmedDateTime'].isoformat()
        
        # Get participant availabilities
        availabilities_ref = meeting_ref.collection('availabilities')
        availabilities_docs = availabilities_ref.stream()
        
        participants = []
        for doc in availabilities_docs:
            participant_data = doc.to_dict()
            participant_data['userId'] = doc.id
            participants.append(participant_data)
        
        return https_fn.Response(
            json.dumps({
                "success": True,
                "meeting": meeting_data,
                "participants": participants
            }),
            status=200,
            headers={"Content-Type": "application/json"}
        )
        
    except Exception as e:
        logging.error(f"Error retrieving meeting: {str(e)}")
        return https_fn.Response(
            json.dumps({"error": "Internal server error"}),
            status=500,
            headers={"Content-Type": "application/json"}
        )