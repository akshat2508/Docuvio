import api from "./api";


// ==========================================
// FILE UPLOAD
// ==========================================

export const startFileUpload = async (
  sessionToken
) => {
  const res = await api.post(
    `/print-sessions/session/${sessionToken}/files/start`
  );

  return res.data;
};


export const uploadSessionFile = async (
  sessionToken,
  file
) => {
  const formData = new FormData();

  formData.append("file", file);

  const res = await api.post(
    `/print-sessions/session/${sessionToken}/files`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return res.data;
};


export const getSessionFiles = async (
  sessionToken
) => {
  const res = await api.get(
    `/print-sessions/session/${sessionToken}/files`
  );

  return res.data;
};


export const getSessionFileUrl = async (
  fileId
) => {
  const res = await api.get(
    `/print-sessions/files/${fileId}/url`
  );

  return res.data.data.url;
};