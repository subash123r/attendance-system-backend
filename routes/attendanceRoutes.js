import express from "express";
import Attendance from "../models/Attendance.js";
import OfficeLocation from "../models/OfficeLocation.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// =========================
// DISTANCE CALCULATION
// =========================

const calculateDistance = (
  lat1,
  lon1,
  lat2,
  lon2
) => {
  const R = 6371000;

  const toRadians = (degree) => {
    return (degree * Math.PI) / 180;
  };

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) *
      Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return R * c;
};

// =========================
// TODAY - IST
// =========================

const getToday = () => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(new Date());
};

// =========================
// CHECK IN
// =========================

router.post(
  "/check-in",
  authMiddleware,
  async (req, res) => {
    try {
      const {
        latitude,
        longitude,
        accuracy,
      } = req.body;

      if (
        latitude == null ||
        longitude == null
      ) {
        return res.status(400).json({
          message: "Location is required",
        });
      }

      const office =
        await OfficeLocation.findOne();

      if (!office) {
        return res.status(404).json({
          message:
            "Office location not configured",
        });
      }

      const distance = calculateDistance(
        Number(latitude),
        Number(longitude),
        Number(office.latitude),
        Number(office.longitude)
      );

      const allowedRadius =
        office.radius || 50;

      console.log(
        "========== CHECK IN =========="
      );

      console.log(
        "Employee latitude:",
        latitude
      );

      console.log(
        "Employee longitude:",
        longitude
      );

      console.log(
        "Office latitude:",
        office.latitude
      );

      console.log(
        "Office longitude:",
        office.longitude
      );

      console.log(
        "Distance:",
        distance,
        "meters"
      );

      console.log(
        "Allowed radius:",
        allowedRadius,
        "meters"
      );

      if (distance > allowedRadius) {
        return res.status(403).json({
          message:
            "You are outside the office location",
          distance: Math.round(distance),
          allowedRadius,
        });
      }

      const attendanceDate = getToday();

      const checkInTime = new Date();

      const existingAttendance =
        await Attendance.findOne({
          user: req.userId,
          date: attendanceDate,
        });

      if (existingAttendance?.checkIn) {
        return res.status(400).json({
          message:
            "Already checked in for today",
          attendance: existingAttendance,
        });
      }

      const attendance =
        await Attendance.findOneAndUpdate(
          {
            user: req.userId,
            date: attendanceDate,
          },
          {
            user: req.userId,
            date: attendanceDate,

            checkIn: checkInTime,

            checkInLocation: {
              latitude: Number(latitude),
              longitude: Number(longitude),
              accuracy:
                accuracy != null
                  ? Number(accuracy)
                  : null,
            },

            checkOut: null,

            checkOutLocation: {
              latitude: null,
              longitude: null,
              accuracy: null,
            },

            workingHours: 0,

            status: "Incomplete",
          },
          {
            returnDocument: "after",
            upsert: true,
          }
        );

      res.json({
        message: "Check-in successful",
        distance: Math.round(distance),
        attendance,
      });
    } catch (error) {
      console.error(
        "Check-in error:",
        error
      );

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// =========================
// CHECK OUT
// =========================

router.post(
  "/check-out",
  authMiddleware,
  async (req, res) => {
    try {
      const {
        latitude,
        longitude,
        accuracy,
      } = req.body;

      if (
        latitude == null ||
        longitude == null
      ) {
        return res.status(400).json({
          message: "Location is required",
        });
      }

      const office =
        await OfficeLocation.findOne();

      if (!office) {
        return res.status(404).json({
          message:
            "Office location not configured",
        });
      }

      const distance = calculateDistance(
        Number(latitude),
        Number(longitude),
        Number(office.latitude),
        Number(office.longitude)
      );

      const allowedRadius =
        office.radius || 50;

      if (distance > allowedRadius) {
        return res.status(403).json({
          message:
            "You are outside the office location",
          distance: Math.round(distance),
          allowedRadius,
        });
      }

      const attendanceDate = getToday();

      const checkOutTime = new Date();

      const attendance =
        await Attendance.findOne({
          user: req.userId,
          date: attendanceDate,
        });

      if (!attendance) {
        return res.status(404).json({
          message:
            "Please check in first",
        });
      }

      if (!attendance.checkIn) {
        return res.status(400).json({
          message:
            "Please check in first",
        });
      }

      if (attendance.checkOut) {
        return res.status(400).json({
          message:
            "Already checked out",
          attendance,
        });
      }

      const difference =
        checkOutTime.getTime() -
        new Date(
          attendance.checkIn
        ).getTime();

      if (difference < 0) {
        return res.status(400).json({
          message:
            "Check-out time cannot be before check-in time",
        });
      }

      const workingHours =
        difference /
        (1000 * 60 * 60);

      attendance.checkOut =
        checkOutTime;

      attendance.checkOutLocation = {
        latitude: Number(latitude),
        longitude: Number(longitude),
        accuracy:
          accuracy != null
            ? Number(accuracy)
            : null,
      };

      attendance.workingHours = Number(
        workingHours.toFixed(2)
      );

      attendance.status = "Present";

      await attendance.save();

      res.json({
        message:
          "Check-out successful",

        distance: Math.round(distance),

        workingHours:
          attendance.workingHours,

        attendance,
      });
    } catch (error) {
      console.error(
        "Check-out error:",
        error
      );

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// =========================
// TODAY
// =========================

router.get(
  "/today",
  authMiddleware,
  async (req, res) => {
    try {
      const today = getToday();

      const attendance =
        await Attendance.findOne({
          user: req.userId,
          date: today,
        });

      res.json({
        attendance,
      });
    } catch (error) {
      console.error(
        "Get attendance error:",
        error
      );

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// =========================
// HISTORY
// =========================

router.get(
  "/history",
  authMiddleware,
  async (req, res) => {
    try {
      const attendance =
        await Attendance.find({
          user: req.userId,
        }).sort({
          date: -1,
        });

      res.json({
        attendance,
      });
    } catch (error) {
      console.error(
        "Get attendance history error:",
        error
      );

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

export default router;