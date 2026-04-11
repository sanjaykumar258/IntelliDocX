from fastapi import FastAPI, HTTPException, Depends, Security
from fastapi.security import APIKeyHeader
import uvicorn
from datetime import datetime
import time
import os

from app.core.config import settings
from app.utils.fileLoader import file_loader
from app.utils.textCleaner import TextCleaner
from app.services.ocrService import ocr_service
from app.services.embeddingService import embedding_service
from app.services.classificationService import classification_service
from app.services.indexingService import indexing_service
from app.services.chatService import chat_service
from app.services.summaryService import summary_service
from app.services.complianceService import compliance_service
from app.services.aiDetectorService import ai_detector_service
from app.services.relationshipService import relationship_service
from app.schemas.requestSchemas import DocumentProcessRequest, SearchRequest, ChatRequest, TextAnalysisRequest, RelationshipRequest, SystemChatRequest
from app.schemas.responseSchemas import ProcessResponse, SearchResponse, SearchResult, ChatResponse, SummaryResponse, ComplianceResponse, RelationshipResponse, AIDetectorResponse

app = FastAPI(title=settings.APP_NAME)

# Security
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=True)

async def get_api_key(api_key: str = Security(api_key_header)):
    if api_key != settings.AI_SERVICE_API_KEY:
        raise HTTPException(
            status_code=403,
            detail="Could not validate credentials"
        )
    return api_key

@app.on_event("startup")
async def startup_event():
    # Ensure index exists on startup
    try:
        indexing_service.create_index_if_not_exists()
    except Exception as e:
        print(f"Warning: Could not connect to Elasticsearch on startup: {e}")

@app.get("/")
def read_root():
    return {"status": "online", "service": settings.APP_NAME}

@app.get("/health")
def health_check():
    return {"status": "ok", "service": settings.APP_NAME}

@app.get("/health/ai")
def health_check_ai():
    return {"status": "ok", "service": "IntelliDocX AI Engine", "models_loaded": True}

@app.post("/ai/process-document", response_model=ProcessResponse, dependencies=[Depends(get_api_key)])
async def process_document(request: DocumentProcessRequest):
    try:
        # 1. Download file
        print(f"Processing document: {request.documentId} from {request.filePath}")
        file_data = file_loader.download_file(request.filePath)
        
        # Determine extension
        file_ext = os.path.splitext(request.filePath)[1]
        
        # 2. Extract Text (OCR if needed)
        t0 = time.time()
        raw_text = ocr_service.extract_text(file_data, file_ext)
        t_ocr = time.time() - t0
        print(f"Extraction took: {t_ocr:.2f}s")

        if not raw_text:
            raise HTTPException(status_code=400, detail="Could not extract text from document")
            
        # 3. Clean Text
        clean_text = TextCleaner.clean_text(raw_text)
        embedding_text = TextCleaner.normalize_for_embedding(raw_text)
        
        # 4 & 5. Generate Embedding and Classify in parallel
        import asyncio
        t_start_ai = time.time()
        
        # We use to_thread to run these sync calls in parallel without blocking
        embedding, classification = await asyncio.gather(
            asyncio.to_thread(embedding_service.generate_embedding, embedding_text),
            asyncio.to_thread(classification_service.classify_document, clean_text)
        )
        
        print(f"Parallel AI tasks took: {time.time() - t_start_ai:.2f}s")
        
        # 6. Index
        doc_data = {
            "documentId": request.documentId,
            "organizationId": request.organizationId,
            "title": request.title,
            "fileName": request.fileName,
            "content": clean_text,
            "embedding": embedding,
            "department": classification["department"],
            "category": classification["category"],
            "tags": classification["suggestedTags"],
            "extractedData": classification["extractedData"],
            "createdAt": datetime.utcnow().isoformat()
        }
        
        indexing_service.index_document(doc_data)
        
        return ProcessResponse(
            status="success",
            documentId=request.documentId,
            department=classification["department"],
            category=classification["category"],
            tags=classification["suggestedTags"],
            confidence=classification["confidenceScore"],
            extractedData=classification["extractedData"]
        )

    except Exception as e:
        print(f"Error processing document: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ai/search", response_model=SearchResponse, dependencies=[Depends(get_api_key)])
async def search_documents(request: SearchRequest):
    try:
        # 1. Generate embedding for query
        query_text = TextCleaner.normalize_for_embedding(request.query)
        query_embedding = embedding_service.generate_embedding(query_text)
        
        # 2. Search in Elasticsearch
        hits = indexing_service.search(request.query, query_embedding, request.organizationId, request.limit, request.filters)
        
        # 3. Format results
        results = []
        for hit in hits:
            score = hit.get("_score", 0)
            if score < 0.45:
                continue
                
            source = hit.get("_source", {})
            highlight = hit.get("highlight", {}).get("content", [])
            snippet = highlight[0] if highlight else ""
            
            results.append(SearchResult(
                documentId=source.get("documentId"),
                score=score,
                department=source.get("department"),
                category=source.get("category"),
                tags=source.get("tags", []),
                extractedData=source.get("extractedData", {}),
                snippet=snippet
            ))
            
        return SearchResponse(results=results)

    except Exception as e:
        print(f"Error searching documents: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ai/chat", response_model=ChatResponse, dependencies=[Depends(get_api_key)])
async def chat_with_document(request: ChatRequest):
    try:
        result = await chat_service.query_document(
            request.documentId,
            request.organizationId,
            request.message,
            request.history
        )
        return ChatResponse(**result)
    except Exception as e:
        print(f"Error in chat endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ai/system-chat", response_model=ChatResponse, dependencies=[Depends(get_api_key)])
async def system_chat(request: SystemChatRequest):
    try:
        result = await chat_service.system_chat(
            request.organizationId,
            request.message,
            request.history
        )
        return ChatResponse(**result)
    except Exception as e:
        print(f"Error in system chat endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ai/summarize", response_model=SummaryResponse, dependencies=[Depends(get_api_key)])
async def summarize_document(request: TextAnalysisRequest):
    try:
        text = indexing_service.get_document_content(request.documentId, request.organizationId) or ""
        result = summary_service.summarize(text, request.title)
        return SummaryResponse(**result)
    except Exception as e:
        print(f"Error in summarize endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ai/compliance", response_model=ComplianceResponse, dependencies=[Depends(get_api_key)])
async def check_compliance(request: TextAnalysisRequest):
    try:
        text = indexing_service.get_document_content(request.documentId, request.organizationId) or ""
        result = compliance_service.check_compliance(text, request.category)
        return ComplianceResponse(**result)
    except Exception as e:
        print(f"Error in compliance endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ai/detect-ai", response_model=AIDetectorResponse, dependencies=[Depends(get_api_key)])
async def detect_ai_content(request: TextAnalysisRequest):
    try:
        text = indexing_service.get_document_content(request.documentId, request.organizationId) or ""
        result = ai_detector_service.detect(text)
        return AIDetectorResponse(**result)
    except Exception as e:
        print(f"Error in AI detect endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ai/relationships", response_model=RelationshipResponse, dependencies=[Depends(get_api_key)])
async def get_relationships(request: RelationshipRequest):
    try:
        result = relationship_service.detect_relationships(request.documentId, request.organizationId, request.limit)
        return RelationshipResponse(**result)
    except Exception as e:
        print(f"Error in relationships endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
