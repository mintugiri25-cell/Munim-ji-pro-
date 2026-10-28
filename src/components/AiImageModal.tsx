import React, { useState } from 'react';
import {
  GenerateImageOptions,
  ImageAspectRatio,
  ImageModel,
  ImageResolution,
  generateAiProductImage,
} from '../services/imageGeneration';
import { Sparkles, X, Loader2, Image as ImageIcon, AlertCircle } from 'lucide-react';

interface Props {
  initialPrompt: string;
  onClose: () => void;
  onApplyImage: (imageUrl: string) => void;
}

export const AiImageModal: React.FC<Props> = ({
  initialPrompt,
  onClose,
  onApplyImage,
}) => {
  const [prompt, setPrompt] = useState(
    initialPrompt || 'Studio product photography of retail item with clean white background'
  );
  const [aspectRatio, setAspectRatio] = useState<ImageAspectRatio>('1:1');
  const [imageSize, setImageSize] = useState<ImageResolution>('1K');
  const [model, setModel] = useState<ImageModel>('gemini-nano-banana-2.1');
  const [loading, setLoading] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setError('');
    try {
      const res = await generateAiProductImage({
        prompt,
        aspectRatio,
        imageSize,
        model,
      });
      setGeneratedUrl(res.imageUrl);
      setIsFallback(!!res.isFallback);
    } catch (err: any) {
      setError(err.message || 'Failed to generate image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (generatedUrl) {
      onApplyImage(generatedUrl);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white text-slate-900 rounded-2xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse" />
            <h3 className="text-lg font-bold text-slate-900">
              AI Product Catalog Image Generator
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center space-x-2 text-rose-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleGenerate} className="space-y-4 mt-4">
          {/* Prompt */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Image Description / Prompt *
            </label>
            <textarea
              rows={3}
              required
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Premium packaging box of Basmati Rice 25kg, crisp retail studio photo"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
            />
          </div>

          {/* Model Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Gemini Vision Model
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value as ImageModel)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium cursor-pointer"
            >
              <option value="gemini-nano-banana-2.1">
                gemini-nano-banana-2.1 (Fast & General)
              </option>
              <option value="gemini-3-pro-image-preview">
                gemini-3-pro-image-preview (Studio Quality High-Res)
              </option>
            </select>
          </div>

          {/* Aspect Ratio & Resolution Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Aspect Ratio */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Aspect Ratio
              </label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value as ImageAspectRatio)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium cursor-pointer"
              >
                <option value="1:1">1:1 (Square Product Photo)</option>
                <option value="4:3">4:3 (Standard Photo)</option>
                <option value="3:4">3:4 (Portrait)</option>
                <option value="16:9">16:9 (Landscape Banner)</option>
                <option value="9:16">9:16 (Vertical Story)</option>
                <option value="3:2">3:2 (Classic 35mm)</option>
                <option value="2:3">2:3 (Tall Portrait)</option>
                <option value="21:9">21:9 (Cinematic Ultra-wide)</option>
              </select>
            </div>

            {/* Resolution Affordance (1K, 2K, 4K) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Resolution Size
              </label>
              <select
                value={imageSize}
                onChange={(e) => setImageSize(e.target.value as ImageResolution)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium cursor-pointer"
              >
                <option value="1K">1K (Standard Web Quality)</option>
                <option value="2K">2K (High-Definition 1440p)</option>
                <option value="4K">4K (Ultra HD Studio Print)</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition flex items-center justify-center space-x-2 cursor-pointer shadow-sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating Image with Gemini...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate Image ({aspectRatio} • {imageSize})</span>
              </>
            )}
          </button>
        </form>

        {/* Preview Container */}
        {generatedUrl && (
          <div className="mt-5 pt-4 border-t border-slate-200 space-y-3">
            <span className="text-xs font-bold text-slate-800 block">
              Generated Preview {isFallback ? '(Offline Fallback Vector)' : ''}:
            </span>
            <div className="flex justify-center bg-slate-900 p-2 rounded-xl">
              <img
                src={generatedUrl}
                alt="Generated"
                className="max-h-56 rounded-lg object-contain shadow-md"
              />
            </div>

            <button
              type="button"
              onClick={handleApply}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition cursor-pointer"
            >
              Use This Image for Product
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
