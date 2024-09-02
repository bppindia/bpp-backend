const userModel = require("../models/userModel");
const dotenv = require("dotenv");
const AWS = require("aws-sdk");
const { uploadToS3Bucket } = require("../utils/fileUpload");
dotenv.config();

const folderName = "UsersData";

const createBppMember = async (req, res) => {
  try {
    let bppMember = req.body;
    let {
      firstName,
      lastName,
      fatherName,
      voterIdNo,
      email,
      phoneNo,
      dob,
      gender,
      profession,
      state,
      city,
      district,
    } = bppMember;

    if (
      !firstName ||
      !lastName ||
      !fatherName ||
      !voterIdNo ||
      // !phoneNo ||
      // !dob ||
      !gender ||
      !profession ||
      !state ||
      !city ||
      !district
    ) {
      return res.status(400).json({
        status: false,
        message: "All fields are required.",
      });
    }

    // Ensure req.files exists and contains files
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({
        status: false,
        message: "No files uploaded.",
      });
    }

    let voterIdFront, voterIdBack;
    const currentTimestamp = Date.now(); 

    // Process each file and upload to S3
    const uploadPromises = Object.keys(req.files).map(async (key) => {
      const file = req.files[key];
      
      // Extract file extension
      const fileExtension = file.name.split('.').pop();
      
      // Construct unique filename
      const userFileName = `_${voterIdNo}_${firstName}_${lastName}_${key}_${currentTimestamp}.${fileExtension}`;
      const userFileData = file.data;
      const mimeType = file.mimetype;

      try {
        // Upload file to S3
        const S3Response = await uploadToS3Bucket(
          folderName,
          userFileName,
          userFileData,
          mimeType
        );

        // Store the S3 URL based on the key
        if (key === "voterIdFront") {
          voterIdFront = S3Response.Location;
        } else if (key === "voterIdBack") {
          voterIdBack = S3Response.Location;
        }
      } catch (uploadError) {
        console.error(`Error uploading ${key}:`, uploadError);
        throw uploadError;
      }
    });

    // Wait for all uploads to complete
    await Promise.all(uploadPromises);

    // Check for existing users by email or voter ID
    const existingUserByEmail = await userModel.findOne({ email });
    if (existingUserByEmail) {
      return res.json({
        status: false,
        message: "Request already submitted with this email!",
      });
    }

    const existingUserByVoterIdNo = await userModel.findOne({ voterIdNo });
    if (existingUserByVoterIdNo) {
      return res.json({
        status: false,
        message: "Request already submitted with this Voter ID number!",
      });
    }

    // Create new BppMember
    const newBppMember = new userModel({
      firstName,
      lastName,
      fatherName,
      email,
      phoneNo,
      voterIdNo,
      dob,
      gender,
      profession,
      state,
      city,
      district,
      voterIdFront,
      voterIdBack,
    });

    await newBppMember.save();

    res.status(201).json({
      status: true,
      message: "Thank You! Your request has been submitted!",
      data: newBppMember,
    });
  } catch (error) {
    console.error('Error creating BppMember:', error);
    res.status(500).send({ status: false, message: error.message });
  }
};

const getBppMember = async (req, res) => {
  try {
    let getAllData = await userModel.find({});
    if (getAllData.length === 0)
      return res.status(400).send({ status: false, message: "No data found" });
    res
      .status(200)
      .send({ status: true, message: "here's the data", data: getAllData });
  } catch (err) {
    return res.status(500).send({ status: false, message: err.message });
  }
};

module.exports = {
  createBppMember,
  getBppMember,
};
