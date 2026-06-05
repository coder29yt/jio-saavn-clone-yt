import React, { useRef } from 'react';
import { MdOutlineArrowBackIos, MdOutlineArrowForwardIos } from 'react-icons/md';
import AlbumItem from './AlbumItem';

interface SliderProps {
    data: any[];
    title: string;
}

const Slider: React.FC<SliderProps> = ({ data, title }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const { scrollLeft, clientWidth } = scrollRef.current;
            const scrollTo =
                direction === 'left'
                    ? scrollLeft - clientWidth
                    : scrollLeft + clientWidth;
            scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
        }
    };

    return (
        <div className="relative group mb-12">
            <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">{title}</h2>
            <div className="relative">
                <button
                    onClick={() => scroll('left')}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-white/80 dark:bg-black/50 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <MdOutlineArrowBackIos />
                </button>
                <div
                    ref={scrollRef}
                    className="flex overflow-x-auto gap-4 scrollbar-hide no-scrollbar"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {data && Array.isArray(data) && data.map((item: any) => (
                        <AlbumItem
                            key={item.id}
                            id={item.id}
                            image={Array.isArray(item.image) ? (item.image[2]?.url || item.image[0]?.url) : (item.image || '')}
                            name={item.name || item.title || 'Unknown'}
                            artists={item.primaryArtists || item.artist || item.subtitle || ''}
                            type={item.type}
                            data={item}
                        />
                    ))}
                </div>
                <button
                    onClick={() => scroll('right')}
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-white/80 dark:bg-black/50 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <MdOutlineArrowForwardIos />
                </button>
            </div>
        </div>
    );
};

export default Slider;
