from firebase_functions import https_fn
from firebase_admin import firestore, auth
import json
import logging
import os
from pydantic import BaseModel, ValidationError
from typing import List, Dict, Optional
import google.generativeai as genai

# Configure Gemini API
genai.configure(api_key=os.getenv('GOOGLE_AI_API_KEY'))

class AvailabilityItem(BaseModel):
    time: str  # ISO 8601 format
    status: str  # 'available' | 'maybe' | 'unavailable'
    comment: Optional[str] = ""

class Participant(BaseModel):
    name: str
    availability: List[AvailabilityItem]

class AISchedulingInput(BaseModel):
    meetingTitle: str
    timeSlots: List[str]  # ISO 8601 format
    participants: List[Participant]
    hostInstructions: Optional[str] = ""

class AISchedulingResult(BaseModel):
    date: str  # yyyy-mm-dd format
    reason: str

def run_ai_suggestion_handler(req: https_fn.Request) -> https_fn.Response:
    """Handle AI scheduling suggestion requests (host only)"""
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
                json.dumps({"error": "Forbidden: Only meeting creator can run AI suggestion"}),
                status=403,
                headers={"Content-Type": "application/json"}
            )
        
        # Check remaining AI suggestions
        ai_suggestions_remaining = meeting_data.get('aiSuggestionsRemaining', 0)
        if ai_suggestions_remaining <= 0:
            return https_fn.Response(
                json.dumps({"error": "No AI suggestions remaining"}),
                status=400,
                headers={"Content-Type": "application/json"}
            )
        
        # Get participant availabilities
        availabilities_ref = meeting_ref.collection('availabilities')
        availabilities_docs = availabilities_ref.stream()
        
        participants = []
        for doc in availabilities_docs:
            participant_data = doc.to_dict()
            
            # Convert schedule to availability list
            availability_list = []
            schedule = participant_data.get('schedule', {})
            for time_str, availability in schedule.items():
                availability_list.append(AvailabilityItem(
                    time=time_str,
                    status=availability.get('status', 'unavailable'),
                    comment=availability.get('comment', '')
                ))
            
            participants.append(Participant(
                name=participant_data.get('userName', ''),
                availability=availability_list
            ))
        
        if not participants:
            return https_fn.Response(
                json.dumps({"error": "No participants have submitted availability yet"}),
                status=400,
                headers={"Content-Type": "application/json"}
            )
        
        # Parse request body for host instructions
        try:
            request_data = req.get_json() or {}
            host_instructions = request_data.get('hostInstructions', '')
        except Exception:
            host_instructions = ''
        
        # Prepare data for AI
        time_slots = [ts.isoformat() if hasattr(ts, 'isoformat') else str(ts) 
                     for ts in meeting_data.get('timeSlots', [])]
        
        ai_input = AISchedulingInput(
            meetingTitle=meeting_data.get('title', ''),
            timeSlots=time_slots,
            participants=participants,
            hostInstructions=host_instructions
        )
        
        # Call Gemini AI
        try:
            ai_result = call_gemini_ai(ai_input)
        except Exception as e:
            logging.error(f"Error calling Gemini AI: {str(e)}")
            return https_fn.Response(
                json.dumps({"error": "AI processing failed"}),
                status=500,
                headers={"Content-Type": "application/json"}
            )
        
        # Update meeting with AI result
        meeting_ref.update({
            'status': 'confirmed',
            'confirmedDateTime': ai_result.date,
            'confirmedReason': ai_result.reason,
            'aiSuggestionsRemaining': ai_suggestions_remaining - 1,
            'updatedAt': firestore.SERVER_TIMESTAMP
        })
        
        return https_fn.Response(
            json.dumps({
                "success": True,
                "result": {
                    "date": ai_result.date,
                    "reason": ai_result.reason
                },
                "message": "AI suggestion completed successfully"
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
        logging.error(f"Error running AI suggestion: {str(e)}")
        return https_fn.Response(
            json.dumps({"error": "Internal server error"}),
            status=500,
            headers={"Content-Type": "application/json"}
        )

def call_gemini_ai(ai_input: AISchedulingInput) -> AISchedulingResult:
    """Call Gemini AI to get scheduling suggestions"""
    
    prompt = f"""
あなたは優秀なアシスタントです。以下のミーティング参加者の空き状況と制約条件を考慮し、最も最適なミーティング日時を1つ提案してください。

全員が参加できることを最優先とします。もし全員の参加が難しい場合は、より多くの人が参加できる時間を優先してください。

ミーティング情報:
- タイトル: {ai_input.meetingTitle}
- 候補時間: {', '.join(ai_input.timeSlots)}

参加者の空き状況:
{format_participants_for_prompt(ai_input.participants)}

ホストからの追加指示:
{ai_input.hostInstructions or "特になし"}

なぜその時間が最適なのか、誰が参加できないのかを明確にして理由を説明してください。

出力は以下のJSON形式で厳密に返してください:
{{
    "date": "2024-01-15T14:30:00+09:00",
    "reason": "この時間が最適な理由の詳細な説明"
}}
"""
    
    model = genai.GenerativeModel('gemini-pro')
    response = model.generate_content(prompt)
    
    try:
        # Parse JSON response
        response_text = response.text.strip()
        if response_text.startswith('```json'):
            response_text = response_text[7:-3]
        elif response_text.startswith('```'):
            response_text = response_text[3:-3]
        
        response_json = json.loads(response_text)
        return AISchedulingResult(**response_json)
    
    except (json.JSONDecodeError, ValidationError) as e:
        logging.error(f"Error parsing AI response: {str(e)}, Response: {response.text}")
        # Fallback: create a basic response
        return AISchedulingResult(
            date=ai_input.timeSlots[0] if ai_input.timeSlots else "2024-01-01T00:00:00+09:00",
            reason="AI response could not be parsed. Please try again."
        )

def format_participants_for_prompt(participants: List[Participant]) -> str:
    """Format participants data for AI prompt"""
    formatted = []
    
    for participant in participants:
        availability_summary = {}
        for avail in participant.availability:
            status = avail.status
            if status not in availability_summary:
                availability_summary[status] = []
            availability_summary[status].append(f"{avail.time}{' (' + avail.comment + ')' if avail.comment else ''}")
        
        participant_text = f"- {participant.name}:\n"
        for status, times in availability_summary.items():
            status_jp = {"available": "参加可能", "maybe": "条件付き参加可能", "unavailable": "参加不可"}
            participant_text += f"  {status_jp.get(status, status)}: {', '.join(times)}\n"
        
        formatted.append(participant_text)
    
    return '\n'.join(formatted)