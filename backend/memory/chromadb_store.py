"""ChromaDB Vector Memory Store"""
import chromadb
from typing import List, Dict, Optional
import logging

logger = logging.getLogger(__name__)

class VectorMemory:
    """Vector memory using ChromaDB"""
    
    def __init__(self):
        try:
            self.client = chromadb.Client()
            self.collection = self.client.get_or_create_collection(name="ecommerce_memory")
            logger.info("ChromaDB initialized")
        except Exception as e:
            logger.error(f"Error initializing ChromaDB: {e}")
            self.collection = None
    
    def store(self, key: str, value: str, metadata: Dict = None):
        """Store vector"""
        try:
            if self.collection:
                self.collection.add(
                    ids=[key],
                    documents=[value],
                    metadatas=[metadata or {}]
                )
        except Exception as e:
            logger.error(f"Error storing vector: {e}")
    
    def retrieve(self, query: str, top_k: int = 5) -> List[Dict]:
        """Retrieve vectors"""
        try:
            if self.collection:
                results = self.collection.query(query_texts=[query], n_results=top_k)
                return results
        except Exception as e:
            logger.error(f"Error retrieving vectors: {e}")
        return []

# Singleton instance
_vector_memory = None

def get_vector_memory() -> VectorMemory:
    """Get or create vector memory instance"""
    global _vector_memory
    if _vector_memory is None:
        _vector_memory = VectorMemory()
    return _vector_memory
