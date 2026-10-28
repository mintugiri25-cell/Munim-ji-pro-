export type ImageAspectRatio =
  | '1:1'
  | '2:3'
  | '3:2'
  | '3:4'
  | '4:3'
  | '9:16'
  | '16:9'
  | '21:9';

export type ImageResolution = '1K' | '2K' | '4K';

export type ImageModel = 'gemini-nano-banana-2.1' | 'gemini-3-pro-image-preview';

export interface GenerateImageOptions {
  prompt: string;
  aspectRatio: ImageAspectRatio;
  imageSize: ImageResolution;
  model: ImageModel;
}

export interface GenerateImageResult {
  imageUrl: string;
  isFallback?: boolean;
}

export async function generateAiProductImage(
  options: GenerateImageOptions
): Promise<GenerateImageResult> {
  const response = await fetch('/api/generate-image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status} failed to generate image`);
  }

  const data = await response.json();
  return {
    imageUrl: data.imageUrl,
    isFallback: data.isFallback,
  };
}
