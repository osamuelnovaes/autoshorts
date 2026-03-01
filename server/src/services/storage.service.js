import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const R2_ENDPOINT = process.env.R2_ENDPOINT;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET || 'autoshorts';
const R2_REGION = process.env.R2_REGION || 'auto';

const s3Config = {
  region: R2_REGION,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID || '',
    secretAccessKey: R2_SECRET_ACCESS_KEY || ''
  }
};

if (R2_ENDPOINT) {
  s3Config.endpoint = R2_ENDPOINT;
  s3Config.forcePathStyle = true;
}

const s3Client = new S3Client(s3Config);

export const uploadToStorage = async (fileBuffer, fileName, contentType) => {
  if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    console.warn('⚠️ Storage credentials not configured. Using local storage fallback.');
    return {
      success: false,
      url: null,
      key: fileName,
      local: true
    };
  }

  try {
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: fileName,
      Body: fileBuffer,
      ContentType: contentType
    });

    await s3Client.send(command);

    const url = R2_ENDPOINT 
      ? `${R2_ENDPOINT}/${R2_BUCKET}/${fileName}`
      : `https://${R2_BUCKET}.s3.${R2_REGION}.amazonaws.com/${fileName}`;

    return {
      success: true,
      url,
      key: fileName,
      local: false
    };
  } catch (error) {
    console.error('S3 Upload Error:', error);
    throw new Error(`Failed to upload to storage: ${error.message}`);
  }
};

export const getSignedDownloadUrl = async (key, expiresIn = 3600) => {
  if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    return null;
  }

  try {
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET,
      Key: key
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
    return signedUrl;
  } catch (error) {
    console.error('Signed URL Error:', error);
    return null;
  }
};

export const deleteFromStorage = async (key) => {
  if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    return { success: true, local: true };
  }

  try {
    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET,
      Key: key
    });

    await s3Client.send(command);
    return { success: true };
  } catch (error) {
    console.error('Delete Error:', error);
    throw new Error(`Failed to delete from storage: ${error.message}`);
  }
};

export const getPublicUrl = (key) => {
  if (R2_ENDPOINT) {
    return `${R2_ENDPOINT}/${R2_BUCKET}/${key}`;
  }
  return `https://${R2_BUCKET}.s3.${R2_REGION}.amazonaws.com/${key}`;
};
