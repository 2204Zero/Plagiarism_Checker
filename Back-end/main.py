from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
import sys
import uvicorn
import secrets
from typing import Optional, Dict
from pydantic import BaseModel

# Ensure this directory is on sys.path so `import checker` works despite hyphen in parent dir name
CURRENT_DIR = os.path.dirname(__file__)
if CURRENT_DIR not in sys.path:
	sys.path.append(CURRENT_DIR)

import checker  # type: ignore


app = FastAPI(title="Plagiarism Checker API", version="0.1.0")

app.add_middleware(
	CORSMiddleware,
	allow_origins=["*"],
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)


UPLOADS_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)

# Simple in-memory user storage for demo purposes
users = {}
tokens = {}

class UserCredentials(BaseModel):
    email: str
    password: str

@app.post("/auth/login")
async def login(credentials: UserCredentials):
    email = credentials.email
    password = credentials.password
    
    if email not in users or users[email] != password:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Generate token
    token = secrets.token_hex(16)
    tokens[token] = email
    
    return {"token": token, "email": email}

@app.post("/auth/signup")
async def signup(credentials: UserCredentials):
    email = credentials.email
    password = credentials.password
    
    if email in users:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    users[email] = password
    
    # Generate token
    token = secrets.token_hex(16)
    tokens[token] = email
    
    return {"token": token, "email": email}


@app.post("/check")
async def check_endpoint(
	mode: str = Form(default="local"),
	fileA: Optional[UploadFile] = File(default=None),
	fileB: Optional[UploadFile] = File(default=None),
	textB: Optional[str] = Form(default=None),
):
	"""
	Compare two local files (mode=local) and return structured highlights.
	"""
	mode = (mode or "local").lower().strip()
	path_a: Optional[str] = None
	path_b: Optional[str] = None
	if fileA is not None:
		path_a = os.path.join(UPLOADS_DIR, fileA.filename)
		with open(path_a, "wb") as f:
			f.write(await fileA.read())
	if fileB is not None:
		path_b = os.path.join(UPLOADS_DIR, fileB.filename)
		with open(path_b, "wb") as f:
			f.write(await fileB.read())

	if mode != "local":
		return JSONResponse(status_code=400, content={"error": "mode must be 'local'"})

	if not path_a or (not path_b and not (textB or "").strip()):
		return JSONResponse(status_code=400, content={"error": "local mode requires fileA and fileB or textB"})

	result = checker.run_checks(file_a_path=path_a or "", file_b_path=path_b or "", text_b=textB or "", mode=mode)
	return JSONResponse(content=result)


if __name__ == "__main__":
	# Run with: python main.py  (from the Back-end directory)
	uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)


