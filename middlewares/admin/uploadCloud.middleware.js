const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_KEY,
  api_secret: process.env.CLOUD_SECRET,
});

module.exports.upload = (req, res, next) => {
  if (req.file) {
    let streamUpload = (req, resourceType = "auto") => {
      return new Promise((resolve, reject) => {
        let stream = cloudinary.uploader.upload_stream(
          { resource_type: resourceType },
          (error, result) => {
            if (result) {
              resolve(result);
            } else {
              reject(error);
            }
          },
        );

        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });
    };

    async function upload(req) {
      const fileType = req.file.mimetype;
      const resourceType = fileType.startsWith("image/") ? "image" : "raw";

      let result = await streamUpload(req, resourceType);
      req.body[req.file.fieldname] = `${result.secure_url}`;
      next();
    }

    upload(req);
  } else {
    next();
  }
};

module.exports.uploads = async (req, res, next) => {
  if (req.files) {
    const streamUpload = (file) => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream((error, result) => {
          if (result) {
            resolve(result);
          } else {
            reject(error);
          }
        });
        streamifier.createReadStream(file.buffer).pipe(stream);
      });
    };

    try {
      const fileFields = Object.keys(req.files);

      // Iterate through all file fields
      for (const field of fileFields) {
        const files = req.files[field];

        // Process the first file within a field
        if (files && files.length > 0) {
          const result = await streamUpload(files[0]); // Only process the first file
          req.body[field] = result.secure_url; // Set the field to a single string value
        }
      }

      next();
    } catch (error) {
      console.error("Error uploading files:", error);
      return res.status(500).json({ error: "Failed to upload files" });
    }
  } else {
    next();
  }
};

const uploadToCloudinary = (file, options = {}) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "forum",
        resource_type: "auto", // tự động nhận diện image | raw | video
        ...options,
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      },
    );

    streamifier.createReadStream(file.buffer).pipe(stream);
  });
};

module.exports.uploadMultipleFields = async (req, res, next) => {
  try {
    // ===== IMAGES =====
    req.body.Images = [];

    if (req.files?.Images?.length > 0) {
      const imagePromises = req.files.Images.map((file) =>
        uploadToCloudinary(file, { resource_type: "image" }),
      );

      const uploadedImages = await Promise.all(imagePromises);
      req.body.Images = uploadedImages.map((r) => r.secure_url);
    }

    // ===== FILES =====
    req.body.Files = [];

    if (req.files?.Files?.length > 0) {
      const filePromises = req.files.Files.map(async (file) => {
        const result = await uploadToCloudinary(file, { resource_type: "raw" });
        return {
          url: result.secure_url,
          name: file.originalname,
          size: file.size,
          mimeType: file.mimetype,
        };
      });

      req.body.Files = await Promise.all(filePromises);
    }

    next();
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi upload file lên Cloudinary",
      error: error.message,
    });
  }
};
