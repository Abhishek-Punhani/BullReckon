import axios from "axios";

const cloud_name = process.env.NEXT_PUBLIC_CLOUD_NAME as string;
const cloud_secret = process.env.NEXT_PUBLIC_CLOUD_SECRET as string;

interface FileUploadInput {
  file: File | Blob;
  type: string;
  message?: string;
}

interface UploadedFile {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  file: any;
  type: string;
  message?: string;
}

export const uploadFiles = async (
  files: FileUploadInput[]
): Promise<UploadedFile[]> => {
  const uploaded: UploadedFile[] = [];
  for (const f of files) {
    const { file, type, message } = f;
    const formData = new FormData();
    formData.append("upload_preset", cloud_secret);
    formData.append("file", file);

    const res = await uploadToCloudinary(formData);
    uploaded.push({
      file: res,
      type,
      message,
    });
  }

  return uploaded;
};

export const uploadToCloudinary = async (
  formData: FormData
): Promise<unknown> => {
  try {
    const { data } = await axios.post(
      `https://api.cloudinary.com/v1_1/${cloud_name}/raw/upload`,
      formData
    );
    return data;
  } catch (err) {
    console.error(err);
    throw err;
  }
};
