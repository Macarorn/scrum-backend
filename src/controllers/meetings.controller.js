import mongoose from "mongoose";
import Meeting from "../models/meeting.model.js";

const isDbConnected = () => mongoose.connection.readyState === 1;

const normalizeMeetingPayload = (body) => ({
  title: String(body.title || "").trim(),
  description: String(body.description || "").trim(),
  sprint: String(body.sprint || "").trim(),
  status: String(body.status || "").trim(),
  date: body.date ? new Date(body.date) : null,
  type: String(body.type || "").trim(),
  startTime: String(body.startTime || "").trim(),
  duration: String(body.duration || "").trim(),
  room: String(body.room || "").trim(),
  link: String(body.link || "").trim(),
});

const isValidDate = (value) => value instanceof Date && !Number.isNaN(value.getTime());

export const createMeeting = async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: "MongoDB no está conectado. Verifica MONGO_URI en el entorno.",
      });
    }

    const meetingPayload = normalizeMeetingPayload(req.body);

    if (!meetingPayload.title || !meetingPayload.date || !isValidDate(meetingPayload.date)) {
      return res.status(400).json({
        success: false,
        message: "El título y la fecha de la reunión son obligatorios.",
      });
    }

    const meeting = new Meeting(meetingPayload);
    await meeting.save();

    return res.status(201).json({ success: true, data: meeting });
  } catch (error) {
    console.error("Error createMeeting:", error);
    return res.status(500).json({
      success: false,
      message: "Error al crear la reunión.",
    });
  }
};

export const deleteMeeting = async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: "MongoDB no está conectado. Verifica MONGO_URI en el entorno.",
      });
    }

    const { id } = req.params;
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "El ID de la reunión es obligatorio.",
      });
    }

    const deletedMeeting = await Meeting.findByIdAndDelete(id);
    if (!deletedMeeting) {
      return res.status(404).json({
        success: false,
        message: "Reunión no encontrada.",
      });
    }

    return res.json({ success: true, data: deletedMeeting });
  } catch (error) {
    console.error("Error deleteMeeting:", error);
    return res.status(500).json({
      success: false,
      message: "Error al eliminar la reunión.",
    });
  }
};

export const getMeetings = async (req, res) => {
  try {
    if (!isDbConnected()) {
      return res.status(503).json({
        success: false,
        message: "MongoDB no está conectado. Verifica MONGO_URI en el entorno.",
      });
    }

    const { sprint, from, to, q } = req.query;
    const filter = {};

    if (sprint) {
      filter.sprint = sprint;
    }

    if (from || to) {
      filter.date = {};
      if (from) {
        const fromDate = new Date(from);
        if (isValidDate(fromDate)) {
          filter.date.$gte = fromDate;
        }
      }
      if (to) {
        const toDate = new Date(to);
        if (isValidDate(toDate)) {
          filter.date.$lte = toDate;
        }
      }
      if (Object.keys(filter.date).length === 0) {
        delete filter.date;
      }
    }

    if (q) {
      const regex = new RegExp(String(q).trim(), "i");
      filter.$or = [
        { title: regex },
        { description: regex },
        { sprint: regex },
        { status: regex },
        { type: regex },
        { room: regex },
        { link: regex },
      ];
    }

    const meetings = await Meeting.find(filter).sort({ date: 1 });
    return res.json({ success: true, data: meetings });
  } catch (error) {
    console.error("Error getMeetings:", error);
    return res.status(500).json({
      success: false,
      message: "Error al obtener las reuniones.",
    });
  }
};
