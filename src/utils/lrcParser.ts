export interface LyricLine {
    time: number;
    text: string;
}

export const parseLRC = (lrc: string): LyricLine[] => {
    const lines = lrc.split('\n');
    const lyrics: LyricLine[] = [];
    const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;

    lines.forEach(line => {
        const match = timeRegex.exec(line);
        if (match) {
            const minutes = parseInt(match[1]);
            const seconds = parseInt(match[2]);
            const milliseconds = parseInt(match[3]);

            // Handle both .xx and .xxx milliseconds
            const time = minutes * 60 + seconds + (match[3].length === 2 ? milliseconds / 100 : milliseconds / 1000);
            const text = line.replace(timeRegex, '').trim();

            if (text) {
                lyrics.push({ time, text });
            }
        }
    });

    return lyrics.sort((a, b) => a.time - b.time);
};
