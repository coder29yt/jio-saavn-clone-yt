import React, { useEffect, useRef } from 'react';
import { useAppSelector } from '../hooks/redux';
import { FREQUENCIES } from '../constants/equalizer';

interface VisualizerProps {
    audioRefs: React.RefObject<HTMLAudioElement>[];
    isPlaying: boolean;
}

// Singleton Audio Graph
let sharedContext: AudioContext | null = null;
let sharedAnalyser: AnalyserNode | null = null;
let sharedFilters: BiquadFilterNode[] = [];
let isInitialized = false;

const Visualizer: React.FC<VisualizerProps> = ({ audioRefs, isPlaying }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number>();
    const smoothedValuesRef = useRef<number[]>([]);
    const peaksRef = useRef<number[]>([]);
    const particlesRef = useRef<any[]>([]);
    const accentColorRef = useRef<string>('#ef4444');
    const { equalizerSettings, visualizerStyle } = useAppSelector(state => state.musicPlayer);

    // Cache accent color to avoid getComputedStyle in the animation loop
    useEffect(() => {
        const updateAccentColor = () => {
            const color = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim();
            if (color) accentColorRef.current = color;
        };
        updateAccentColor();
        // The accent color changes based on album art, which happens when song changes
        // A simple observer or interval could work, but usually it's stable during a song
        const interval = setInterval(updateAccentColor, 1000);
        return () => clearInterval(interval);
    }, []);

    const setupAudioSource = (audioEl: HTMLAudioElement, context: AudioContext, firstFilter: BiquadFilterNode) => {
        const el = audioEl as any;
        if (el._visualizerSource) return;

        try {
            const source = context.createMediaElementSource(audioEl);
            const gainNode = context.createGain();

            source.connect(gainNode);
            gainNode.connect(firstFilter);

            el._visualizerSource = source;
            el._gainNode = gainNode;
            el._visualizerContext = context;
        } catch (e) {
            console.error("Error setting up audio source", e);
        }
    };

    const initAudio = () => {
        if (isInitialized) return;

        try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            sharedContext = new AudioContextClass();

            sharedAnalyser = sharedContext.createAnalyser();
            sharedAnalyser.fftSize = 512;
            sharedAnalyser.smoothingTimeConstant = 0.8;

            // Create shared filters (EQ)
            sharedFilters = FREQUENCIES.map((freq, i) => {
                const filter = sharedContext!.createBiquadFilter();
                filter.type = 'peaking';
                filter.frequency.value = freq;
                filter.Q.value = 1;
                filter.gain.value = equalizerSettings.enabled ? equalizerSettings.bands[i] : 0;
                return filter;
            });

            // Connect filters in series
            for (let i = 0; i < sharedFilters.length - 1; i++) {
                sharedFilters[i].connect(sharedFilters[i + 1]);
            }

            // Last filter connects to analyser
            sharedFilters[sharedFilters.length - 1].connect(sharedAnalyser);
            sharedAnalyser.connect(sharedContext.destination);

            isInitialized = true;
        } catch (err) {
            console.warn('Failed to initialize audio visualizer singleton:', err);
        }
    };

    useEffect(() => {
        if (isPlaying) {
            initAudio();
            if (sharedContext?.state === 'suspended') {
                sharedContext.resume();
            }
        }

        const handleFirstInteraction = () => {
            initAudio();
            if (sharedContext?.state === 'suspended') {
                sharedContext.resume();
            }
            document.removeEventListener('click', handleFirstInteraction);
        };

        document.addEventListener('click', handleFirstInteraction);

        // Re-check refs on update
        if (isInitialized && sharedContext && sharedFilters[0]) {
            audioRefs.forEach(ref => {
                if (ref.current) {
                    setupAudioSource(ref.current, sharedContext!, sharedFilters[0]);
                }
            });
        }

        return () => {
            document.removeEventListener('click', handleFirstInteraction);
        };
    }, [audioRefs, isPlaying]);

    useEffect(() => {
        if (isInitialized && sharedFilters.length > 0) {
            sharedFilters.forEach((filter, i) => {
                filter.gain.value = equalizerSettings.enabled ? equalizerSettings.bands[i] : 0;
            });
        }
    }, [equalizerSettings]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !sharedAnalyser) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const bufferLength = sharedAnalyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const draw = () => {
            requestRef.current = requestAnimationFrame(draw);
            sharedAnalyser!.getByteFrequencyData(dataArray);

            const dpr = window.devicePixelRatio || 1;
            if (canvas.width !== canvas.clientWidth * dpr || canvas.height !== canvas.clientHeight * dpr) {
                canvas.width = canvas.clientWidth * dpr;
                canvas.height = canvas.clientHeight * dpr;
                ctx.scale(dpr, dpr);
            }

            const width = canvas.clientWidth;
            const height = canvas.clientHeight;

            // Clean background for the visualizer
            ctx.clearRect(0, 0, width, height);

            const accentColor = accentColorRef.current;

            // Performance optimization: only apply shadow if absolutely needed and not too large
            const shadowIntensity = 15;

            if (visualizerStyle === 'bars') {
                const numBars = 64;
                const barWidth = width / numBars;

                if (smoothedValuesRef.current.length !== numBars) {
                    smoothedValuesRef.current = new Array(numBars).fill(0);
                    peaksRef.current = new Array(numBars).fill(0);
                }

                for (let i = 0; i < numBars; i++) {
                    // Improved Logarithmic frequency mapping
                    // Maps i [0, numBars] to frequency range [~20Hz, ~16kHz]
                    const minFreq = 20;
                    const maxFreq = 16000;
                    const freq = minFreq * Math.pow(maxFreq / minFreq, i / numBars);
                    const binIndex = Math.floor(freq * sharedAnalyser!.fftSize / sharedContext!.sampleRate);
                    const nextFreq = minFreq * Math.pow(maxFreq / minFreq, (i + 1) / numBars);
                    const nextBinIndex = Math.floor(nextFreq * sharedAnalyser!.fftSize / sharedContext!.sampleRate);

                    const startBin = Math.min(binIndex, bufferLength - 1);
                    const endBin = Math.min(Math.max(startBin + 1, nextBinIndex), bufferLength);

                    let sum = 0;
                    for (let j = startBin; j < endBin; j++) {
                        sum += dataArray[j];
                    }
                    const average = sum / (endBin - startBin);

                    // Boost higher frequencies slightly for better visibility
                    const boost = 1 + (i / numBars) * 1.5;
                    const targetHeight = (average / 255) * height * 0.8 * boost;

                    // Smooth physics (interpolation)
                    smoothedValuesRef.current[i] += (targetHeight - smoothedValuesRef.current[i]) * 0.2;
                    const barHeight = Math.max(2, smoothedValuesRef.current[i]);

                    // Glow Effect
                    ctx.shadowBlur = shadowIntensity;
                    ctx.shadowColor = accentColor;

                    const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
                    gradient.addColorStop(0, `${accentColor}11`);
                    gradient.addColorStop(0.4, `${accentColor}66`);
                    gradient.addColorStop(1, accentColor);

                    ctx.fillStyle = gradient;
                    ctx.beginPath();
                    // Symmetric bars from center look more "premium"
                    const centerY = height / 2;
                    const centeredBarHeight = Math.max(4, barHeight);
                    if (ctx.roundRect) {
                        ctx.roundRect(i * barWidth + 1, centerY - centeredBarHeight / 2, barWidth - 3, centeredBarHeight, [barWidth / 2]);
                    } else {
                        ctx.rect(i * barWidth + 1, centerY - centeredBarHeight / 2, barWidth - 3, centeredBarHeight);
                    }
                    ctx.fill();

                    // Falling Peaks (adjusted for centered view)
                    if (barHeight > peaksRef.current[i]) {
                        peaksRef.current[i] = barHeight;
                    } else {
                        peaksRef.current[i] -= 0.8; // Gravity
                    }

                    if (peaksRef.current[i] > 2) {
                        ctx.fillStyle = `${accentColor}CC`;
                        const peakYTop = centerY - peaksRef.current[i] / 2 - 4;
                        const peakYBottom = centerY + peaksRef.current[i] / 2 + 2;
                        ctx.fillRect(i * barWidth + 1, peakYTop, barWidth - 3, 2);
                        ctx.fillRect(i * barWidth + 1, peakYBottom, barWidth - 3, 2);
                    }
                }
                ctx.shadowBlur = 0; // Reset shadow
            } else if (visualizerStyle === 'waveform') {
                sharedAnalyser!.getByteTimeDomainData(dataArray);
                ctx.lineWidth = 4;
                ctx.strokeStyle = accentColor;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                // Add glow to waveform
                ctx.shadowBlur = shadowIntensity;
                ctx.shadowColor = accentColor;

                ctx.beginPath();

                const sliceWidth = width / (bufferLength - 1);
                let x = 0;

                for (let i = 0; i < bufferLength; i++) {
                    const v = dataArray[i] / 128.0;
                    const y = (v * height) / 2;

                    if (i === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        // Use quadratic curves for smoother look
                        const nextX = x + sliceWidth;
                        const nextV = dataArray[i+1] / 128.0;
                        const nextY = (nextV * height) / 2;
                        const xc = (x + nextX) / 2;
                        const yc = (y + nextY) / 2;
                        ctx.quadraticCurveTo(x, y, xc, yc);
                    }

                    x += sliceWidth;
                }

                ctx.stroke();
                ctx.shadowBlur = 0;
            } else if (visualizerStyle === 'particles') {
                // Initialize particles if needed
                if (particlesRef.current.length === 0) {
                    for (let i = 0; i < 150; i++) {
                        particlesRef.current.push({
                            x: Math.random() * width,
                            y: Math.random() * height,
                            vx: (Math.random() - 0.5) * 1.5,
                            vy: (Math.random() - 0.5) * 1.5,
                            size: Math.random() * 2 + 1,
                            bin: Math.floor(Math.pow(Math.random(), 2) * bufferLength)
                        });
                    }
                }

                ctx.globalCompositeOperation = 'screen';
                particlesRef.current.forEach(p => {
                    const value = dataArray[p.bin];
                    const percent = value / 255;

                    p.y -= (percent * 4) + 0.3;
                    p.x += p.vx * (0.5 + percent * 2);

                    if (p.y < -20) {
                        p.y = height + 20;
                        p.x = Math.random() * width;
                    }
                    if (p.x < -20) p.x = width + 20;
                    if (p.x > width + 20) p.x = -20;

                    const size = p.size * (1 + percent * 5);

                    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size);
                    grad.addColorStop(0, accentColor);
                    grad.addColorStop(0.4, `${accentColor}66`);
                    grad.addColorStop(1, 'transparent');

                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
                    ctx.fill();
                });
                ctx.globalCompositeOperation = 'source-over';
            } else if (visualizerStyle === 'circular') {
                const centerX = width / 2;
                const centerY = height / 2;
                const radius = Math.min(width, height) * 0.25;

                ctx.shadowBlur = 20;
                ctx.shadowColor = accentColor;

                const numBars = 128;

                // Draw a central pulse circle
                let sum = 0;
                for(let i=0; i<32; i++) sum += dataArray[i];
                const avgLow = sum / 32;
                const pulse = (avgLow / 255) * 20;

                ctx.beginPath();
                ctx.arc(centerX, centerY, radius + pulse, 0, Math.PI * 2);
                ctx.strokeStyle = `${accentColor}44`;
                ctx.lineWidth = 2;
                ctx.stroke();

                for (let i = 0; i < numBars; i++) {
                    const angle = (i / numBars) * Math.PI * 2;

                    const minFreq = 20;
                    const maxFreq = 12000;
                    const freq = minFreq * Math.pow(maxFreq / minFreq, (i < numBars/2 ? i : numBars - i) / (numBars/2));
                    const binIndex = Math.floor(freq * sharedAnalyser!.fftSize / sharedContext!.sampleRate);
                    const value = dataArray[Math.min(binIndex, bufferLength - 1)];

                    const barHeight = (value / 255) * height * 0.3;

                    const x1 = centerX + Math.cos(angle) * (radius + pulse);
                    const y1 = centerY + Math.sin(angle) * (radius + pulse);
                    const x2 = centerX + Math.cos(angle) * (radius + pulse + barHeight);
                    const y2 = centerY + Math.sin(angle) * (radius + pulse + barHeight);

                    const grad = ctx.createLinearGradient(x1, y1, x2, y2);
                    grad.addColorStop(0, `${accentColor}44`);
                    grad.addColorStop(1, accentColor);

                    ctx.strokeStyle = grad;
                    ctx.lineWidth = 3;
                    ctx.lineCap = 'round';
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();
                }
                ctx.shadowBlur = 0;
            } else if (visualizerStyle === 'pixel') {
                const gridSize = 12; // Smaller grid for higher "quality"
                const cols = Math.floor(width / gridSize);
                const rows = Math.floor(height / gridSize);

                ctx.shadowBlur = 8; // Lower blur for pixel to keep it crisp
                ctx.shadowColor = accentColor;

                for (let i = 0; i < cols; i++) {
                    const minFreq = 20;
                    const maxFreq = 16000;
                    const freq = minFreq * Math.pow(maxFreq / minFreq, i / cols);
                    const binIndex = Math.floor(freq * sharedAnalyser!.fftSize / sharedContext!.sampleRate);
                    const value = dataArray[Math.min(binIndex, bufferLength - 1)];

                    const activeRows = Math.floor((value / 255) * rows);
                    const centerY = Math.floor(rows / 2);

                    for (let j = 0; j < activeRows; j++) {
                        const rowFromCenter = Math.floor(j / 2);
                        const rowIdx = j % 2 === 0 ? centerY - rowFromCenter : centerY + rowFromCenter;

                        if (rowIdx < 0 || rowIdx >= rows) continue;

                        const intensity = 1 - (j / activeRows);
                        ctx.fillStyle = `${accentColor}${Math.floor(Math.max(0.3, intensity) * 255).toString(16).padStart(2, '0')}`;
                        // Add a small inner glow/gradient to each pixel for "world class" look
                        ctx.fillRect(i * gridSize + 1, rowIdx * gridSize + 1, gridSize - 2, gridSize - 2);
                    }
                }
                ctx.shadowBlur = 0;
            }
        };

        if (isPlaying) {
            if (sharedContext?.state === 'suspended') {
                sharedContext.resume();
            }
            draw();
        } else {
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
            }
        }

        return () => {
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
            }
        };
    }, [isPlaying, visualizerStyle]);

    return (
        <div className="relative w-full h-full">
            <canvas
                ref={canvasRef}
                width={100}
                height={40}
                className="w-full h-full opacity-50 pointer-events-none"
                aria-hidden="true"
                role="presentation"
            />
        </div>
    );
};

export default Visualizer;
