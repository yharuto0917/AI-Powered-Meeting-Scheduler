from firebase_functions import https_fn, options
from firebase_admin import initialize_app, firestore, auth
import json
import logging
from future.create_meeting import create_meeting_handler
from future.get_meeting import get_meeting_handler
from future.update_meeting import update_meeting_handler
from future.submit_availability import submit_availability_handler
from future.ai_suggestion import run_ai_suggestion_handler

# Initialize Firebase Admin
initialize_app()

# Configure logging
logging.basicConfig(level=logging.INFO)

@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["*"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def create_meeting(req: https_fn.Request) -> https_fn.Response:
    """Create a new meeting"""
    if req.method == 'OPTIONS':
        return https_fn.Response(status=200)
    
    if req.method != 'POST':
        return https_fn.Response(
            json.dumps({"error": "Method not allowed"}),
            status=405,
            headers={"Content-Type": "application/json"}
        )
    
    return create_meeting_handler(req)

@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["*"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def get_meeting(req: https_fn.Request) -> https_fn.Response:
    """Get meeting information"""
    if req.method == 'OPTIONS':
        return https_fn.Response(status=200)
    
    if req.method != 'GET':
        return https_fn.Response(
            json.dumps({"error": "Method not allowed"}),
            status=405,
            headers={"Content-Type": "application/json"}
        )
    
    return get_meeting_handler(req)

@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["*"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def update_meeting(req: https_fn.Request) -> https_fn.Response:
    """Update meeting information (host only)"""
    if req.method == 'OPTIONS':
        return https_fn.Response(status=200)
    
    if req.method != 'PUT':
        return https_fn.Response(
            json.dumps({"error": "Method not allowed"}),
            status=405,
            headers={"Content-Type": "application/json"}
        )
    
    return update_meeting_handler(req)

@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["*"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def submit_availability(req: https_fn.Request) -> https_fn.Response:
    """Submit participant availability"""
    if req.method == 'OPTIONS':
        return https_fn.Response(status=200)
    
    if req.method != 'POST':
        return https_fn.Response(
            json.dumps({"error": "Method not allowed"}),
            status=405,
            headers={"Content-Type": "application/json"}
        )
    
    return submit_availability_handler(req)

@https_fn.on_request(cors=options.CorsOptions(
    cors_origins=["*"],
    cors_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
))
def run_ai_suggestion(req: https_fn.Request) -> https_fn.Response:
    """Run AI scheduling suggestion (host only)"""
    if req.method == 'OPTIONS':
        return https_fn.Response(status=200)
    
    if req.method != 'POST':
        return https_fn.Response(
            json.dumps({"error": "Method not allowed"}),
            status=405,
            headers={"Content-Type": "application/json"}
        )
    
    return run_ai_suggestion_handler(req)