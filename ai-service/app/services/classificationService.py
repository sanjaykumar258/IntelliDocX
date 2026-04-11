import os
import json
import re
from typing import List, Dict, Any
import time
from groq import Groq
from app.core.config import settings

class ClassificationService:
    def __init__(self):
        self.departments = ["Legal", "HR", "Reports", "Projects", "Communication", "Financial", "Operations", "Engineering", "General", "AI Insights"]
        self.categories = [
            "Contract", "Agreement", "NDA", "Legal Notice", "Compliance", "License",
            "Resume", "Offer Letter", "Employee Record", "Payslip", "Performance Review", "ID Proof",
            "Report", "Financial Statement", "Audit Report", "Sales Report", "Project Report", "Market Analysis",
            "Project Plan", "Proposal", "Presentation", "Meeting Notes", "Task Document", "Technical Documentation",
            "Email", "Memo", "Letter", "Notice",
            "Tax Document", "Bank Statement", "Expense Report", "Investment Record",
            "AI Insight", "User Profile", "Recommendation", "Image Analysis", "Skin Tone Data", "Product Catalog",
            "Invoice", "Uncategorized"
        ]
        
        # Initialize Groq client if API key is present
        self.client = None
        if settings.GROQ_API_KEY:
            try:
                self.client = Groq(api_key=settings.GROQ_API_KEY)
            except Exception as e:
                print(f"Error initializing Groq client: {e}")
        
        # Keyword-based rules for fallback/initialization
        self.rules = {
            "HR": ["resume", "cv", "hiring", "offer letter", "candidate", "employee", "onboarding", "payslip", "performance"],
            "Financial": ["invoice", "bill", "payment", "tax", "audit", "salary", "expense", "bank statement", "investment", "financial statement"],
            "Legal": ["contract", "agreement", "nda", "terms", "clause", "signature", "party", "compliance", "license"],
            "Projects": ["project", "proposal", "presentation", "meeting notes", "task", "milestone"],
            "Communication": ["email", "memo", "letter", "notice", "announcement"],
            "AI Insights": ["insight", "user profile", "recommendation", "image analysis", "skin tone", "catalog"],
            "Engineering": ["design", "architecture", "spec", "diagram", "code", "technical"],
            "Operations": ["schedule", "logistics", "inventory", "supply", "report", "process"]
        }
        
        self.category_rules = {
            "Invoice": ["invoice", "bill to", "total amount", "due date"],
            "Contract": ["agreement", "parties", "witnesseth", "term", "contract"],
            "Resume": ["experience", "education", "skills", "summary", "cv"],
            "Report": ["report", "status", "analysis", "findings"],
            "Offer Letter": ["offer", "salary", "start date", "benefits"],
            "Financial Statement": ["balance sheet", "income statement", "cash flow", "financial statement"],
            "Project Plan": ["timeline", "milestone", "project plan", "deliverable"],
            "Meeting Notes": ["minutes", "attendees", "action items", "meeting"],
            "AI Insight": ["confidence score", "prediction", "analysis report", "ai generated"]
        }

    def classify_document(self, text: str, embedding: List[float] = None) -> Dict[str, Any]:
        """Classifies document and extracts metadata using Groq or fallback rules."""
        if self.client and settings.GROQ_API_KEY:
            try:
                return self._classify_with_groq(text)
            except Exception as e:
                print(f"Groq classification failed, falling back: {e}")
        
        return self._classify_with_rules(text)

    def _classify_with_groq(self, text: str) -> Dict[str, Any]:
        # Limit text size for the prompt (Groq has limits)
        truncated_text = text[:8000]
        
        prompt = f"""
        Analyze the following document text and provide classification and metadata extraction in JSON format.
        
        Departments: {', '.join(self.departments)}
        Categories: {', '.join(self.categories)}
        
        JSON Structure:
        {{
            "department": "One of the allowed departments",
            "category": "One of the allowed categories",
            "confidenceScore": 0.0 to 1.0 (Calculate rigor. If the text clearly matches the expected structure, assign a confidence >0.85),
            "suggestedTags": ["tag1", "tag2", ...],
            "extractedData": {{
                "key": "value"
            }}
        }}
        
        For extractedData:
        - If Invoice: extract 'totalAmount', 'currency', 'invoiceNumber', 'date', 'vendorName', 'gstNumber'.
        - If Resume: extract 'candidateName', 'email', 'phone', 'skills' (list), 'experienceYears'.
        - If Contract or Agreement or NDA: extract 'parties', 'effectiveDate', 'expiryDate', 'contractValue', 'governingLaw'.
        - If Report or Financial Statement: extract 'reportPeriod', 'author', 'totalRevenue', 'keyFinding'.
        - If Project Plan or Meeting Notes: extract 'projectName', 'projectManager', 'actionItems', 'deadline'.
        - If AI Insight or User Profile: extract 'predictedCategory', 'confidenceLevel', 'recommendations', 'userTraits'.
        - For others: extract any relevant key metrics, entities, or names.
        
        Document Text:
        ---
        {truncated_text}
        ---
        """
        
        t0 = time.time()
        response = self.client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You are an expert document analysis system. Always reply with valid JSON."},
                {"role": "user", "content": prompt}
            ],
            model=settings.GROQ_MODEL,
            response_format={"type": "json_object"}
        )
        print(f"  [Classification] Groq call took: {time.time() - t0:.2f}s")
        
        result = json.loads(response.choices[0].message.content)
        
        # Ensure default fields exist
        if "suggestedTags" not in result: result["suggestedTags"] = []
        if "extractedData" not in result: result["extractedData"] = {}
        if "confidenceScore" not in result: result["confidenceScore"] = 0.8
        
        return result

    def _classify_with_rules(self, text: str) -> Dict[str, Any]:
        text_lower = text.lower()
        
        # 1. Keyword based scoring
        dept_scores = {dept: 0 for dept in self.departments}
        cat_scores = {cat: 0 for cat in self.categories}
        
        for dept, keywords in self.rules.items():
            for keyword in keywords:
                if keyword in text_lower:
                    dept_scores[dept] += 1
                    
        for cat, keywords in self.category_rules.items():
            for keyword in keywords:
                if keyword in text_lower:
                    cat_scores[cat] += 1
        
        # Determine best match
        best_dept = max(dept_scores, key=dept_scores.get) if any(dept_scores.values()) else "General"
        best_cat = max(cat_scores, key=cat_scores.get) if any(cat_scores.values()) else "Uncategorized"
        
        # Calculate simplistic confidence
        dept_conf = min(dept_scores[best_dept] * 0.2, 0.7) if dept_scores.get(best_dept, 0) > 0 else 0.1
        cat_conf = min(cat_scores[best_cat] * 0.2, 0.7) if cat_scores.get(best_cat, 0) > 0 else 0.1
        
        final_conf = (dept_conf + cat_conf) / 2
        
        tags = []
        if dept_conf > 0.4: tags.append(best_dept)
        if cat_conf > 0.4: tags.append(best_cat)

        # Extract basic metadata using existing regex helper
        extracted_data = self._extract_metadata_regex(text, best_cat)
        
        return {
            "department": best_dept,
            "category": best_cat,
            "confidenceScore": final_conf,
            "suggestedTags": tags,
            "extractedData": extracted_data
        }

    def _extract_metadata_regex(self, text: str, category: str) -> Dict:
        data = {}
        text_lower = text.lower()
        
        if category == "Invoice":
            # GST (India format example)
            gst = re.search(r'\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}', text)
            if gst: data["gst"] = gst.group(0)
            
            # Amount
            amount = re.search(r'total\s*[:\-]?\s*[\$₹]?\s*([\d,]+\.?\d*)', text_lower)
            if amount: data["totalAmount"] = amount.group(1)

        elif category == "Resume":
            email = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', text)
            if email: data["email"] = email.group(0)
            
            phone = re.search(r'[\+\(]?[1-9][0-9 .\-\(\)]{8,}[0-9]', text)
            if phone: data["phone"] = phone.group(0)
            
        elif category == "Contract":
            date = re.search(r'\d{1,2}[-/]\d{1,2}[-/]\d{2,4}', text)
            if date: data["date"] = date.group(0)

        return data

classification_service = ClassificationService()
