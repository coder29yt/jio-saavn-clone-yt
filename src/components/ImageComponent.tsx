import React from 'react';

interface ImageComponentProps {
    src: string;
    alt: string;
}

const ImageComponent: React.FC<ImageComponentProps> = ({ src, alt }) => {
    return (
        <div className="w-48 h-48 sm:w-64 sm:h-64 lg:w-80 lg:h-80 bg-gray-200 dark:bg-gray-800 rounded-lg shadow-2xl overflow-hidden flex items-center justify-center">
            {src ? (
                <img
                    src={src}
                    alt={alt}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/500?text=No+Image';
                    }}
                />
            ) : (
                <div className="text-gray-400">No Image</div>
            )}
        </div>
    );
};

export default ImageComponent;
