import cloudinary from '../config/cloudinary.js';
import { DEFAULT_UPLOAD_FOLDER } from '../utils/constants.js';

function uploadBufferToCloudinary(buffer, folder) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        overwrite: false
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    uploadStream.end(buffer);
  });
}

async function rollbackUploads(uploadedResults) {
  await Promise.allSettled(
    uploadedResults.map((result) => cloudinary.uploader.destroy(result.public_id, { resource_type: 'image' }))
  );
}

export async function uploadImageBatch(files, folder = DEFAULT_UPLOAD_FOLDER) {
  const uploadedResults = [];

  try {
    for (const file of files) {
      const result = await uploadBufferToCloudinary(file.buffer, folder);
      uploadedResults.push(result);
    }

    return {
      success: true,
      images: uploadedResults.map((result) => ({
        publicId: result.public_id,
        url: result.secure_url,
        width: result.width,
        height: result.height,
        format: result.format,
        bytes: result.bytes
      }))
    };
  } catch (err) {
    await rollbackUploads(uploadedResults);
    return { success: false, error: 'Image upload failed. Please try again.' };
  }
}
