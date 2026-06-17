export type UploadFile = {
  uri: string;
  name: string;
  type: string;
};

export function appendUploadFile(formData: FormData, fieldName: string, file: UploadFile) {
  formData.append(fieldName, {
    uri: file.uri,
    name: file.name,
    type: file.type,
  } as unknown as Blob);
}

export function imageAssetToUploadFile(
  asset: { uri: string; fileName?: string | null; mimeType?: string | null },
  fallbackName: string,
): UploadFile {
  return {
    uri: asset.uri,
    name: asset.fileName || fallbackName,
    type: asset.mimeType || 'image/jpeg',
  };
}
