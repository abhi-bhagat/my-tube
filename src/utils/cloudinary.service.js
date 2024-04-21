import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
cloudinary.config({
  cloud_name: "dmzuia8cb",
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadCloudinary = async (localFilePath) => {
  try {
    // check if file path exists or not
    if (!localFilePath) {
      console.log(`File path doesn't exist`);
      return null;
    }
    // if it does exist then upload the file to cloudinary.

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    // file uploaded successfully
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath);
    // this will remove the locally save temp file if the upload fails
  }
};

export { uploadCloudinary };
