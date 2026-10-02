import mongoose from "mongoose";

const officeLocationSchema = new mongoose.Schema(
  {
    latitude: {
      type: Number,
      required: true,
    },

    longitude: {
      type: Number,
      required: true,
    },

    radius: {
      type: Number,
      default: 50,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const OfficeLocation = mongoose.model(
  "OfficeLocation",
  officeLocationSchema
);

export default OfficeLocation;