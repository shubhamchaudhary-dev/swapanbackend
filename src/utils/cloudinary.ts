import 'dotenv/config';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export { cloudinary };

const pdfStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'swarnpublication/papers',
    resource_type: 'raw',
    allowed_formats: ['pdf'],
  } as Record<string, unknown>,
});

const imageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'swarnpublication/avatars',
    resource_type: 'image',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 400, height: 400, crop: 'fill' }],
  } as Record<string, unknown>,
});

export const uploadPDF = multer({
  storage: pdfStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

export const uploadImage = multer({
  storage: imageStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Upload a base64-encoded file directly to Cloudinary (used for admin PDF uploads)
export const uploadBase64 = async (
  base64: string,
  folder: string,
  resourceType: 'raw' | 'image' | 'auto' = 'raw'
): Promise<string> => {
  const result = await cloudinary.uploader.upload(base64, {
    folder,
    resource_type: resourceType,
  });
  return result.secure_url;
};
