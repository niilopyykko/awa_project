"use client";
import { useState, useEffect, useCallback } from "react";
import { IDocument } from "../../src/types";
import { useAuth } from "../context/AuthContext";


export default function useDocuments() {
    const { token, user } = useAuth()
  const [documents, setDocuments] = useState<IDocument[]>([]);



  const getDocuments = useCallback(async () => {
    try {
      const response = await fetch(
        token ? "http://localhost:3001/api/documents" : "http://localhost:3001/api/publicDocuments",
        {
          headers: token
            ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
            : { "Content-Type": "application/json" },
        },
      );

      if (!response.ok) {
        // 404 means no documents; clear list. For other errors, log and clear as well.
          try { const err = await response.json(); console.error('Failed fetching documents:', response.status, err); } catch { console.error('Failed fetching documents, status', response.status); }
          setDocuments([]);
          return;
      }
      const data = await response.json();
      if (Array.isArray(data)) setDocuments(data);
      else setDocuments([]);
    } catch (err) {
      console.error('Error while fetching documents', err);
      setDocuments([]);
    }
  }, [token]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    getDocuments();
  }, [getDocuments]);

  const refresh = () => getDocuments();

    return { documents, token, user, getDocuments, refresh };
}
