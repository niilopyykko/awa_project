import mongoose, { Schema } from "mongoose";

interface IUserDocument extends Document {
    name: string
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true }

    editors: string[] //list of users with permission to edit
    isVisibleNonAuth: boolean  //if document is visible to users that are not logged in

    createdAt: Date
    id?: string
    filepath: string
    shareToken: string
    readOnlyLink: string

}

const userDocumentSchema = new Schema({
    name: { type: String, required: true },
    owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
    editors: [{ type: String }],
    isVisibleNonAuth: { type: Boolean, default: false },
    createdAt: { type: Date },
    filepath: { type: String, required: true },
    shareToken: { type: String },
    readOnlyLink: { type: String }
})

const UserDocument: mongoose.Model<IUserDocument> = mongoose.model<IUserDocument>("userDocument", userDocumentSchema)

export { IUserDocument, UserDocument }