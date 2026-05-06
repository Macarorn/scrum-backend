import mongoose from "mongoose";

export const MeetingSchema = new mongoose.Schema({
  title: String,
  description: String,
  sprint: String,
  status: String,
  date: Date,
  type: String,
  startTime: String,
  duration: String,
  room: String,
  link: String,
});

const Meeting = mongoose.model("Meeting", MeetingSchema);
export default Meeting;
