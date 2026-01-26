export interface IUser {
  id: string
  username: string
}

export interface IDocument {
  _id: string
  name: string
  owner: IUser
  createdAt: string
  updatedAt: string
  filepath?: string
  shareToken?: string
  content?: string
  editors?: IUser[]
  isVisibleNonAuth?: boolean
  trash?: boolean
}
