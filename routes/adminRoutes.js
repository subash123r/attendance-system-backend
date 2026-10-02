import express from "express";
import User from "../models/User.js";
import Attendance from "../models/Attendance.js";
import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";

const router = express.Router();

const HOURLY_RATE = 45;

// =========================
// EMPLOYEE LIST
// =========================

router.get(
  "/employees",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const {
        month,
      } = req.query;

      const selectedMonth =
        month ||
        new Date().toISOString().slice(0, 7);

      const employees =
        await User.find({
          role: {
            $ne: "admin",
          },
        }).select(
          "_id name email role"
        );

      const result = [];

      for (const employee of employees) {

        const attendance =
          await Attendance.find({
            user: employee._id,
            date: {
              $regex: `^${selectedMonth}`,
            },
          });

        const presentDays =
          attendance.filter(
            (item) =>
              item.status === "Present"
          ).length;

        const totalWorkingHours =
          attendance.reduce(
            (total, item) =>
              total +
              Number(
                item.workingHours || 0
              ),
            0
          );

        const salary =
          totalWorkingHours *
          HOURLY_RATE;

        result.push({
          id: employee._id,
          name: employee.name,
          email: employee.email,

          presentDays,

          totalWorkingHours:
            Number(
              totalWorkingHours.toFixed(2)
            ),

          hourlyRate:
            HOURLY_RATE,

          salary:
            Number(
              salary.toFixed(2)
            ),
        });
      }

      res.json({
        month: selectedMonth,
        hourlyRate: HOURLY_RATE,
        employees: result,
      });

    } catch (error) {
      console.error(
        "Admin employees error:",
        error
      );

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// =========================
// EMPLOYEE DETAILS
// =========================

router.get(
  "/employees/:userId",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const {
        month,
      } = req.query;

      const selectedMonth =
        month ||
        new Date().toISOString().slice(0, 7);

      const employee =
        await User.findById(
          req.params.userId
        ).select(
          "_id name email role"
        );

      if (!employee) {
        return res.status(404).json({
          message:
            "Employee not found",
        });
      }

      const attendance =
        await Attendance.find({
          user: employee._id,
          date: {
            $regex: `^${selectedMonth}`,
          },
        }).sort({
          date: -1,
        });

      const presentDays =
        attendance.filter(
          (item) =>
            item.status === "Present"
        ).length;

      const totalWorkingHours =
        attendance.reduce(
          (total, item) =>
            total +
            Number(
              item.workingHours || 0
            ),
          0
        );

      const salary =
        totalWorkingHours *
        HOURLY_RATE;

      res.json({
        employee,

        month: selectedMonth,

        hourlyRate:
          HOURLY_RATE,

        presentDays,

        totalWorkingHours:
          Number(
            totalWorkingHours.toFixed(2)
          ),

        salary:
          Number(
            salary.toFixed(2)
          ),

        attendance,
      });

    } catch (error) {
      console.error(
        "Employee details error:",
        error
      );

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

// =========================
// ADMIN DASHBOARD SUMMARY
// =========================

router.get(
  "/summary",
  authMiddleware,
  adminMiddleware,
  async (req, res) => {
    try {
      const {
        month,
      } = req.query;

      const selectedMonth =
        month ||
        new Date().toISOString().slice(0, 7);

      const employees =
        await User.find({
          role: {
            $ne: "admin",
          },
        });

      const totalEmployees =
        employees.length;

      const attendance =
        await Attendance.find({
          date: {
            $regex: `^${selectedMonth}`,
          },
        });

      const presentRecords =
        attendance.filter(
          (item) =>
            item.status === "Present"
        );

      const totalWorkingHours =
        presentRecords.reduce(
          (total, item) =>
            total +
            Number(
              item.workingHours || 0
            ),
          0
        );

      const totalSalary =
        totalWorkingHours *
        HOURLY_RATE;

      const today =
        new Intl.DateTimeFormat(
          "en-CA",
          {
            timeZone:
              "Asia/Kolkata",
          }
        ).format(new Date());

      const todayAttendance =
        await Attendance.find({
          date: today,
          status: "Present",
        });

      res.json({
        month: selectedMonth,

        totalEmployees,

        presentToday:
          todayAttendance.length,

        totalWorkingHours:
          Number(
            totalWorkingHours.toFixed(2)
          ),

        totalSalary:
          Number(
            totalSalary.toFixed(2)
          ),

        hourlyRate:
          HOURLY_RATE,
      });

    } catch (error) {
      console.error(
        "Admin summary error:",
        error
      );

      res.status(500).json({
        message: "Server error",
      });
    }
  }
);

export default router;