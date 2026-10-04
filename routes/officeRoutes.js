import express from "express";
import OfficeLocation from "../models/OfficeLocation.js";
import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";
import mongoose from "mongoose";

const router = express.Router();

router.post(
  "/location",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      console.log("========== OFFICE LOCATION ==========");
      console.log("Request body:", req.body);
      console.log("User ID:", req.userId);
      console.log("User role:", req.userRole);

      const { latitude, longitude, radius } = req.body;

      // =========================
      // VALIDATE INPUT
      // =========================
      if (latitude == null || longitude == null) {
        return res.status(400).json({
          message: "Latitude and longitude are required",
        });
      }

      const lat = Number(latitude);
      const lon = Number(longitude);
      const allowedRadius =
        radius != null && radius !== ""
          ? Number(radius)
          : 50;

      if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lon)
      ) {
        return res.status(400).json({
          message: "Invalid latitude or longitude",
        });
      }

      if (
        lat < -90 ||
        lat > 90 ||
        lon < -180 ||
        lon > 180
      ) {
        return res.status(400).json({
          message: "Latitude or longitude is out of range",
        });
      }

      if (
        !Number.isFinite(allowedRadius) ||
        allowedRadius <= 0
      ) {
        return res.status(400).json({
          message: "Invalid radius",
        });
      }

      // =========================
      // CHECK USER ID
      // =========================
      if (!req.userId) {
        return res.status(401).json({
          message: "User ID missing from token",
        });
      }

      // Admin token currently uses "admin" as userId.
      // Only attach updatedBy if it is a valid MongoDB ObjectId.
      const updateData = {
        latitude: lat,
        longitude: lon,
        radius: allowedRadius,
      };

      if (mongoose.Types.ObjectId.isValid(req.userId)) {
        updateData.updatedBy = req.userId;
      }

      // =========================
      // SAVE LOCATION
      // =========================
      const location = await OfficeLocation.findOneAndUpdate(
        {},
        updateData,
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        }
      );

      console.log("Office location saved successfully");
      console.log("Latitude:", lat);
      console.log("Longitude:", lon);
      console.log("Radius:", allowedRadius);

      return res.status(200).json({
        message: "Office location saved successfully",
        location,
      });
    } catch (error) {
      console.error("========== OFFICE LOCATION ERROR ==========");
      console.error(error);
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("==========================================");

      return res.status(500).json({
        message: "Server error while saving office location",
        error: error.message,
      });
    }
  }
);

export default router;