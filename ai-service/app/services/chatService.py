import json
from typing import List, Dict, Any, Optional
from groq import Groq
from app.core.config import settings
from app.services.indexingService import indexing_service

class ChatService:
    def __init__(self):
        self.client = None
        if settings.GROQ_API_KEY:
            try:
                # Basic initialization to avoid internal argument conflicts
                self.client = Groq(api_key=settings.GROQ_API_KEY)
            except Exception as e:
                print(f"Error initializing Groq client for Chat: {e}")

    async def query_document(self, document_id: str, organization_id: str, message: str, history: List[Dict] = []) -> Dict[str, Any]:
        """Queries a document using Groq for RAG."""
        
        # 1. Get document content
        content = indexing_service.get_document_content(document_id, organization_id)
        
        if not content:
            return {
                "answer": "I'm sorry, I couldn't find the content for this document. It might not have been processed correctly.",
                "confidence": 0.0,
                "source_found": False
            }

        if not self.client:
            raise Exception("AI Chat is currently unavailable (API key missing).")

        # 2. Build prompt
        # We limit the context size
        context = content[:15000] 
        
        system_prompt = f"""
        You are an intelligent document assistant for IntelliDocX. 
        Analyze the following document content and answer the user's question accurately.
        If the answer is not in the document, say you don't know based on the provided text.
        
        DOCUMENT CONTENT:
        ---
        {context}
        ---
        
        Provide a concise and helpful answer.
        """

        messages = [{"role": "system", "content": system_prompt}]
        
        # Add history (up to last 5 exchanges)
        for turn in history[-10:]:
            messages.append(turn)
            
        # Add current message
        messages.append({"role": "user", "content": message})

        try:
            response = self.client.chat.completions.create(
                messages=messages,
                model=settings.GROQ_MODEL,
                temperature=0.2, # Lower temperature for better accuracy
            )
            
            answer = response.choices[0].message.content
            
            return {
                "answer": answer,
                "confidence": 0.95,
                "source_found": True
            }
        except Exception as e:
            print(f"Groq Chat error: {e}")
            raise e

    async def system_chat(self, organization_id: str, message: str, history: List[Dict] = []) -> Dict[str, Any]:
        """Queries the general assistant without a specific document context."""
        if not self.client:
            raise Exception("IntelliBot is currently unavailable (API key missing).")

        system_prompt = """
        You are IntelliBot, the intelligent assistant for the IntelliDocX Enterprise Document Management System.
        Your purpose is to help users navigate the system, understand document management workflows, and answer general questions.
        You are helpful, concise, and professional. 
        If asked about documents, guide the user to the 'Search' or 'Documents' tabs.
        If asked about approvals or workflows, guide them to the 'Workflows' or 'Approvals' tabs.
        """

        messages = [{"role": "system", "content": system_prompt}]
        
        for turn in history[-10:]:
            messages.append(turn)
            
        messages.append({"role": "user", "content": message})

        try:
            response = self.client.chat.completions.create(
                messages=messages,
                model=settings.GROQ_MODEL,
                temperature=0.6,
            )
            
            return {
                "answer": response.choices[0].message.content,
                "confidence": 0.95,
                "source_found": False
            }
        except Exception as e:
            print(f"Groq System Chat error: {e}")
            raise e

chat_service = ChatService()
