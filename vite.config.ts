import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, Plugin} from 'vite';
import {GoogleGenAI} from '@google/genai';

function geminiApiPlugin(): Plugin {
  return {
    name: 'gemini-api-server',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url?.startsWith('/api/generate-image') && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => {
            body += chunk;
          });
          req.on('end', async () => {
            try {
              const {
                prompt,
                model = 'gemini-nano-banana-2.1',
                aspectRatio = '1:1',
                imageSize = '1K',
              } = JSON.parse(body || '{}');

              const apiKey = process.env.GEMINI_API_KEY;
              if (apiKey) {
                const ai = new GoogleGenAI({
                  apiKey,
                  httpOptions: {
                    headers: {
                      'User-Agent': 'aistudio-build',
                    },
                  },
                });

                const response = await ai.models.generateContent({
                  model: model === 'gemini-3-pro-image-preview' ? 'gemini-3-pro-image' : model,
                  contents: {
                    parts: [{ text: prompt }],
                  },
                  config: {
                    imageConfig: {
                      aspectRatio,
                      imageSize,
                    },
                  },
                });

                let foundImage = '';
                const parts = response.candidates?.[0]?.content?.parts || [];
                for (const part of parts) {
                  if (part.inlineData) {
                    foundImage = `data:image/png;base64,${part.inlineData.data}`;
                    break;
                  }
                }

                if (foundImage) {
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ imageUrl: foundImage, success: true }));
                  return;
                }
              }

              // Clean fallback SVG image if no API key or offline
              const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">
                <defs>
                  <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="#1e293b"/>
                    <stop offset="100%" stop-color="#0f172a"/>
                  </linearGradient>
                </defs>
                <rect width="600" height="600" fill="url(#g)"/>
                <circle cx="300" cy="240" r="90" fill="#3b82f6" opacity="0.2"/>
                <path d="M260 270 L300 210 L340 270 Z" fill="#60a5fa"/>
                <circle cx="340" cy="200" r="20" fill="#fbbf24"/>
                <text x="300" y="380" font-family="system-ui, sans-serif" font-size="22" font-weight="bold" fill="#f8fafc" text-anchor="middle">Product Catalog Image</text>
                <text x="300" y="415" font-family="system-ui, sans-serif" font-size="14" fill="#94a3b8" text-anchor="middle">${encodeURIComponent(prompt.slice(0, 45))}</text>
                <rect x="220" y="445" width="160" height="28" rx="14" fill="#334155"/>
                <text x="300" y="464" font-family="system-ui, sans-serif" font-size="12" fill="#38bdf8" text-anchor="middle">${aspectRatio} • ${imageSize}</text>
              </svg>`;
              const fallbackUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ imageUrl: fallbackUrl, success: true, isFallback: true }));
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: err.message || 'Image generation failed' }));
            }
          });
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), geminiApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
