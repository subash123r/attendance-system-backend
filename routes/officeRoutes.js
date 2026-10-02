import express from "express";
import OfficeLocation from "../models/OfficeLocation.js";
import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";

const router = express.Router();

router.post(
  "/location",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const { latitude, longitude, radius } = req.body;

      // Validate location
      if (
        latitude == null ||
        longitude == null
      ) {
        return res.status(400).json({
          message: "Latitude and longitude are required",
        });
      }

      const lat = Number(latitude);
      const lon = Number(longitude);
      const allowedRadius = Number(radius) || 50;

      if (Number.isNaN(lat) || Number.isNaN(lon)) {
        return res.status(400).json({
          message: "Invalid latitude or longitude",
        });
      }

      // Save admin's current GPS location
      const location = await OfficeLocation.findOneAndUpdate(
        {},
        {
          latitude: lat,
          longitude: lon,
          radius: allowedRadius,
          updatedBy: req.userId,
        },
        {
          returnDocument: "after",
          upsert: true,
        }
      );

      console.log("Office location saved:");
      console.log("Latitude:", lat);
      console.log("Longitude:", lon);
      console.log("Radius:", allowedRadius);

      res.json({
        message: "Office location saved successfully",
        location,
      });
    } catch (error) {
      console.error("Office location error:", error);

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

export default router;