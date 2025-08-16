import mongoose from "mongoose";

export const imageSchema = new mongoose.Schema({
         _id: { type: String },
   imageName: { type: String  }
});
export default imageSchema;