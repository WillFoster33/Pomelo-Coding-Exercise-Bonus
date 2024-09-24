from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import json
from datetime import datetime
from collections import defaultdict
import logging

# Set up logging for debugging and monitoring
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI application
app = FastAPI()

# Enable CORS to allow requests from the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"], 
)

# Set initial credit limit for the card
INITIAL_CREDIT_LIMIT = 1000

# In-memory database to store card activity
card_activity = {
    "creditLimit": INITIAL_CREDIT_LIMIT,
    "events": []
}

# Pydantic model for event data validation
class Event(BaseModel):
    eventType: str
    eventTime: str
    txnId: str
    amount: Optional[float] = None

# Pydantic model for card activity data validation
class CardActivity(BaseModel):
    creditLimit: float
    events: List[Event]

# Endpoint to add a new event
@app.post("/events")
async def add_event(event: Event):
    card_activity["events"].append(event.dict())
    return {"message": "Event added successfully"}

# Endpoint to get the current summary of card activity
@app.get("/summary")
async def get_summary():
    summary = summarize(json.dumps(card_activity))
    return summary

# Endpoint to reset the card activity to initial state
@app.post("/reset")
async def reset_card_activity():
    global card_activity
    card_activity = {
        "creditLimit": INITIAL_CREDIT_LIMIT,
        "events": []
    }
    return summarize(json.dumps(card_activity))

# Function to summarize the card activity
def summarize(input_json):
    card_activity = json.loads(input_json)
    credit_limit = card_activity['creditLimit']
    events = card_activity['events']
    
    available_credit = credit_limit
    payable_balance = 0
    pending_transactions = defaultdict(dict)
    settled_transactions = []
    
    # Process each event and update the card state
    for event in events:
        event_type = event['eventType']
        event_time = event['eventTime']
        txn_id = event['txnId']
        amount = event.get('amount', 0)
        
        if event_type == 'TXN_AUTHED':
            # Authorized transaction: reduce available credit and add to pending
            available_credit -= amount
            pending_transactions[txn_id] = {
                'amount': amount,
                'time': event_time
            }
        elif event_type == 'TXN_SETTLED':
            # Settled transaction: update available credit and payable balance
            if txn_id in pending_transactions:
                available_credit += pending_transactions[txn_id]['amount']
                available_credit -= amount
                initial_time = pending_transactions[txn_id]['time']
                del pending_transactions[txn_id]
            else:
                initial_time = event_time
            payable_balance += amount
            settled_transactions.append({
                'id': txn_id,
                'amount': amount,
                'initial_time': initial_time,
                'end_time': event_time
            })
        elif event_type == 'PAYMENT_INITIATED':
            # Payment initiated: add to pending transactions
            pending_transactions[txn_id] = {
                'amount': amount,
                'time': event_time
            }
        elif event_type == 'PAYMENT_POSTED':
            # Payment posted: update available credit and payable balance
            if txn_id in pending_transactions:
                payment_amount = pending_transactions[txn_id]['amount']
                initial_time = pending_transactions[txn_id]['time']
                del pending_transactions[txn_id]
                available_credit += abs(payment_amount)
                payable_balance -= abs(payment_amount)
                settled_transactions.append({
                    'id': txn_id,
                    'amount': -abs(payment_amount),
                    'initial_time': initial_time,
                    'end_time': event_time
                })
    
    # Format the summary
    summary = {
        "availableCredit": round(available_credit, 2),
        "payableBalance": round(payable_balance, 2),
        "pendingTransactions": [
            {
                "id": txn_id,
                "amount": txn_data['amount'],
                "time": txn_data['time']
            }
            for txn_id, txn_data in sorted(pending_transactions.items(), key=lambda x: (x[1]['time'], x[0]), reverse=True)
        ],
        "settledTransactions": [
            {
                "id": txn['id'],
                "amount": txn['amount'],
                "initialTime": txn['initial_time'],
                "finalTime": txn['end_time']
            }
            for txn in sorted(settled_transactions, key=lambda x: (x['end_time'], x['id']), reverse=True)[:3]
        ]
    }
    
    logger.info(f"Final summary:\n{json.dumps(summary, indent=2)}")
    return summary

# Run the FastAPI application using uvicorn
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)