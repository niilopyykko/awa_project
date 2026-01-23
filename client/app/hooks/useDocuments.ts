"use client";
import { useState, useEffect, useCallback } from "react";
import { IDocument } from "../../src/types";

export default function useDocuments() {
  const [documents, setDocuments] = useState<IDocument[]>([]);
  const [jwt, setJwt] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setJwt(localStorage.getItem("token"));
    setCurrentUser(localStorage.getItem("user"));
  }, []);

  const getDocuments = useCallback(async () => {
    try {
      const response = await fetch(
        jwt ? "http://localhost:3001/api/documents" : "http://localhost:3001/api/publicDocuments",
        {
          headers: jwt
            ? { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" }
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
  }, [jwt]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    getDocuments();
  }, [getDocuments]);

  const refresh = () => getDocuments();

    return { documents, jwt, currentUser, getDocuments, refresh };
}
