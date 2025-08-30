from firebase_functions import https_fn
from firebase_admin import firestore, auth
import json
import logging
import os
from datetime import datetime, timedelta
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# Google Calendar API scopes
SCOPES = ['https://www.googleapis.com/auth/calendar.readonly']

def get_calendar_events_handler(req: https_fn.Request) -> https_fn.Response:
    """Handle Google Calendar integration requests"""
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
        
        # Get required parameters
        start_date = data.get('startDate')
        end_date = data.get('endDate')
        access_token = data.get('accessToken')
        
        if not all([start_date, end_date, access_token]):
            return https_fn.Response(
                json.dumps({"error": "Missing required parameters: startDate, endDate, accessToken"}),
                status=400,
                headers={"Content-Type": "application/json"}
            )
        
        # Get calendar events
        try:
            busy_times = get_busy_times_from_calendar(access_token, start_date, end_date)
            
            return https_fn.Response(
                json.dumps({
                    "success": True,
                    "busyTimes": busy_times
                }),
                status=200,
                headers={"Content-Type": "application/json"}
            )
            
        except Exception as e:
            logging.error(f"Error fetching calendar events: {str(e)}")
            return https_fn.Response(
                json.dumps({"error": "Failed to fetch calendar events"}),
                status=500,
                headers={"Content-Type": "application/json"}
            )
        
    except auth.InvalidIdTokenError:
        return https_fn.Response(
            json.dumps({"error": "Invalid authentication token"}),
            status=401,
            headers={"Content-Type": "application/json"}
        )
    except Exception as e:
        logging.error(f"Error in calendar handler: {str(e)}")
        return https_fn.Response(
            json.dumps({"error": "Internal server error"}),
            status=500,
            headers={"Content-Type": "application/json"}
        )

def get_busy_times_from_calendar(access_token: str, start_date: str, end_date: str) -> list:
    """Fetch busy times from Google Calendar"""
    try:
        # Create credentials from access token
        credentials = Credentials(token=access_token)
        
        # Build Calendar service
        service = build('calendar', 'v3', credentials=credentials)
        
        # Parse dates
        start_datetime = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        end_datetime = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        
        # Get events from primary calendar
        events_result = service.events().list(
            calendarId='primary',
            timeMin=start_datetime.isoformat(),
            timeMax=end_datetime.isoformat(),
            singleEvents=True,
            orderBy='startTime'
        ).execute()
        
        events = events_result.get('items', [])
        
        # Extract busy times
        busy_times = []
        for event in events:
            # Skip all-day events and events without start/end times
            start = event.get('start', {})
            end = event.get('end', {})
            
            if 'dateTime' not in start or 'dateTime' not in end:
                continue
            
            # Skip events marked as free
            transparency = event.get('transparency', 'opaque')
            if transparency == 'transparent':
                continue
            
            busy_times.append({
                'start': start['dateTime'],
                'end': end['dateTime'],
                'title': event.get('summary', 'Busy'),
            })
        
        return busy_times
        
    except HttpError as error:
        logging.error(f'Google Calendar API error: {error}')
        raise Exception(f"Calendar API error: {error}")
    except Exception as e:
        logging.error(f'Error processing calendar data: {str(e)}')
        raise

def generate_auth_url_handler(req: https_fn.Request) -> https_fn.Response:
    """Generate Google OAuth URL for calendar access"""
    try:
        # Get redirect URI from request
        try:
            data = req.get_json() or {}
            redirect_uri = data.get('redirectUri', 'http://localhost:3000/auth/google/callback')
        except Exception:
            redirect_uri = 'http://localhost:3000/auth/google/callback'
        
        # Create OAuth flow
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": os.getenv('GOOGLE_OAUTH_CLIENT_ID'),
                    "client_secret": os.getenv('GOOGLE_OAUTH_CLIENT_SECRET'),
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [redirect_uri]
                }
            },
            scopes=SCOPES
        )
        
        flow.redirect_uri = redirect_uri
        
        # Generate authorization URL
        auth_url, _ = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true'
        )
        
        return https_fn.Response(
            json.dumps({
                "success": True,
                "authUrl": auth_url
            }),
            status=200,
            headers={"Content-Type": "application/json"}
        )
        
    except Exception as e:
        logging.error(f"Error generating auth URL: {str(e)}")
        return https_fn.Response(
            json.dumps({"error": "Failed to generate authorization URL"}),
            status=500,
            headers={"Content-Type": "application/json"}
        )

def exchange_code_for_token_handler(req: https_fn.Request) -> https_fn.Response:
    """Exchange authorization code for access token"""
    try:
        # Parse request body
        try:
            data = req.get_json()
        except Exception:
            return https_fn.Response(
                json.dumps({"error": "Invalid JSON"}),
                status=400,
                headers={"Content-Type": "application/json"}
            )
        
        code = data.get('code')
        redirect_uri = data.get('redirectUri', 'http://localhost:3000/auth/google/callback')
        
        if not code:
            return https_fn.Response(
                json.dumps({"error": "Authorization code required"}),
                status=400,
                headers={"Content-Type": "application/json"}
            )
        
        # Create OAuth flow
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": os.getenv('GOOGLE_OAUTH_CLIENT_ID'),
                    "client_secret": os.getenv('GOOGLE_OAUTH_CLIENT_SECRET'),
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [redirect_uri]
                }
            },
            scopes=SCOPES
        )
        
        flow.redirect_uri = redirect_uri
        
        # Exchange code for token
        flow.fetch_token(code=code)
        
        credentials = flow.credentials
        
        return https_fn.Response(
            json.dumps({
                "success": True,
                "accessToken": credentials.token,
                "refreshToken": credentials.refresh_token,
                "expiresAt": credentials.expiry.isoformat() if credentials.expiry else None
            }),
            status=200,
            headers={"Content-Type": "application/json"}
        )
        
    except Exception as e:
        logging.error(f"Error exchanging code for token: {str(e)}")
        return https_fn.Response(
            json.dumps({"error": "Failed to exchange authorization code"}),
            status=500,
            headers={"Content-Type": "application/json"}
        )