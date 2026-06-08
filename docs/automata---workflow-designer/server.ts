import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, Schema } from '@google/genai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post('/api/generate-workflow', async (req, res) => {
    try {
      const { prompt } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Transfer-Encoding', 'chunked');

      const responseSchema: Schema = {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "Name of the workflow" },
          description: { type: Type.STRING, description: "Description of the workflow" },
          nodes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, enum: ["trigger", "action", "condition"] },
                data: {
                  type: Type.OBJECT,
                  properties: {
                    label: { type: Type.STRING },
                    description: { type: Type.STRING },
                    icon: { type: Type.STRING, description: "A Lucide icon name, e.g. Mail, Zap, CheckCircle, Clock" },
                    colorClass: { type: Type.STRING, description: "Color class, e.g. 'bg-indigo-50 text-indigo-600'" },
                    subType: { type: Type.STRING, description: "For triggers: webhook/schedule/event. For actions: email/http/slack. For condition: equals/contains/greaterThan" },
                    config: {
                      type: Type.OBJECT,
                      description: "Key-value pair configuration for this node"
                    }
                  }
                }
              }
            }
          },
          edges: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                sourceIndex: { type: Type.INTEGER },
                targetIndex: { type: Type.INTEGER },
                sourceHandle: { type: Type.STRING, nullable: true }
              }
            }
          }
        },
        required: ["nodes", "edges", "name", "description"]
      };

      const aiResponse = await genAI.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [{ text: `Generate a workflow for the following description: "${prompt}".
Use node types: trigger, action, condition.
Triggers should not have incoming edges.
Conditions should have true/false source handles.
Actions are standard.
Output strictly JSON matching the schema.` }]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: responseSchema,
        }
      });

      for await (const chunk of aiResponse) {
        if (chunk.text) {
          res.write(chunk.text);
        }
      }
      res.end();
    } catch (error) {
      console.error('Error generating workflow:', error);
      res.status(500).write(JSON.stringify({ error: 'Generation failed' }));
      res.end();
    }
  });

  // Vite development middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
