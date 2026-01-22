import mongoose, { now, Schema } from "mongoose";

interface IUserDocument extends Document {
    name: string
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true }

    editors: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] //list of users with permission to edit
    isVisibleNonAuth: boolean  //if document is visible to users that are not logged in
    content: string
    createdAt: Date
    id?: string
    filepath: string
    shareToken: string
    readOnlyLink: string
    lockedBy?: { type: Schema.Types.ObjectId, ref: "User"}
    lockedAt?: Date

}

const userDocumentSchema = new Schema({
    name: { type: String, required: true },
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    editors: [{ type: Schema.Types.ObjectId, ref: "User"}],
    isVisibleNonAuth: { type: Boolean, default: false },
    content: { type: String, default: null},
    createdAt: { type: Date},
    filepath: { type: String, default: null},
    shareToken: { type: String },
    readOnlyLink: { type: String },
    lockedBy: { type: Schema.Types.ObjectId, ref: "User"},
    lockedAt: {type : Date, default: null}
})

const UserDocument: mongoose.Model<IUserDocument> = mongoose.model<IUserDocument>("userDocument", userDocumentSchema)

export { IUserDocument, UserDocument }