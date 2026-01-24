import mongoose, {Document, Schema} from "mongoose";

interface IUser extends Document {
    username: string
    password: string
    profilePic?: string
}

const UserSchema: Schema = new Schema({
    username: {type: String, required: true, unique: true},
    password: {type: String, required: true}
    ,profilePic: { type: String, default: null }
})

const User: mongoose.Model<IUser> = mongoose.model<IUser>("User", UserSchema)

export {User, IUser}