import 'dotenv/config';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
export { cloudinary };
export declare const uploadPDF: multer.Multer;
export declare const uploadImage: multer.Multer;
export declare const uploadBase64: (base64: string, folder: string, resourceType?: "raw" | "image" | "auto") => Promise<string>;
//# sourceMappingURL=cloudinary.d.ts.map