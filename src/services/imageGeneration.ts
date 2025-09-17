import { GoogleGenerativeAI } from '@google/generative-ai';
import { secureUsageService } from './secureUsageService';

// Convert file to base64 for Gemini API
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = reader.result as string;
      // Remove data:image/jpeg;base64, prefix
      resolve(base64.split(',')[1]);
    };
    reader.onerror = reject;
  });
};

// Load can reference image as base64
const loadCanReference = async (canSize: '12oz' | '16oz' = '16oz'): Promise<string> => {
  try {
    // Import the image from assets based on can size
    const imageName = canSize === '12oz' ? '12oz.jpg' : 'can-reference.jpg';
    console.log('Loading can reference:', { canSize, imageName });
    const canImageUrl = new URL(`../assets/${imageName}`, import.meta.url).href;
    console.log('Can image URL:', canImageUrl);
    const response = await fetch(canImageUrl);
    if (!response.ok) {
      throw new Error(`Failed to load ${imageName}: ${response.status}`);
    }
    const blob = await response.blob();
    const file = new File([blob], imageName, { type: blob.type });
    const base64 = await fileToBase64(file);
    console.log('Can reference loaded successfully');
    return base64;
  } catch (error) {
    console.error('Error loading can reference:', error);
    throw error;
  }
};


interface GenerateCanRenderOptions {
  canSize?: '12oz' | '16oz';
  avoidTextGeneration?: boolean;
}

export const generateCanRender = async (userImage: File, options: GenerateCanRenderOptions = {}): Promise<string> => {
  const { canSize = '16oz', avoidTextGeneration = false } = options;

  // SECURITY: Check rate limits before any processing
  const usageStats = await secureUsageService.checkUsageLimit();
  
  if (!usageStats.canGenerate) {
    const limitType = usageStats.isAuthenticated ? 'authenticated' : 'anonymous';
    const maxGenerations = usageStats.maxGenerations;
    throw new Error(
      `Generation limit exceeded. ${limitType === 'authenticated' ? 'Authenticated users' : 'Anonymous users'} can generate ${maxGenerations} images per day. ` +
      `You've used ${usageStats.generationsUsed}/${maxGenerations}. ${usageStats.isAuthenticated ? '' : 'Sign in to get 10 generations per day!'}`
    );
  }

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!apiKey) {
    // Record failed generation
    await secureUsageService.recordGeneration(false, 'API key not configured');
    throw new Error('Gemini API key not found. Please add VITE_GEMINI_API_KEY to your environment variables.');
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash-image-preview",
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8192,
      }
    });

    // Convert images to base64
    const [userImageBase64, canImageBase64] = await Promise.all([
      fileToBase64(userImage),
      loadCanReference(canSize)
    ]);

    const canSizeDescription = canSize === '12oz' 
      ? 'standard 12oz aluminum beverage can (shorter and wider proportions, approximately 4.83 inches tall)'
      : 'tall 16oz aluminum beverage can (taller and slimmer proportions, approximately 6.19 inches tall)';

    let prompt = `Generate 3 product photography views of the same ${canSize} can in one image: Take the ${canSizeDescription} from the first image and apply the design/label from the second image onto it. Create a professional product photograph showing THREE different angles side by side:

LEFT VIEW: ${canSize} can rotated 45 degrees left showing the left side of the label
CENTER VIEW: ${canSize} can facing straight forward showing the main label design  
RIGHT VIEW: ${canSize} can rotated 45 degrees right showing the right side of the label

IMPORTANT: Use the exact ${canSize} can proportions and dimensions from the reference image.

CRITICAL DIMENSIONS: Generate the output image at exactly 1200x600 pixels (landscape orientation, 2:1 aspect ratio).

Requirements for all three views:
- The design from the second image wrapped seamlessly around each ${canSize} can
- Maintain the correct ${canSize} can proportions (${canSize === '12oz' ? 'shorter and wider' : 'taller and slimmer'})
- Photorealistic product photography quality
- Professional studio lighting with soft shadows
- Clean white or subtle gradient background
- Realistic reflections and highlights on the can surface
- Commercial product photography style
- High resolution and sharp details
- The label should conform to the can's cylindrical shape naturally
- All three cans should be identical ${canSize} size and evenly spaced
- Show how the label design wraps around the cylindrical surface
- Output dimensions must be exactly 1200 pixels wide by 600 pixels tall`;

if (avoidTextGeneration) {
  prompt += `
- CRITICAL: Do not add any text, logos, or other graphic elements that are not present in the original uploaded design. The output should only contain the design from the uploaded image. Faithfully reproduce the uploaded design without adding any new textual or graphical elements.`;
}

prompt += `

Output: A single wide image (1200x600px) showing three identical ${canSize} cans at different rotation angles to display the full label design.`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: canImageBase64
        }
      },
      {
        inlineData: {
          mimeType: userImage.type,
          data: userImageBase64
        }
      }
    ]);

    const response = result.response;

    // SECURITY: Record successful generation BEFORE returning result
    const recordResult = await secureUsageService.recordGeneration(true);
    if (!recordResult.success) {
      throw new Error('Failed to record generation. Please try again.');
    }

    // Check if the response contains generated image data
    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.mimeType?.startsWith('image/')) {
          // Convert base64 to blob URL
          const imageData = part.inlineData.data;
          const byteCharacters = atob(imageData);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: part.inlineData.mimeType });
          return URL.createObjectURL(blob);
        }
      }
    }

    // Fallback to canvas-based approach if no image is returned
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;

      // Wider canvas for 3 cans
      canvas.width = 1200;
      canvas.height = 600;

      // Create gradient background
      const gradient = ctx.createLinearGradient(0, 0, 1200, 600);
      gradient.addColorStop(0, '#f8fafc');
      gradient.addColorStop(1, '#e2e8f0');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 1200, 600);

      const userImg = new Image();
      userImg.onload = () => {
        // Draw 3 cans
        const canWidth = 200;
        const canHeight = 400;
        const canY = (canvas.height - canHeight) / 2;
        const spacing = 400;
        
        for (let i = 0; i < 3; i++) {
          const canX = 100 + (i * spacing);
          
          // Can body gradient
          const canGradient = ctx.createLinearGradient(canX, 0, canX + canWidth, 0);
          canGradient.addColorStop(0, '#d1d5db');
          canGradient.addColorStop(0.5, '#f3f4f6');
          canGradient.addColorStop(1, '#d1d5db');
          ctx.fillStyle = canGradient;
          ctx.fillRect(canX, canY, canWidth, canHeight);

          // Apply user design to can with slight rotation effect
          const labelWidth = canWidth * 0.8;
          const labelHeight = canHeight * 0.6;
          const labelX = canX + (canWidth - labelWidth) / 2;
          const labelY = canY + (canHeight - labelHeight) / 2;

          ctx.save();
          ctx.translate(labelX + labelWidth/2, labelY + labelHeight/2);
          // Slight rotation for left and right views
          if (i === 0) ctx.rotate(-0.1); // Left view
          if (i === 2) ctx.rotate(0.1);  // Right view
          ctx.translate(-labelWidth/2, -labelHeight/2);
          
          ctx.drawImage(userImg, 0, 0, labelWidth, labelHeight);
          ctx.restore();

          // Add highlight effect
          ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
          ctx.fillRect(canX, canY, canWidth * 0.3, canHeight);
        }

        // Add labels
        ctx.fillStyle = '#6b7280';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Left View', 200, canvas.height - 20);
        ctx.fillText('Front View', 600, canvas.height - 20);
        ctx.fillText('Right View', 1000, canvas.height - 20);

        canvas.toBlob(async (blob) => {
          if (blob) {
            // SECURITY: Record successful fallback generation
            await secureUsageService.recordGeneration(true);
            const url = URL.createObjectURL(blob);
            resolve(url);
          }
        }, 'image/jpeg', 0.9);
      };

      userImg.src = URL.createObjectURL(userImage);
    });

  } catch (error) {
    console.error('Failed to generate can render:', error);
    
    // SECURITY: Record failed generation
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await secureUsageService.recordGeneration(false, errorMessage);
    
    // More detailed error logging
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    throw new Error(`Failed to generate can render: ${errorMessage}`);
  }
};

