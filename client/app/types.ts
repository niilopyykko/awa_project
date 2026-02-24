// types.ts

// -----------------------------
// USER (frontend version)
// -----------------------------
export interface IUser {
  _id: string
  username: string
  profilePic?: string | null
}

// -----------------------------
// DOCUMENT (frontend version)
// -----------------------------
export interface IDocument {
  _id: string
  name: string
  owner: IUser                     // populated user
  editors: IUser[]                 // populated users
  isVisibleNonAuth: boolean
  content?: string | null
  filepath?: string | null
  shareToken?: string | null
  readOnlyLink?: string | null
  trash: boolean
  createdAt: string               // serialized Date
  updatedAt: string               // serialized Date
}

// Sort key type for documents
export type DocumentSortKey = "name" | "createdAt" | "updatedAt";
