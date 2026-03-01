export const uploadToStorage = async (filePath, fileName, contentType) => {
  return {
    success: true,
    url: `https://storage.example.com/${fileName}`,
    key: fileName
  };
};

export const getSignedUrl = async (key, expiresIn = 3600) => {
  return `https://storage.example.com/${key}?expires=${expiresIn}`;
};

export const deleteFromStorage = async (key) => {
  return { success: true };
};
