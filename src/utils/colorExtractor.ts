// @ts-ignore
import { getColor } from 'colorthief';

export const getDominantColor = (imageUrl: string): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = imageUrl;

        img.onload = async () => {
            try {
                const color = await getColor(img);
                if (!color) {
                    resolve('#ef4444');
                    return;
                }

                // Color is expected to be [r, g, b]
                // We cast to any to avoid type issues with different versions of types
                const rgb = color as any;
                const r = rgb[0] ?? 239;
                const g = rgb[1] ?? 68;
                const b = rgb[2] ?? 68;

                const toHex = (n: number) => n.toString(16).padStart(2, '0');
                const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;

                resolve(hex);
            } catch (error) {
                console.error('Error extracting color:', error);
                resolve('#ef4444'); // Fallback
            }
        };

        img.onerror = () => {
            resolve('#ef4444'); // Fallback
        };
    });
};
